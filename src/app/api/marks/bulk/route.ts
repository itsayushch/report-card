import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deleteTermSubjectMarks, upsertTermMarks } from '@/lib/academic-records'
import { prisma } from '@/lib/prisma'
import { getTermsForClass } from '@/lib/terms'

interface MarkInput {
  studentId: string
  subjectId: string
  marks: number | string
  grade: string
  isAbsent?: boolean
  term: string
  academicYear: string
  teacherRemarks?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { marks }: { marks: MarkInput[] } = body

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid marks data' },
        { status: 400 }
      )
    }

    // Validate that all marks have the same term and academic year
    const firstMark = marks[0]
    const term = firstMark.term
    const academicYear = firstMark.academicYear

    if (!term || !academicYear) {
      return NextResponse.json(
        { error: 'Term and academic year are required' },
        { status: 400 }
      )
    }

    // Group marks by student
    const marksByStudent = new Map<string, MarkInput[]>()
    
    for (const mark of marks) {
      if (mark.term !== term || mark.academicYear !== academicYear) {
        return NextResponse.json(
          { error: 'All marks must be for the same term and academic year' },
          { status: 400 }
        )
      }

      if (!marksByStudent.has(mark.studentId)) {
        marksByStudent.set(mark.studentId, [])
      }
      marksByStudent.get(mark.studentId)!.push(mark)
    }

    // Get student information (to get their class)
    const studentIds = Array.from(marksByStudent.keys())
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, class: true, academicYear: true },
    })

    const studentMap = new Map(students.map(s => [s.id, s]))

    // Process each student's marks
    const updates = []
    
    for (const [studentId, studentMarks] of marksByStudent.entries()) {
      const student = studentMap.get(studentId)
      
      if (!student) {
        console.error(`Student not found: ${studentId}`)
        continue
      }

      // Get the correct maxMarks for this term and class
      const termsForClass = getTermsForClass(student.class)
      const termConfig = termsForClass.find(t => t.name === term)
      const maxMarksForTerm = termConfig?.maxMarks || 100 // Fallback to 100 if not found

      // Transform marks to subject format
      const subjects = studentMarks.map(mark => {
        const isAbsent = Boolean(mark.isAbsent)

        return {
          subjectCode: mark.subjectId,
          marks: isAbsent ? 0 : (typeof mark.marks === 'string' ? 0 : mark.marks), // For alphabetical grading
          maxMarks: maxMarksForTerm, // Use correct maxMarks from term definition
          grade: isAbsent ? 'AB' : (mark.grade || undefined),
        }
      })

      // Upsert the term marks
      updates.push(
        upsertTermMarks(
          studentId,
          academicYear,
          student.class,
          term,
          subjects,
          session.user.id
        )
      )
    }

    // Execute all updates in parallel
    await Promise.all(updates)

    return NextResponse.json({
      message: `Successfully saved marks for ${marksByStudent.size} students`,
      count: marksByStudent.size,
    })

  } catch (error) {
    console.error('Bulk save marks error:', error)
    return NextResponse.json(
      { error: 'Failed to save marks' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { class: classValue, subjectId, term, academicYear } = body ?? {}

    if (!classValue || !subjectId || !term || !academicYear) {
      return NextResponse.json(
        { error: 'class, subjectId, term, and academicYear are required' },
        { status: 400 }
      )
    }

    const students = await prisma.student.findMany({
      where: {
        class: classValue,
        academicYear,
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No active students found for the selected class and academic year' },
        { status: 404 }
      )
    }

    const results = await Promise.all(
      students.map((student) =>
        deleteTermSubjectMarks(student.id, academicYear, term, subjectId)
      )
    )

    const deleted = results.filter(Boolean).length
    const failed = results.length - deleted

    return NextResponse.json({
      message: `Removed marks for ${deleted} students`,
      deleted,
      failed,
    })
  } catch (error) {
    console.error('Delete marks error:', error)
    return NextResponse.json(
      { error: 'Failed to delete marks' },
      { status: 500 }
    )
  }
}
