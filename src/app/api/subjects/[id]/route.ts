import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subjectSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET single subject
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const subject = await prisma.subject.findUnique({
      where: { id },
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(subject)
  } catch (error) {
    console.error('Error fetching subject:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subject' },
      { status: 500 }
    )
  }
}

// PUT update subject
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = subjectSchema.parse(body)

    const subject = await prisma.subject.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(subject)
  } catch (error: any) {
    console.error('Error updating subject:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update subject' },
      { status: 500 }
    )
  }
}

// DELETE subject
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Check if subject is used in marks
    const marksCount = await prisma.mark.count({
      where: { subjectId: id },
    })

    if (marksCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subject that has marks assigned' },
        { status: 400 }
      )
    }

    await prisma.subject.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subject:', error)
    return NextResponse.json(
      { error: 'Failed to delete subject' },
      { status: 500 }
    )
  }
}
