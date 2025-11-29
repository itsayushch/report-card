import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { teacherSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET single teacher
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Error fetching teacher:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher' },
      { status: 500 }
    )
  }
}

// PUT update teacher
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = teacherSchema.parse(body)

    const teacher = await prisma.teacher.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(teacher)
  } catch (error: any) {
    console.error('Error updating teacher:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update teacher' },
      { status: 500 }
    )
  }
}

// DELETE teacher
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Delete teacher
    await prisma.teacher.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting teacher:', error)
    return NextResponse.json(
      { error: 'Failed to delete teacher' },
      { status: 500 }
    )
  }
}
