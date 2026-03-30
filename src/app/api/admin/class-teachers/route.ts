import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all class teacher assignments
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classTeachers = await prisma.classTeacher.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        class: 'asc',
      },
    })

    return NextResponse.json({ classTeachers })
  } catch (error) {
    console.error('Error fetching class teachers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class teachers' },
      { status: 500 }
    )
  }
}

// POST - Create a new class teacher assignment
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teacherId, class: className } = body

    if (!teacherId || !className) {
      return NextResponse.json(
        { error: 'Teacher ID and class are required' },
        { status: 400 }
      )
    }

    const [teacher, existingAssignment] = await Promise.all([
      prisma.teacher.findUnique({
        where: { id: teacherId },
      }),
      prisma.classTeacher.findUnique({
        where: {
          class: className,
        },
      }),
    ])

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'This class already has a class teacher' },
        { status: 400 }
      )
    }

    const classTeacher = await prisma.classTeacher.create({
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

    return NextResponse.json({ classTeacher }, { status: 201 })
  } catch (error) {
    console.error('Error creating class teacher:', error)
    return NextResponse.json(
      { error: 'Failed to create class teacher assignment' },
      { status: 500 }
    )
  }
}
