import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSection } from '@/lib/class-utils'
import { classSectionSchema } from '@/lib/validations'
import { ZodError } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = classSectionSchema.parse(body)
    const name = normalizeSection(validatedData.name)

    if (!name) {
      return NextResponse.json(
        { error: 'Section name is required' },
        { status: 400 }
      )
    }

    const duplicate = await prisma.classSection.findFirst({
      where: {
        id: { not: id },
        class: validatedData.class,
        name,
      },
    })

    if (duplicate) {
      return NextResponse.json(
        { error: 'This section already exists for the selected class' },
        { status: 400 }
      )
    }

    const existing = await prisma.classSection.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const section = await prisma.classSection.update({
      where: { id },
      data: {
        class: validatedData.class,
        name,
      },
    })

    if (validatedData.teacherId === null) {
      // Remove any existing teacher assignment for this section
      await prisma.classTeacher.deleteMany({
        where: { class: section.class, section: section.name },
      })
    } else if (validatedData.teacherId) {
      // Upsert teacher assignment
      const existingAssignment = await prisma.classTeacher.findFirst({
        where: { class: section.class, section: section.name },
      })
      if (existingAssignment) {
        await prisma.classTeacher.update({
          where: { id: existingAssignment.id },
          data: { teacherId: validatedData.teacherId },
        })
      } else {
        await prisma.classTeacher.create({
          data: {
            teacherId: validatedData.teacherId,
            class: section.class,
            section: section.name,
          },
        })
      }
    }

    if (existing.class !== section.class || existing.name !== section.name) {
      await Promise.all([
        prisma.student.updateMany({
          where: { class: existing.class, section: existing.name },
          data: { class: section.class, section: section.name },
        }),
        prisma.academicRecord.updateMany({
          where: { class: existing.class, section: existing.name },
          data: { class: section.class, section: section.name },
        }),
        prisma.classTeacher.updateMany({
          where: { class: existing.class, section: existing.name },
          data: { class: section.class, section: section.name },
        }),
        prisma.reportPublish.updateMany({
          where: { class: existing.class, section: existing.name },
          data: { class: section.class, section: section.name },
        }),
      ])
    }

    return NextResponse.json({ section })
  } catch (error) {
    console.error('Error updating section:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const section = await prisma.classSection.findUnique({
      where: { id },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    await Promise.all([
      prisma.student.updateMany({
        where: { class: section.class, section: section.name },
        data: { section: null },
      }),
      prisma.academicRecord.updateMany({
        where: { class: section.class, section: section.name },
        data: { section: null },
      }),
      prisma.classTeacher.deleteMany({
        where: { class: section.class, section: section.name },
      }),
      prisma.reportPublish.deleteMany({
        where: { class: section.class, section: section.name },
      }),
    ])

    await prisma.classSection.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting section:', error)
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    )
  }
}
