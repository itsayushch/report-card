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

    // A null section means the teacher teaches every active section of that
    // class. Resolve those assignments from ClassSection instead of assuming
    // which sections a class has.
    const assignedClasses = Array.from(new Set(teacher.classSubjectPairs.map(p => p.classAssigned)))
      .sort((a, b) => parseInt(a) - parseInt(b))
    const activeSections = assignedClasses.length
      ? await prisma.classSection.findMany({
          where: { class: { in: assignedClasses }, isActive: true },
          select: { class: true, name: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        })
      : []

    const sectionsByClass = new Map<string, string[]>()
    for (const section of activeSections) {
      const sections = sectionsByClass.get(section.class) || []
      sections.push(section.name)
      sectionsByClass.set(section.class, sections)
    }

    const assignedClassSections = Array.from(
      new Map(
        teacher.classSubjectPairs.flatMap(pair => {
          if (pair.section) {
            return [[`${pair.classAssigned}::${pair.section}`, {
              class: pair.classAssigned,
              section: pair.section,
            }]] as const
          }

          const sections = sectionsByClass.get(pair.classAssigned) || []
          return (sections.length ? sections : [null]).map(section => [
            `${pair.classAssigned}::${section || ''}`,
            { class: pair.classAssigned, section },
          ] as const)
        })
      ).values()
    ).sort((a, b) =>
      parseInt(a.class) - parseInt(b.class) || (a.section || '').localeCompare(b.section || '')
    )
    
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

    // Prisma's MongoDB connector cannot group by a nullable field reliably.
    // Fetch only the fields needed for the lightweight per-section count instead.
    const assignedStudents = assignedClasses.length
      ? await prisma.student.findMany({
          where: {
            class: { in: assignedClasses },
            status: 'ACTIVE',
            ...(activeYear?.year ? { academicYear: activeYear.year } : {}),
          },
          select: { class: true, section: true },
        })
      : []

    const studentCountMap = new Map<string, number>()
    const classStudentCountMap = new Map<string, number>()
    for (const student of assignedStudents) {
      const classSectionKey = `${student.class}::${student.section || ''}`
      studentCountMap.set(
        classSectionKey,
        (studentCountMap.get(classSectionKey) || 0) + 1
      )
      classStudentCountMap.set(
        student.class,
        (classStudentCountMap.get(student.class) || 0) + 1
      )
    }

    const studentCounts = assignedClassSections.map(({ class: classValue, section }) => ({
      class: classValue,
      section,
      count: section
        ? studentCountMap.get(`${classValue}::${section}`) ?? 0
        : classStudentCountMap.get(classValue) ?? 0,
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
        assignedClassSections,
        subjects: uniqueSubjects,
        classSubjectPairs: teacher.classSubjectPairs,
      },
      stats: {
        totalStudents,
        totalClasses: assignedClassSections.length,
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
