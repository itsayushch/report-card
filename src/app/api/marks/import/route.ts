import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGrade } from '@/lib/calculations'

interface MarkImportData {
  rollNo: string
  subjectName: string
  marks: number
  remarks?: string
  term?: string
  academicYear?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher ID
    const teacher = await prisma.teacher.findUnique({
      where: {
        email: session.user.email!,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    const body = await request.json()
    const { marks, term, academicYear } = body as {
      marks: MarkImportData[]
      term: string
      academicYear: string
    }

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid marks data' },
        { status: 400 }
      )
    }

    if (!term || !academicYear) {
      return NextResponse.json(
        { error: 'Term and academic year are required' },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    }

    for (let i = 0; i < marks.length; i++) {
      const markEntry = marks[i]

      try {
        // Validate required fields
        if (!markEntry.rollNo || !markEntry.subjectName || markEntry.marks === undefined) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields (rollNo, subjectName, marks)',
          })
          continue
        }

        // Find student by roll number
        const student = await prisma.student.findUnique({
          where: { rollNo: markEntry.rollNo },
        })

        if (!student) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: `Student with roll number ${markEntry.rollNo} not found`,
          })
          continue
        }

        // Find subject by name
        const subject = await prisma.subject.findFirst({
          where: { name: markEntry.subjectName },
        })

        if (!subject) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: `Subject with name ${markEntry.subjectName} not found`,
          })
          continue
        }

        // Validate marks
        const markValue = parseFloat(String(markEntry.marks))
        
        if (isNaN(markValue) || markValue < 0 || markValue > subject.maxMarks) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: `Invalid marks. Must be between 0 and ${subject.maxMarks}`,
          })
          continue
        }

        // Calculate grade
        const grade = calculateGrade(markValue)

        // Upsert mark
        await prisma.mark.upsert({
          where: {
            studentId_subjectId_term_academicYear: {
              studentId: student.id,
              subjectId: subject.id,
              term: markEntry.term || term,
              academicYear: markEntry.academicYear || academicYear,
            },
          },
          update: {
            marks: markValue,
            grade,
            teacherRemarks: markEntry.remarks || null,
            enteredById: teacher.id,
          },
          create: {
            studentId: student.id,
            subjectId: subject.id,
            marks: markValue,
            grade,
            term: markEntry.term || term,
            academicYear: markEntry.academicYear || academicYear,
            teacherRemarks: markEntry.remarks || null,
            enteredById: teacher.id,
          },
        })

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push({
          row: i + 1,
          error: error.message || 'Failed to save mark',
        })
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      ...results,
    })
  } catch (error) {
    console.error('Import marks error:', error)
    return NextResponse.json(
      { error: 'Failed to import marks' },
      { status: 500 }
    )
  }
}
