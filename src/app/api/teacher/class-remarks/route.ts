import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch remarks for a class and term
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classParam = searchParams.get('class')
    const term = searchParams.get('term')
    const academicYear = searchParams.get('academicYear')

    if (!classParam || !term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify that the teacher is a class teacher for this class
    const classTeacherAssignment = await prisma.classTeacher.findFirst({
      where: {
        teacherId: session.user.id,
        class: classParam,
      },
    })

    if (!classTeacherAssignment) {
      return NextResponse.json(
        { error: 'You are not the class teacher for this class' },
        { status: 403 }
      )
    }

    // Prevent remarks entry for Final Term
    if (term === 'Final Term') {
      return NextResponse.json(
        { error: 'Remarks cannot be entered for Final Term' },
        { status: 400 }
      )
    }

    // Get academic records for the class
    const academicRecords = await prisma.academicRecord.findMany({
      where: {
        class: classParam,
        academicYear,
      },
    })

    // Extract remarks and marks for the specified term
    const studentsData = academicRecords
      .map((record) => {
        const termRecord = record.terms.find((t) => t.name === term)
        if (!termRecord) return null

        return {
          studentId: record.studentId,
          remarks: termRecord.teacherRemarks || null,
          subjects: termRecord.subjects.map(s => ({
            subjectCode: s.subjectCode,
            marks: s.marks,
            maxMarks: s.maxMarks,
            grade: s.grade,
          })),
        }
      })
      .filter(Boolean)

    return NextResponse.json(studentsData)
  } catch (error) {
    console.error('Get remarks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch remarks' },
      { status: 500 }
    )
  }
}

// POST - Save remarks for students
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { remarks } = body

    console.log('Received remarks:', remarks?.length || 0, 'entries')

    if (!remarks || !Array.isArray(remarks) || remarks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid remarks data' },
        { status: 400 }
      )
    }

    // Get term and academicYear from first entry (all should be the same)
    const { term, academicYear } = remarks[0]

    if (!term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Saving remarks for term:', term, 'year:', academicYear)

    // Prevent remarks entry for Final Term
    if (term === 'Final Term') {
      return NextResponse.json(
        { error: 'Remarks cannot be entered for Final Term' },
        { status: 400 }
      )
    }

    // Get the student's class from the first student
    const firstStudent = await prisma.student.findUnique({
      where: { id: remarks[0].studentId },
      select: { class: true },
    })

    if (!firstStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Verify that the teacher is a class teacher for this class
    const classTeacherAssignment = await prisma.classTeacher.findFirst({
      where: {
        teacherId: session.user.id,
        class: firstStudent.class,
      },
    })

    if (!classTeacherAssignment) {
      return NextResponse.json(
        { error: 'You are not the class teacher for this class' },
        { status: 403 }
      )
    }

    let successCount = 0
    let errorCount = 0

    // Update remarks for each student
    for (const remarkEntry of remarks) {
      try {
        const { studentId, remarks: remarkText } = remarkEntry

        // Skip if remarks are empty or unchanged
        if (!remarkText || remarkText.trim() === '') {
          continue
        }

        // Find or create academic record
        let academicRecord = await prisma.academicRecord.findUnique({
          where: {
            studentId_academicYear: {
              studentId,
              academicYear,
            },
          },
        })

        const student = await prisma.student.findUnique({
          where: { id: studentId },
          select: { class: true },
        })

        if (!student) {
          errorCount++
          continue
        }

        if (!academicRecord) {
          // Create new academic record if it doesn't exist
          academicRecord = await prisma.academicRecord.create({
            data: {
              studentId,
              academicYear,
              class: student.class,
              terms: [],
            },
          })
        }

        // Find the term record
        const termIndex = academicRecord.terms.findIndex((t) => t.name === term)

        if (termIndex === -1) {
          // Term doesn't exist yet, skip this entry
          // Remarks can only be added if marks exist
          errorCount++
          continue
        }

        // Update the term record with remarks - explicitly include all fields
        const updatedTerms = academicRecord.terms.map((t, i) => {
          if (i !== termIndex) return t
          return {
            name: t.name,
            subjects: t.subjects,
            enteredBy: t.enteredBy,
            enteredAt: t.enteredAt,
            published: t.published,
            teacherRemarks: remarkText,
          }
        })

        console.log(`[save-remarks] studentId=${studentId}, term=${term}, remarkText=${remarkText}`)

        // Update the academic record
        await prisma.academicRecord.update({
          where: { id: academicRecord.id },
          data: {
            terms: updatedTerms,
          },
        })

        successCount++
      } catch (error) {
        console.error(`Error updating remarks for student ${remarkEntry.studentId}:`, error)
        errorCount++
      }
    }

    console.log('Remarks update complete:', { successCount, errorCount })

    return NextResponse.json({
      message: `Successfully updated remarks for ${successCount} student(s)`,
      success: successCount,
      failed: errorCount,
    })
  } catch (error) {
    console.error('Save remarks error:', error)
    return NextResponse.json(
      { error: 'Failed to save remarks' },
      { status: 500 }
    )
  }
}
