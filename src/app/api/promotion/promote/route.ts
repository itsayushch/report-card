import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentIds, action, academicYear } = await req.json()

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one student' },
        { status: 400 }
      )
    }

    if (!action || !['PROMOTE', 'DETAIN'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year is required' },
        { status: 400 }
      )
    }

    // Update promotion status for selected students
    await prisma.student.updateMany({
      where: {
        id: { in: studentIds },
        academicYear,
      },
      data: {
        promotionStatus: action === 'PROMOTE' ? 'PROMOTED' : 'DETAINED',
      },
    })

    const message =
      action === 'PROMOTE'
        ? `${studentIds.length} student(s) marked as promoted. Use "Move to New Class" to move them to the next class.`
        : `${studentIds.length} student(s) marked as detained`

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error: any) {
    console.error('Promotion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process promotion' },
      { status: 500 }
    )
  }
}
