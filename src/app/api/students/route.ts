import { NextRequest, NextResponse } from 'next/server'
import type { Student } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseClass } from '@/lib/class-utils'
import { studentSchema } from '@/lib/validations'
import { auth } from '@/lib/auth'
// import { createAdminLog, AdminActions } from '@/lib/admin-log'

// GET all students with filters and search (OPTIMIZED)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const classFilter = searchParams.get('class') || ''
    const statusFilter = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Default 20, Max 100
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { regNo: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (classFilter && classFilter !== 'all') {
      where.class = classFilter
    }

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter
    }

    const studentsAll = await prisma.student.findMany({
      where,
      select: {
        id: true,
        name: true,
        regNo: true,
        class: true,
        status: true,
        academicYear: true,
        promotionStatus: true,
      },
    })

    const students = studentsAll
      .slice()
      .sort((a, b) => {
        const classA = parseClass(a.class)
        const classB = parseClass(b.class)

        if (Number.isNaN(classA) && Number.isNaN(classB)) return 0
        if (Number.isNaN(classA)) return 1
        if (Number.isNaN(classB)) return -1

        if (classA !== classB) return classB - classA

        return a.name.localeCompare(b.name)
      })
      .slice(skip, skip + limit)

    const total = studentsAll.length

    return NextResponse.json({
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

// POST create new student
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = studentSchema.parse(body)

    const [activeYear, existingStudent] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { isActive: true },
      }),
      prisma.student.findUnique({
        where: { regNo: validatedData.regNo },
      }),
    ])

    if (!activeYear) {
      return NextResponse.json(
        { error: 'No active academic year found' },
        { status: 400 }
      )
    }

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Registration number already exists' },
        { status: 400 }
      )
    }

    // Create student
    const student = await prisma.student.create({
      data: {
        ...validatedData,
        academicYear: activeYear.year,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })

    // Log admin action
    // await createAdminLog({
    //   adminId: session.user.id,
    //   action: AdminActions.CREATE_STUDENT,
    //   entityType: 'Student',
    //   entityId: student.id,
    //   description: `Created student: ${student.name} (${student.regNo})`,
    //   metadata: {
    //     studentData: {
    //       name: student.name,
    //       regNo: student.regNo,
    //       class: student.class,
    //     },
    //   },
    // })

    return NextResponse.json(student, { status: 201 })
  } catch (error: any) {
    console.error('Error creating student:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    )
  }
}
