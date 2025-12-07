import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// import { logAdminAction } from '@/lib/admin-log'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const session = await auth()

    console.log(session?.user)
    if (!session || !['TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const admin = await prisma.teacher.findUnique({
      where: { email: session.user.email! },
    })

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { newPassword } = body

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Get teacher to be updated
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Update password
    await prisma.teacher.update({
      where: { id },
      data: {
        password: newPassword,
        firstLogin: true, // Force password change on next login
      },
    })

    // Log admin action
    // await logAdminAction({
    //   adminId: admin.id,
    //   action: 'RESET_PASSWORD',
    //   entityType: 'Teacher',
    //   entityId: id,
    //   description: `Reset password for teacher: ${teacher.name}`,
    //   ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    //   userAgent: request.headers.get('user-agent') || undefined,
    // })

    return NextResponse.json({
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
