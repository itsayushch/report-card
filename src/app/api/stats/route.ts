import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      totalStudents,
      totalTeachers,
      activeAcademicYear,
    ] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.teacher.count(),
      prisma.academicYear.findFirst({ where: { isActive: true } }),
    ])

    return NextResponse.json({
      totalStudents,
      totalTeachers,
      activeAcademicYear: activeAcademicYear?.year || 'Not set',
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
