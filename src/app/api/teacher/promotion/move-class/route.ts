import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNextClass } from '@/lib/calculations'

// POST - Move promoted students to their next class
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentIds, academicYear } = body as {
      studentIds: string[]
      academicYear: string
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      )
    }

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year is required' },
        { status: 400 }
      )
    }

    // Check if this teacher is a class teacher
    const classTeacherAssignment = await prisma.classTeacher.findFirst({
      where: {
        teacherId: session.user.id,
      },
    })

    if (!classTeacherAssignment) {
      return NextResponse.json(
        { error: 'You are not assigned as a class teacher' },
        { status: 403 }
      )
    }

    // Verify all students belong to the teacher's assigned class and are promoted
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
      },
    })

    const invalidStudents = students.filter(
      (student) =>
        student.class !== classTeacherAssignment.class ||
        student.academicYear !== academicYear ||
        student.promotionStatus !== 'PROMOTED'
    )

    if (invalidStudents.length > 0) {
      return NextResponse.json(
        { error: 'Some students are not eligible to be moved (must be promoted students from your class)' },
        { status: 403 }
      )
    }

    const studentsById = new Map(students.map(student => [student.id, student]))
    const groupedUpdates = new Map<string, { studentIds: string[]; updateData: any; nextClass: string }>()

    for (const student of students) {
      const nextClass = getNextClass(student.class)
      const updateData: any = {}

      if (nextClass === 'GRADUATED') {
        updateData.class = student.class
        updateData.status = 'INACTIVE'
      } else {
        updateData.class = nextClass
        updateData.promotionStatus = 'PENDING'
      }

      const key = `${student.class}:${nextClass}`
      const existing = groupedUpdates.get(key)

      if (existing) {
        existing.studentIds.push(student.id)
      } else {
        groupedUpdates.set(key, {
          studentIds: [student.id],
          updateData,
          nextClass,
        })
      }
    }

    if (groupedUpdates.size > 0) {
      await Promise.all(
        Array.from(groupedUpdates.values()).map(group =>
          prisma.student.updateMany({
            where: { id: { in: group.studentIds } },
            data: group.updateData,
          })
        )
      )
    }

    const results = studentIds.map((studentId) => {
      const student = studentsById.get(studentId)

      if (!student) {
        return { studentId, success: false, error: 'Student not found' }
      }

      const nextClass = getNextClass(student.class)
      const newClass = nextClass === 'GRADUATED' ? student.class : nextClass

      return {
        studentId,
        success: true,
        newClass,
        graduated: nextClass === 'GRADUATED',
      }
    })

    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      message: `${successCount} student(s) moved to new class successfully`,
      results,
    })
  } catch (error) {
    console.error('Move students error:', error)
    return NextResponse.json(
      { error: 'Failed to move students' },
      { status: 500 }
    )
  }
}
