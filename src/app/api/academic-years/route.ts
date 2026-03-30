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

    // Only promote students if this new year is set as active AND is newer than previous years
    if (data.isActive) {
      // Get the previous active academic year (or most recent year)
      const previousYears = await prisma.academicYear.findMany({
        where: {
          year: { not: data.year },
        },
        orderBy: { year: 'desc' },
        take: 1,
      })

      const previousYear = previousYears[0]
      const shouldPromote = !previousYear || parseInt(data.year) > parseInt(previousYear.year)

      if (shouldPromote) {
        const [promotedStudents, otherStudents] = await Promise.all([
          prisma.student.findMany({
            where: {
              status: 'ACTIVE',
              promotionStatus: 'PROMOTED',
            },
            select: {
              id: true,
              class: true,
            },
          }),
          prisma.student.findMany({
            where: {
              status: 'ACTIVE',
              promotionStatus: { not: 'PROMOTED' },
            },
            select: {
              id: true,
            },
          }),
        ])

        if (promotedStudents.length > 0 || otherStudents.length > 0) {
          const updates = []

          // Update PROMOTED students: increment class + update year + reset status
          if (promotedStudents.length > 0) {
            const promotedByClass = new Map<string, string[]>()
            
            promotedStudents.forEach(student => {
              if (!promotedByClass.has(student.class)) {
                promotedByClass.set(student.class, [])
              }
              promotedByClass.get(student.class)!.push(student.id)
            })

            promotedByClass.forEach((studentIds, currentClass) => {
              const classNum = parseInt(currentClass)
              const nextClass = classNum >= 12 ? 12 : classNum + 1
              
              updates.push(
                prisma.student.updateMany({
                  where: { id: { in: studentIds } },
                  data: {
                    class: nextClass.toString(),
                    academicYear: data.year,
                    promotionStatus: 'PENDING',
                  },
                })
              )
            })
          }

          // Update other students: just update year + reset status (keep same class)
          if (otherStudents.length > 0) {
            updates.push(
              prisma.student.updateMany({
                where: {
                  id: { in: otherStudents.map(s => s.id) },
                },
                data: {
                  academicYear: data.year,
                  promotionStatus: 'PENDING',
                },
              })
            )
          }

          const results = await Promise.all(updates)
          const totalUpdated = results.reduce((sum, result) => sum + result.count, 0)
          
          console.log(`Updated ${totalUpdated} students (${promotedStudents.length} promoted to next class) for academic year ${data.year}`)
        }
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
