import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logAdminAction, AdminActions } from '@/lib/admin-log'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { studentIds } = await request.json()

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      )
    }

    // Get student names for logging
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, rollNo: true, class: true }
    })

    // Restore students (mark as ACTIVE)
    await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { status: 'ACTIVE' },
    })

    // Log the bulk restore action
    if (session.user.id) {
      await logAdminAction({
        adminId: session.user.id,
        action: AdminActions.RESTORE_STUDENTS,
        entityType: 'Student',
        description: `Restored ${studentIds.length} student(s) to active status`,
        metadata: {
          count: studentIds.length,
          students: students.map(s => ({
            id: s.id,
            name: s.name,
            rollNo: s.rollNo,
            class: s.class
          }))
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      count: studentIds.length 
    })
  } catch (error) {
    console.error('Error restoring students:', error)
    return NextResponse.json(
      { error: 'Failed to restore students' },
      { status: 500 }
    )
  }
}
