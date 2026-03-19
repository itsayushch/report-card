import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSubjectById } from '@/lib/subjects'

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
    
    // Convert subject IDs to subject details using the subjects utility
    const subjectDetails = teacher.classSubjectPairs.map(pair => {
      const subject = getSubjectById(pair.classAssigned, pair.subject)
      return subject ? {
        id: subject.id,
        name: subject.name,
        class: pair.classAssigned,
      } : null
    }).filter(Boolean)

    // Get unique subjects
    const uniqueSubjects = Array.from(
      new Map(subjectDetails.map(s => [s!.id, s])).values()
    )

    // Get student counts in parallel
    const studentCountResults = await Promise.all(
      assignedClasses.map((cls: string) => {
        return prisma.student.count({
          where: {
            class: cls,
            status: 'ACTIVE',
            academicYear: activeYear?.year,
          },
        })
      })
    )

    const studentCounts = assignedClasses.map((cls: string, index: number) => ({
      class: cls,
      count: studentCountResults[index],
    }))

    const totalStudents = studentCounts.reduce(
      (sum: number, item: { class: string; count: number }) => sum + item.count,
      0
    )

    // Get recent marks entries safely: fetch records and then join students manually to avoid null relation issues
    const recentRecordsWithMarks = await prisma.academicRecord.findMany({
      where: {
        terms: {
          some: {
            enteredBy: teacher.id,
          },
        },
      },
      select: {
        studentId: true,
        terms: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    })

    const studentIds = Array.from(
      new Set(
        recentRecordsWithMarks
          .map(record => record.studentId)
          .filter((id): id is string => Boolean(id))
      )
    )

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, regNo: true, class: true },
    })

    const studentMap = new Map(students.map(s => [s.id, s]))

    // Transform to match expected format and flatten
    const recentMarks = recentRecordsWithMarks
      .flatMap(record => {
        const student = studentMap.get(record.studentId)
        if (!student) return []

        return record.terms
          .filter(term => term.enteredBy === teacher.id)
          .flatMap(term =>
            term.subjects.map(subject => ({
              id: `${student.regNo}-${term.name}-${subject.subjectCode}`,
              marks: subject.marks,
              term: term.name,
              createdAt: term.enteredAt,
              student: {
                name: student.name,
                regNo: student.regNo,
                class: student.class,
              },
              subject: {
                name: subject.subjectCode,
              },
            }))
          )
      })
      .slice(0, 5)

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        assignedClasses,
        subjects: uniqueSubjects,
        classSubjectPairs: teacher.classSubjectPairs,
      },
      stats: {
        totalStudents,
        totalClasses: assignedClasses.length,
        totalSubjects: uniqueSubjects.length,
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
