import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { studentSchema } from '@/lib/validations'
// import { logAdminAction, AdminActions } from '@/lib/admin-log'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET single student
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    )
  }
}

// PUT update student
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = studentSchema.parse(body)

    const student = await prisma.student.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(student)
  } catch (error: any) {
    console.error('Error updating student:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    )
  }
}

// DELETE student (soft delete - mark as inactive)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Get session for audit logging
    const session = await auth()
    
    // Get student info before marking inactive
    const studentBefore = await prisma.student.findUnique({
      where: { id },
      select: { name: true, regNo: true, class: true }
    })

    if (!studentBefore) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Mark student as inactive instead of deleting
    const student = await prisma.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
    })

    // Log the action if admin is logged in
    // if (session?.user?.id) {
    //   await logAdminAction({
    //     adminId: session.user.id,
    //     action: AdminActions.DELETE_STUDENT,
    //     entityType: 'Student',
    //     entityId: id,
    //     description: `Marked student as inactive: ${studentBefore.name} (Reg. Number: ${studentBefore.regNo}, Class: ${studentBefore.class})`,
    //     metadata: {
    //       studentName: studentBefore.name,
    //       regNo: studentBefore.regNo,
    //       class: studentBefore.class,
    //       action: 'marked_inactive'
    //     }
    //   })
    // }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Error deleting student:', error)
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    )
  }
}
