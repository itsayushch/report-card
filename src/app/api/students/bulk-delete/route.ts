import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { studentIds } = body

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'studentIds array is required' },
        { status: 400 }
      )
    }

    // TODO: Refactor to check Student.academicRecords for marks
    // For now, allow deletion without checking marks
    const studentsWithMarks: any[] = []

    if (studentsWithMarks.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete students with marks. Please mark them as inactive instead.',
        },
        { status: 400 }
      )
    }

    // Delete students
    const result = await prisma.student.deleteMany({
      where: {
        id: { in: studentIds },
      },
    })

    return NextResponse.json({
      message: `${result.count} student(s) deleted successfully`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error deleting students:', error)
    return NextResponse.json(
      { error: 'Failed to delete students' },
      { status: 500 }
    )
  }
}
