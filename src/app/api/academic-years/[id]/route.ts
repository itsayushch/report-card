import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { academicYearSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT update academic year
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = academicYearSchema.parse(body)

    // Convert string dates to Date objects if needed
    const data = {
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      terms: validatedData.terms.map(term => ({
        ...term,
        startDate: new Date(term.startDate),
        endDate: new Date(term.endDate),
      })),
    }

    // If setting as active, deactivate others
    if (data.isActive) {
      await prisma.academicYear.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      })
    }

    const academicYear = await prisma.academicYear.update({
      where: { id },
      data,
    })

    return NextResponse.json(academicYear)
  } catch (error: any) {
    console.error('Error updating academic year:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update academic year' },
      { status: 500 }
    )
  }
}

// DELETE academic year
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.academicYear.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting academic year:', error)
    return NextResponse.json(
      { error: 'Failed to delete academic year' },
      { status: 500 }
    )
  }
}
