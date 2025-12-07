import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { teacherSchema } from '@/lib/validations'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET single teacher
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Error fetching teacher:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher' },
      { status: 500 }
    )
  }
}

// PUT update teacher
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = teacherSchema.parse(body)

    // Get existing teacher
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
    })

    if (!existingTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Protect superadmin - cannot change their admin status
    if (existingTeacher.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Cannot modify super administrator account' },
        { status: 403 }
      )
    }

    const teacher = await prisma.teacher.update({
      where: { id },
      data: validatedData,
    })

    // Log admin privilege changes
    // if (validatedData.isAdmin !== existingTeacher.isAdmin) {
    //   const { createAdminLog, AdminActions } = await import('@/lib/admin-log')
    //   await createAdminLog({
    //     adminId: session.user.id,
    //     action: validatedData.isAdmin ? AdminActions.GRANT_ADMIN : AdminActions.REVOKE_ADMIN,
    //     entityType: 'Teacher',
    //     entityId: teacher.id,
    //     description: `${validatedData.isAdmin ? 'Granted' : 'Revoked'} admin privileges for ${teacher.name}`,
    //   })
    // }

    return NextResponse.json(teacher)
  } catch (error: any) {
    console.error('Error updating teacher:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update teacher' },
      { status: 500 }
    )
  }
}

// DELETE teacher
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Check if teacher is superadmin
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    if (teacher.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Cannot delete super administrator account' },
        { status: 403 }
      )
    }

    // Delete teacher
    await prisma.teacher.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting teacher:', error)
    return NextResponse.json(
      { error: 'Failed to delete teacher' },
      { status: 500 }
    )
  }
}
