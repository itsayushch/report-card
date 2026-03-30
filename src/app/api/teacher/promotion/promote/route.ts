import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNextClass } from '@/lib/calculations'
import { PromotionStatus } from '@prisma/client'

// POST - Promote or detain students (for the class teacher's assigned class)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentIds, action, academicYear } = body as {
      studentIds: string[]
      action: 'PROMOTE' | 'DETAIN' | 'UNPROMOTE'
      academicYear: string
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      )
    }

    if (action !== 'PROMOTE' && action !== 'DETAIN' && action !== 'UNPROMOTE') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
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

    // Verify all students belong to the teacher's assigned class
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
      },
    })

    const invalidStudents = students.filter(
      (student) =>
        student.class !== classTeacherAssignment.class ||
        student.academicYear !== academicYear
    )

    if (invalidStudents.length > 0) {
      return NextResponse.json(
        { error: 'Some students do not belong to your assigned class' },
        { status: 403 }
      )
    }

    const studentsById = new Map(students.map(student => [student.id, student]))
    const validStudentIds = studentIds.filter(studentId => studentsById.has(studentId))

    const updateData = {
      promotionStatus:
        action === 'PROMOTE'
          ? PromotionStatus.PROMOTED
          : action === 'DETAIN'
            ? PromotionStatus.DETAINED
            : PromotionStatus.PENDING,
    }

    if (validStudentIds.length > 0) {
      await prisma.student.updateMany({
        where: { id: { in: validStudentIds } },
        data: updateData,
      })
    }

    const results = studentIds.map((studentId) => {
      const student = studentsById.get(studentId)

      if (!student) {
        return { studentId, success: false, error: 'Student not found' }
      }

      return {
        studentId,
        success: true,
        action,
        newClass: student.class, // Keep current class
      }
    })

    const successCount = results.filter((r) => r.success).length

    const actionMessage = action === 'PROMOTE' ? 'promoted' : action === 'DETAIN' ? 'detained' : 'moved back to pending'

    return NextResponse.json({
      success: true,
      message: `${successCount} student(s) ${actionMessage} successfully`,
      results,
    })
  } catch (error) {
    console.error('Promote students error:', error)
    return NextResponse.json(
      { error: 'Failed to process promotion' },
      { status: 500 }
    )
  }
}
