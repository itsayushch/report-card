import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { academicYearSchema } from '@/lib/validations'

// GET all academic years
export async function GET() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json({ academicYears })
  } catch (error) {
    console.error('Error fetching academic years:', error)
    return NextResponse.json(
      { error: 'Failed to fetch academic years' },
      { status: 500 }
    )
  }
}

// POST create new academic year
export async function POST(request: NextRequest) {
  try {
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

    // Check if year already exists
    const existingYear = await prisma.academicYear.findUnique({
      where: { year: data.year },
    })

    if (existingYear) {
      return NextResponse.json(
        { error: 'Academic year already exists' },
        { status: 400 }
      )
    }

    // If this is set as active, deactivate others
    if (data.isActive) {
      await prisma.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    // Create academic year
    const academicYear = await prisma.academicYear.create({
      data,
    })

    return NextResponse.json(academicYear, { status: 201 })
  } catch (error: any) {
    console.error('Error creating academic year:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create academic year' },
      { status: 500 }
    )
  }
}
