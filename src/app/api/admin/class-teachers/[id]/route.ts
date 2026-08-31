import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSection } from '@/lib/class-utils'

// DELETE - Remove a class teacher assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { teacherId, class: className } = body
    const section = normalizeSection(body.section)

    if (!teacherId || !className) {
      return NextResponse.json(
        { error: 'Teacher ID and class are required' },
        { status: 400 }
      )
    }

    const [teacher, existingAssignment, existingSection] = await Promise.all([
      prisma.teacher.findUnique({
        where: { id: teacherId },
      }),
      prisma.classTeacher.findFirst({
        where: {
          AND: [
            { class: className },
            { section },
            { id: { not: id } },
          ],
        },
      }),
      section
        ? prisma.classSection.findFirst({
            where: { class: className, name: section, isActive: true },
          })
        : Promise.resolve(null),
    ])

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    if (section && !existingSection) {
      return NextResponse.json(
        { error: 'Selected section was not found for this class' },
        { status: 400 }
      )
    }

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'This class section already has a class teacher' },
        { status: 400 }
      )
    }

    const classTeacher = await prisma.classTeacher.update({
      where: { id },
      data: {
        teacherId,
        class: className,
        section,
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
