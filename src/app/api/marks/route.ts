import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classParam = searchParams.get('class')
    const subjectId = searchParams.get('subject')
    const term = searchParams.get('term')
    const academicYear = searchParams.get('academicYear')
    const studentId = searchParams.get('studentId')

    const where: any = {}

    if (classParam) {
      where.student = { class: classParam }
    }
    if (subjectId) {
      where.subjectId = subjectId
    }
    if (term) {
      where.term = term
    }
    if (academicYear) {
      where.academicYear = academicYear
    }
    if (studentId) {
      where.studentId = studentId
    }

    const marks = await prisma.mark.findMany({
      where,
      include: {
        student: true,
        subject: true,
        enteredBy: true,
      },
      orderBy: [
        { student: { rollNo: 'asc' } },
      ],
    })

    return NextResponse.json(marks)
  } catch (error) {
    console.error('Get marks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marks' },
      { status: 500 }
    )
  }
}
