import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student data and active academic year in parallel
    const [student, activeYear] = await Promise.all([
      prisma.student.findUnique({
        where: { email: session.user.email! },
        select: {
          id: true,
          name: true,
          rollNo: true,
          class: true,
          section: true,
          email: true,
          academicYear: true,
          promotionStatus: true,
        },
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          year: true,
          startDate: true,
          endDate: true,
          terms: true,
        },
      }),
    ])

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!activeYear) {
      return NextResponse.json({
        student,
        activeYear: null,
        latestTermSummary: null,
      })
    }

    // Check for any published report for this student
    const publishStatus = await prisma.reportPublish.findFirst({
      where: {
        class: student.class,
        section: student.section,
        academicYear: activeYear.year,
        isPublished: true,
      },
      orderBy: {
        createdAt: 'asc', // Get the earliest published report
      },
      select: {
        term: true,
        createdAt: true,
      },
    })


    let latestTermSummary = null

    if (publishStatus) {
      // Get marks for the published term
      const marks = await prisma.mark.findMany({
        where: {
          studentId: student.id,
          term: publishStatus.term,
          academicYear: activeYear.year,
        },
        select: {
          marks: true,
          subject: {
            select: {
              name: true,
              maxMarks: true,
              passingMarks: true,
            },
          },
        },
      })

      // Calculate summary
      let totalObtained = 0
      let totalMax = 0
      let failed = false

      marks.forEach((mark) => {
        totalObtained += mark.marks
        totalMax += mark.subject.maxMarks
        if (mark.marks < mark.subject.passingMarks) {
          failed = true
        }
      })

      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
      const gpa = percentage / 10

      latestTermSummary = {
        term: publishStatus.term,
        totalSubjects: marks.length,
        totalObtained,
        totalMax,
        percentage: Math.round(percentage * 100) / 100,
        gpa: Math.round(gpa * 100) / 100,
        result: failed ? 'FAIL' : 'PASS',
      }
    }

    return NextResponse.json({
      student,
      activeYear,
      latestTermSummary,
      isPublished: !!publishStatus,
    })
  } catch (error) {
    console.error('Student dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student dashboard data' },
      { status: 500 }
    )
  }
}
