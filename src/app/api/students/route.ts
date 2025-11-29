import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { studentSchema } from '@/lib/validations'
import { auth } from '@/lib/auth'
import { createAdminLog, AdminActions } from '@/lib/admin-log'

// GET all students with filters and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const classFilter = searchParams.get('class') || ''
    const sectionFilter = searchParams.get('section') || ''
    const statusFilter = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (classFilter) {
      // Handle both "10" and "10-A" formats
      // If classFilter contains a hyphen, split into class and section
      if (classFilter.includes('-')) {
        const [className, section] = classFilter.split('-')
        where.class = className
        where.section = section
      } else {
        where.class = classFilter
      }
    }

    if (sectionFilter) {
      where.section = sectionFilter
    }

    if (statusFilter) {
      where.status = statusFilter
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          rollNo: true,
          email: true,
          class: true,
          section: true,
          status: true,
          academicYear: true,
          parentName: true,
          phone: true,
          promotionStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count({ where }),
    ])

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

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    })

    if (!activeYear) {
      return NextResponse.json(
        { error: 'No active academic year found' },
        { status: 400 }
      )
    }

    // Check if roll number already exists
    const existingStudent = await prisma.student.findUnique({
      where: { rollNo: validatedData.rollNo },
    })

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Roll number already exists' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await prisma.student.findFirst({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Password is dateOfBirth in DDMMYYYY format (plain text, no slashes)
    // dateOfBirth is stored with slashes DD/MM/YYYY
    let password: string
    let dateOfBirth: string

    if (validatedData.dateOfBirth) {
      // Remove any slashes from input to get DDMMYYYY
      const dobWithoutSlashes = validatedData.dateOfBirth.replace(/\//g, '')
      password = dobWithoutSlashes
      
      // Format as DD/MM/YYYY for storage
      if (dobWithoutSlashes.length === 8) {
        dateOfBirth = `${dobWithoutSlashes.slice(0, 2)}/${dobWithoutSlashes.slice(2, 4)}/${dobWithoutSlashes.slice(4, 8)}`
      } else {
        dateOfBirth = validatedData.dateOfBirth
      }
    } else {
      password = validatedData.rollNo
      dateOfBirth = ''
    }

    // Create student with embedded auth
    const student = await prisma.student.create({
      data: {
        ...validatedData,
        dateOfBirth: dateOfBirth,
        password: password,
        academicYear: activeYear.year,
        status: validatedData.status || 'ACTIVE',
      },
    })

    // Log admin action
    await createAdminLog({
      adminId: session.user.id,
      action: AdminActions.CREATE_STUDENT,
      entityType: 'Student',
      entityId: student.id,
      description: `Created student: ${student.name} (${student.rollNo})`,
      metadata: {
        studentData: {
          name: student.name,
          rollNo: student.rollNo,
          class: student.class,
          section: student.section,
          email: student.email,
        },
      },
    })

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
