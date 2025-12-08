import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classParam = searchParams.get('class')
    const status = searchParams.get('status')

    const where: any = {}

    if (classParam) {
      where.class = classParam
    }
    if (status) {
      where.status = status
    }

    const students = await prisma.student.findMany({
      where,
      select: {
        name: true,
        regNo: true,
        class: true,
      },
      orderBy: {
        regNo: 'asc',
      },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('Export students error:', error)
    return NextResponse.json(
      { error: 'Failed to export students' },
      { status: 500 }
    )
  }
}
