import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { academicYearSchema } from '@/lib/validations'
import { getTermsForClass, allTerms } from '@/lib/terms'

// GET all academic years
export async function GET() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    })

    // Add terms to each academic year
    const academicYearsWithTerms = academicYears.map(year => ({
      ...year,
      terms: allTerms.map(term => ({ name: term }))
    }))

    return NextResponse.json({ academicYears: academicYearsWithTerms })
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

    // Automatically promote all students marked as PROMOTED
    if (data.isActive) {
      // Get all promoted students from previous year
      const promotedStudents = await prisma.student.findMany({
        where: {
          promotionStatus: 'PROMOTED',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          class: true,
        },
      })

      // Promote students to next class
      if (promotedStudents.length > 0) {
        const promotionUpdates = promotedStudents.map(student => {
          const currentClass = parseInt(student.class)
          const nextClass = currentClass >= 10 ? 10 : currentClass + 1 // Max class is 10
          
          return prisma.student.update({
            where: { id: student.id },
            data: {
              class: nextClass.toString(),
              academicYear: data.year,
              promotionStatus: 'PENDING', // Reset promotion status
            },
          })
        })

        await Promise.all(promotionUpdates)
      }
    }

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
