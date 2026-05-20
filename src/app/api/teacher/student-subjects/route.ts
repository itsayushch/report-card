import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface SubjectChoiceUpdate {
  studentId: string
  secondLanguageSubject?: string | null
  thirdLanguageSubject?: string | null
  sixthSubject?: string | null
  valueFaithSubject?: string | null
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates = Array.isArray(body?.updates) ? (body.updates as SubjectChoiceUpdate[]) : []

    if (updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
    }

    const classTeacherAssignment = await prisma.classTeacher.findFirst({
      where: { teacherId: session.user.id },
    })

    if (!classTeacherAssignment) {
      return NextResponse.json({ error: 'Not assigned as a class teacher' }, { status: 403 })
    }

    const studentIds = updates.map((update) => update.studentId)

    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        class: classTeacherAssignment.class,
      },
      select: { id: true },
    })

    const validStudentIds = new Set(students.map((student) => student.id))

    const results = await Promise.all(
      updates.map(async (update) => {
        if (!validStudentIds.has(update.studentId)) {
          return { studentId: update.studentId, success: false, error: 'Student not found in class' }
        }

        const data: Record<string, string | null> = {}

        if (Object.prototype.hasOwnProperty.call(update, 'secondLanguageSubject')) {
          data.secondLanguageSubject = update.secondLanguageSubject ?? null
        }
        if (Object.prototype.hasOwnProperty.call(update, 'thirdLanguageSubject')) {
          data.thirdLanguageSubject = update.thirdLanguageSubject ?? null
        }
        if (Object.prototype.hasOwnProperty.call(update, 'sixthSubject')) {
          data.sixthSubject = update.sixthSubject ?? null
        }
        if (Object.prototype.hasOwnProperty.call(update, 'valueFaithSubject')) {
          data.valueFaithSubject = update.valueFaithSubject ?? null
        }

        await prisma.student.update({
          where: { id: update.studentId },
          data,
        })

        return { studentId: update.studentId, success: true }
      })
    )

    return NextResponse.json({
      updated: results.filter((result) => result.success).length,
      results,
    })
  } catch (error) {
    console.error('Error updating student subject choices:', error)
    return NextResponse.json(
      { error: 'Failed to update student subject choices' },
      { status: 500 }
    )
  }
}
