import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSection } from '@/lib/class-utils'
import { classSectionSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const className = searchParams.get('class')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where: { class?: string; isActive?: boolean } = {}
    if (className && className !== 'all') where.class = className
    if (activeOnly) where.isActive = true

    const sections = await prisma.classSection.findMany({
      where,
      orderBy: [
        { class: 'asc' },
        { name: 'asc' },
      ],
    })

    const classTeachers = await prisma.classTeacher.findMany({
      where: { section: { not: null } },
      select: { teacherId: true, class: true, section: true }
    })

    const sectionsWithTeachers = sections.map(sec => {
      const teacher = classTeachers.find(ct => ct.class === sec.class && ct.section === sec.name)
      return {
        ...sec,
        teacherId: teacher?.teacherId || null
      }
    })

    return NextResponse.json({ sections: sectionsWithTeachers })
  } catch (error) {
    console.error('Error fetching sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = classSectionSchema.parse(body)
    const name = normalizeSection(validatedData.name)

    if (!name) {
      return NextResponse.json(
        { error: 'Section name is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.classSection.findFirst({
      where: {
        class: validatedData.class,
        name,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This section already exists for the selected class' },
        { status: 400 }
      )
    }

    const section = await prisma.classSection.create({
      data: {
        class: validatedData.class,
        name,
      },
    })

    if (validatedData.teacherId) {
      await prisma.classTeacher.create({
        data: {
          teacherId: validatedData.teacherId,
          class: validatedData.class,
          section: name,
        }
      })
    }

    return NextResponse.json({ section }, { status: 201 })
  } catch (error) {
    console.error('Error creating section:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    )
  }
}
