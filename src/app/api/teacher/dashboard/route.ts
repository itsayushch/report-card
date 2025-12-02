import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher data and active year in parallel
    const [teacher, activeYear] = await Promise.all([
      prisma.teacher.findUnique({
        where: { email: session.user.email! },
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
      }),
    ])

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Get assigned classes and subjects
    const assignedClasses = teacher.assignedClasses
    const assignedSubjectNames = teacher.subjects

    // Get subject details and student counts in parallel
    const [subjects, ...studentCountResults] = await Promise.all([
      prisma.subject.findMany({
        where: {
          name: { in: assignedSubjectNames },
          academicYear: activeYear?.year,
        },
      }),
      ...assignedClasses.map((cls: string) => {
        return prisma.student.count({
          where: {
            class: cls,
            status: 'ACTIVE',
            academicYear: activeYear?.year,
          },
        })
      }),
    ])

    const studentCounts = assignedClasses.map((cls: string, index: number) => ({
      class: cls,
      count: studentCountResults[index],
    }))

    const totalStudents = studentCounts.reduce(
      (sum: number, item: { class: string; count: number }) => sum + item.count,
      0
    )

    // Get recent marks entries
    const recentMarks = await prisma.mark.findMany({
      where: {
        enteredById: teacher.id,
      },
      select: {
        id: true,
        marks: true,
        term: true,
        createdAt: true,
        student: {
          select: {
            name: true,
            rollNo: true,
            class: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    })

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        assignedClasses,
        subjects,
      },
      stats: {
        totalStudents,
        totalClasses: assignedClasses.length,
        totalSubjects: subjects.length,
        studentCounts,
      },
      recentMarks,
      activeYear,
    })
  } catch (error) {
    console.error('Teacher dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher dashboard data' },
      { status: 500 }
    )
  }
}
