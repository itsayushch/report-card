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
        where: { regNo: session.user.email! }, // session.user.email contains regNo for students
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
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
        academicYear: activeYear.year,
        isPublished: true,
      },
      orderBy: {
        createdAt: 'asc', // Get the earliest published report
      },
    })


    let latestTermSummary = null

    // TODO: Refactor to calculate from Student.academicRecords
    // For now, return basic data without marks calculation
    if (publishStatus) {
      latestTermSummary = {
        term: publishStatus.term,
        totalSubjects: 0,
        totalObtained: 0,
        totalMax: 0,
        percentage: 0,
        gpa: 0,
        result: 'PENDING',
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
