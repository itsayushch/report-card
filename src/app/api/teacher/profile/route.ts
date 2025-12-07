import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teacher = await prisma.teacher.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        classSubjectPairs: true,
        isAdmin: true,
        isSuperAdmin: true,
        firstLogin: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    return NextResponse.json({ teacher })
  } catch (error) {
    console.error('Get teacher profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const teacher = await prisma.teacher.update({
      where: { email: session.user.email! },
      data: {
        name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        classSubjectPairs: true,
        isAdmin: true,
        firstLogin: true,
      },
    })

    return NextResponse.json({ 
      teacher,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Update teacher profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
