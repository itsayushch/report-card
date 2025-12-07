import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
// import { logAdminAction, AdminActions } from '@/lib/admin-log'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get student info before restoring
    const studentBefore = await prisma.student.findUnique({
      where: { id },
      select: { name: true, regNo: true, class: true, status: true }
    })

    if (!studentBefore) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Restore student (mark as ACTIVE)
    const student = await prisma.student.update({
      where: { id },
      data: { status: 'ACTIVE' },
    })

    // Log the restore action
    // if (session.user.id) {
    //   await logAdminAction({
    //     adminId: session.user.id,
    //     action: AdminActions.RESTORE_STUDENT,
    //     entityType: 'Student',
    //     entityId: id,
    //     description: `Restored student to active status: ${studentBefore.name} (Reg. Number: ${studentBefore.regNo}, Class: ${studentBefore.class})`,
    //     metadata: {
    //       studentName: studentBefore.name,
    //       regNo: studentBefore.regNo,
    //       class: studentBefore.class,
    //       previousStatus: studentBefore.status
    //     }
    //   })
    // }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Error restoring student:', error)
    return NextResponse.json(
      { error: 'Failed to restore student' },
      { status: 500 }
    )
  }
}
