import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE - Remove a class teacher assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    await prisma.classTeacher.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting class teacher:', error)
    return NextResponse.json(
      { error: 'Failed to delete class teacher assignment' },
      { status: 500 }
    )
  }
}

// PUT - Update a class teacher assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { teacherId, class: className } = body

    if (!teacherId || !className) {
      return NextResponse.json(
        { error: 'Teacher ID and class are required' },
        { status: 400 }
      )
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Check if the new class is already assigned (excluding current assignment)
    const existingAssignment = await prisma.classTeacher.findFirst({
      where: {
        AND: [
          { class: className },
          { id: { not: id } },
        ],
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'This class already has a class teacher' },
        { status: 400 }
      )
    }

    const classTeacher = await prisma.classTeacher.update({
      where: { id },
      data: {
        teacherId,
        class: className,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ classTeacher })
  } catch (error) {
    console.error('Error updating class teacher:', error)
    return NextResponse.json(
      { error: 'Failed to update class teacher assignment' },
      { status: 500 }
    )
  }
}
