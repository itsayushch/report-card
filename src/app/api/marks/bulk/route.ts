import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { upsertTermMarks } from '@/lib/academic-records'
import { prisma } from '@/lib/prisma'

interface MarkInput {
  studentId: string
  subjectId: string
  marks: number | string
  grade: string
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

      // Transform marks to subject format
      const subjects = studentMarks.map(mark => ({
        subjectCode: mark.subjectId,
        marks: typeof mark.marks === 'string' ? 0 : mark.marks, // For alphabetical grading
        maxMarks: 100, // This should come from subject definition
        grade: mark.grade || undefined,
      }))

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
