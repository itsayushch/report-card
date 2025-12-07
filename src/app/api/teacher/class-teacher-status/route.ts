import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Check if the logged-in teacher is a class teacher
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find if this teacher is a class teacher
    const classTeacherAssignment = await prisma.classTeacher.findFirst({
      where: {
        teacherId: session.user.id,
      },
    })

    if (!classTeacherAssignment) {
      return NextResponse.json({
        isClassTeacher: false,
        message: 'You are not assigned as a class teacher',
      })
    }

    return NextResponse.json({
      isClassTeacher: true,
      class: classTeacherAssignment.class,
    })
  } catch (error) {
    console.error('Error checking class teacher status:', error)
    return NextResponse.json(
      { error: 'Failed to check class teacher status' },
      { status: 500 }
    )
  }
}
