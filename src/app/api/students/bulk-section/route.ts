import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { normalizeSection } from '@/lib/class-utils'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentIds, allMatching, filters, className, section } = await request.json()
    const targetClass = typeof className === 'string' ? className : ''
    const targetSection = normalizeSection(section)

    if (!targetClass) {
      return NextResponse.json(
        { error: 'Please select one class before assigning a section' },
        { status: 400 }
      )
    }

    if (!targetSection) {
      return NextResponse.json(
        { error: 'Section is required' },
        { status: 400 }
      )
    }

    if (!allMatching && (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0)) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      )
    }

    const existingSection = await prisma.classSection.findFirst({
      where: {
        class: targetClass,
        name: targetSection,
        isActive: true,
      },
    })

    if (!existingSection) {
      return NextResponse.json(
        { error: 'Selected section was not found for this class' },
        { status: 400 }
      )
    }

    const where: Prisma.StudentWhereInput = allMatching
      ? { class: targetClass }
      : { id: { in: studentIds }, class: targetClass }

    if (allMatching) {
      const search = typeof filters?.search === 'string' ? filters.search.trim() : ''
      const sectionFilter = typeof filters?.sectionFilter === 'string' ? filters.sectionFilter : ''
      const statusFilter = typeof filters?.statusFilter === 'string' ? filters.statusFilter : ''

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { regNo: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (sectionFilter && sectionFilter !== 'all') {
        where.section = sectionFilter
      }

      if (statusFilter === 'ACTIVE' || statusFilter === 'INACTIVE') {
        where.status = statusFilter
      }
    }

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        academicYear: true,
      },
    })

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No students matched this section assignment' },
        { status: 400 }
      )
    }

    await prisma.student.updateMany({
      where: { id: { in: students.map((student) => student.id) } },
      data: { section: targetSection },
    })

    await Promise.all(
      students.map((student) =>
        prisma.academicRecord.updateMany({
          where: {
            studentId: student.id,
            academicYear: student.academicYear,
          },
          data: {
            class: targetClass,
            section: targetSection,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      count: students.length,
    })
  } catch (error) {
    console.error('Error assigning students to section:', error)
    return NextResponse.json(
      { error: 'Failed to assign students to section' },
      { status: 500 }
    )
  }
}
