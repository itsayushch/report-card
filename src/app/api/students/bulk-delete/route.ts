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

    // Check if any students have academic records (using new collection)
    const recordsCount = await prisma.academicRecord.count({
      where: {
        studentId: { in: studentIds }
      }
    })

    if (recordsCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete students with academic records. Please mark them as inactive instead.',
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
