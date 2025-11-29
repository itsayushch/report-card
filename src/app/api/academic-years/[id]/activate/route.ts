import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT activate academic year
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Deactivate all other years
    await prisma.academicYear.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Activate this year
    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: { isActive: true },
    })

    return NextResponse.json(academicYear)
  } catch (error) {
    console.error('Error activating academic year:', error)
    return NextResponse.json(
      { error: 'Failed to activate academic year' },
      { status: 500 }
    )
  }
}
