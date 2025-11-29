import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { studentSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET single student
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    )
  }
}

// PUT update student
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = studentSchema.parse(body)

    const student = await prisma.student.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(student)
  } catch (error: any) {
    console.error('Error updating student:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    )
  }
}

// DELETE student (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const student = await prisma.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
    })

    return NextResponse.json(student)
  } catch (error) {
    console.error('Error deleting student:', error)
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    )
  }
}
