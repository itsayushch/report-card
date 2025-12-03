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

    // Get assigned classes and subjects from classSubjectPairs
    const assignedClasses = Array.from(new Set(teacher.classSubjectPairs.map(p => p.classAssigned))).sort((a, b) => parseInt(a) - parseInt(b))
    const assignedSubjectNames = Array.from(new Set(teacher.classSubjectPairs.map(p => p.subject)))

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

    // Get recent marks entries from student academic records
    const recentStudentsWithMarks = await prisma.student.findMany({
      where: {
        academicRecords: {
          some: {
            enteredBy: teacher.id,
          },
        },
      },
      select: {
        name: true,
        rollNo: true,
        class: true,
        academicRecords: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    })

    // Transform to match expected format and flatten
    const recentMarks = recentStudentsWithMarks
      .flatMap(student =>
        student.academicRecords
          .filter(record => record.enteredBy === teacher.id)
          .flatMap(record =>
            record.subjects.map(subject => ({
              id: `${student.rollNo}-${record.term}-${subject.subjectCode}`,
              marks: subject.marks,
              term: record.term,
              createdAt: record.enteredAt,
              student: {
                name: student.name,
                rollNo: student.rollNo,
                class: student.class,
              },
              subject: {
                name: subject.subjectCode,
              },
            }))
          )
      )
      .slice(0, 5)

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        assignedClasses,
        subjects,
        classSubjectPairs: teacher.classSubjectPairs,
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
