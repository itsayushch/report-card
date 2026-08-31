import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Prisma, Status } from '@prisma/client'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { studentIds, allMatching, filters } = await request.json()

    if (!allMatching && (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0)) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      )
    }

    const where: Prisma.StudentWhereInput = allMatching
      ? { status: Status.INACTIVE }
      : { id: { in: studentIds } }

    if (allMatching) {
      const search = typeof filters?.search === 'string' ? filters.search.trim() : ''
      const classFilter = typeof filters?.classFilter === 'string' ? filters.classFilter : ''
      const sectionFilter = typeof filters?.sectionFilter === 'string' ? filters.sectionFilter : ''

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { regNo: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (classFilter && classFilter !== 'all') {
        where.class = classFilter
      }

      if (sectionFilter && sectionFilter !== 'all') {
        where.section = sectionFilter
      }
    }

    // Restore students (mark as ACTIVE)
    const result = await prisma.student.updateMany({
      where,
      data: { status: 'ACTIVE' },
    })

    // Log the bulk restore action
    // if (session.user.id) {
    //   await logAdminAction({
    //     adminId: session.user.id,
    //     action: AdminActions.RESTORE_STUDENTS,
    //     entityType: 'Student',
    //     description: `Restored ${studentIds.length} student(s) to active status`,
    //     metadata: {
    //       count: studentIds.length,
    //       students: students.map(s => ({
    //         id: s.id,
    //         name: s.name,
    //         regNo: s.regNo,
    //         class: s.class
    //       }))
    //     }
    //   })
    // }

    return NextResponse.json({ 
      success: true,
      count: result.count 
    })
  } catch (error) {
    console.error('Error restoring students:', error)
    return NextResponse.json(
      { error: 'Failed to restore students' },
      { status: 500 }
    )
  }
}
