import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateResult } from '@/lib/calculations'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const className = searchParams.get('class')
    const academicYear = searchParams.get('academicYear')

    if (!className || !academicYear) {
      return NextResponse.json(
        { error: 'Class and academic year are required' },
        { status: 400 }
      )
    }

    // Get students in the class
    const students = await prisma.student.findMany({
      where: {
        class: className,
        status: 'ACTIVE',
        academicYear,
      },
      orderBy: {
        rollNo: 'asc',
      },
    })

    // Get final term marks for each student
    const studentsWithResults = await Promise.all(
      students.map(async (student) => {
        // Get all marks for final term
        const marks = await prisma.mark.findMany({
          where: {
            studentId: student.id,
            academicYear,
            term: {
              contains: 'Final',
            },
          },
          include: {
            subject: true,
          },
        })

        if (marks.length === 0) {
          return {
            ...student,
            hasMarks: false,
            totalObtained: 0,
            totalMax: 0,
            percentage: 0,
            result: 'PENDING',
          }
        }

        const subjects = marks.map((m) => ({
          id: m.subjectId,
          maxMarks: m.subject.maxMarks,
          passingMarks: m.subject.passingMarks,
        }))

        const summary = calculateResult(marks, subjects)

        return {
          id: student.id,
          name: student.name,
          rollNo: student.rollNo,
          class: student.class,
          promotionStatus: student.promotionStatus,
          hasMarks: true,
          totalObtained: summary.totalObtained,
          totalMax: summary.totalMax,
          percentage: summary.percentage,
          result: summary.result,
        }
      })
    )

    // Filter only students with marks
    const eligibleStudents = studentsWithResults.filter((s) => s.hasMarks)

    return NextResponse.json(eligibleStudents)
  } catch (error) {
    console.error('Get eligible students error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible students' },
      { status: 500 }
    )
  }
}
