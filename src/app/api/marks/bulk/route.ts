import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGrade } from '@/lib/calculations'

interface MarkEntry {
  studentId: string
  subjectId: string
  marks: number
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
    const { marks } = body as { marks: MarkEntry[] }

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid marks data' },
        { status: 400 }
      )
    }

    // Validate and create/update marks
    const results = await Promise.all(
      marks.map(async (markEntry) => {
        const { studentId, subjectId, marks: markValue, term, academicYear, teacherRemarks } = markEntry

        // Get subject to validate max marks
        const subject = await prisma.subject.findUnique({
          where: { id: subjectId },
        })

        if (!subject) {
          throw new Error(`Subject not found: ${subjectId}`)
        }

        if (markValue < 0 || markValue > subject.maxMarks) {
          throw new Error(
            `Invalid marks for subject ${subject.name}: ${markValue}. Must be between 0 and ${subject.maxMarks}`
          )
        }

        // Calculate grade
        const grade = calculateGrade(markValue)

        // Upsert mark
        return await prisma.mark.upsert({
          where: {
            studentId_subjectId_term_academicYear: {
              studentId,
              subjectId,
              term,
              academicYear,
            },
          },
          update: {
            marks: markValue,
            grade,
            teacherRemarks,
            enteredById: teacher.id,
          },
          create: {
            studentId,
            subjectId,
            marks: markValue,
            grade,
            term,
            academicYear,
            teacherRemarks,
            enteredById: teacher.id,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      message: `${results.length} marks saved successfully`,
      count: results.length,
    })
  } catch (error: any) {
    console.error('Bulk marks error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save marks' },
      { status: 500 }
    )
  }
}
