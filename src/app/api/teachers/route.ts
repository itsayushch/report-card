import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { teacherSchema } from '@/lib/validations'
import { auth } from '@/lib/auth'
import { createAdminLog, AdminActions } from '@/lib/admin-log'

// GET all teachers
export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ teachers })
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    )
  }
}

// POST create new teacher
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = teacherSchema.parse(body)

    // Check if email already exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { email: validatedData.email },
    })

    if (existingTeacher) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Password is email (plain text, to be reset on first login)
    // Create teacher with embedded auth
    const teacher = await prisma.teacher.create({
      data: {
        ...validatedData,
        password: validatedData.email,  // Email as password (plain text)
        isAdmin: validatedData.isAdmin || false,
        firstLogin: true,  // Require password reset on first login
      },
    })

    // Log admin action
    await createAdminLog({
      adminId: session.user.id,
      action: validatedData.isAdmin ? AdminActions.CREATE_TEACHER : AdminActions.CREATE_TEACHER,
      entityType: 'Teacher',
      entityId: teacher.id,
      description: `Created teacher: ${teacher.name}${teacher.isAdmin ? ' (Admin)' : ''}`,
      metadata: {
        teacherData: {
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.subjects,
          assignedClasses: teacher.assignedClasses,
          isAdmin: teacher.isAdmin,
        },
      },
    })

    return NextResponse.json(teacher, { status: 201 })
  } catch (error: any) {
    console.error('Error creating teacher:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create teacher' },
      { status: 500 }
    )
  }
}
