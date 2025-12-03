import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAdminAction, AdminActions } from '@/lib/admin-log'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE student permanently (hard delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get student info before deletion
    const student = await prisma.student.findUnique({
      where: { id },
      select: { name: true, rollNo: true, class: true, status: true }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Only allow permanent deletion of INACTIVE students
    if (student.status !== 'INACTIVE') {
      return NextResponse.json(
        { error: 'Only inactive students can be permanently deleted. Please mark the student as inactive first.' },
        { status: 400 }
      )
    }

    // Check if student has any marks
    const marksCount = await prisma.mark.count({
      where: { studentId: id }
    })

    if (marksCount > 0) {
      return NextResponse.json(
        { error: 'Cannot permanently delete student with marks. Please delete all marks first.' },
        { status: 400 }
      )
    }

    // Permanently delete the student
    await prisma.student.delete({
      where: { id },
    })

    // Log the permanent deletion
    if (session.user.id) {
      await logAdminAction({
        adminId: session.user.id,
        action: 'PERMANENT_DELETE_STUDENT',
        entityType: 'Student',
        entityId: id,
        description: `Permanently deleted student: ${student.name} (Roll No: ${student.rollNo}, Class: ${student.class})`,
        metadata: {
          studentName: student.name,
          rollNo: student.rollNo,
          class: student.class,
          permanentDelete: true
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Student permanently deleted' 
    })
  } catch (error) {
    console.error('Error permanently deleting student:', error)
    return NextResponse.json(
      { error: 'Failed to permanently delete student' },
      { status: 500 }
    )
  }
}
