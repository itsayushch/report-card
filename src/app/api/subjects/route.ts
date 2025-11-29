import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subjectSchema } from '@/lib/validations'

// GET all subjects
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ subjects })
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    )
  }
}

// POST create new subject
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = subjectSchema.parse(body)

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

    // Check if code already exists
    const existingSubject = await prisma.subject.findUnique({
      where: { code: validatedData.code },
    })

    if (existingSubject) {
      return NextResponse.json(
        { error: 'Subject code already exists' },
        { status: 400 }
      )
    }

    // Create subject
    const subject = await prisma.subject.create({
      data: {
        ...validatedData,
        academicYear: activeYear.year,
      },
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error: any) {
    console.error('Error creating subject:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    )
  }
}
