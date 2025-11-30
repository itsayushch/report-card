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

    const where: any = {}

    if (classParam) {
      // Handle both "10" and "10-A" formats
      if (classParam.includes('-')) {
        const [className, section] = classParam.split('-')
        where.student = { 
          class: className,
          section: section
        }
      } else {
        where.student = { class: classParam }
      }
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

    const marks = await prisma.mark.findMany({
      where,
      include: {
        student: {
          select: {
            rollNo: true,
            name: true,
            class: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { student: { rollNo: 'asc' } },
      ],
    })

    const exportData = marks.map((mark) => ({
      rollNo: mark.student.rollNo,
      studentName: mark.student.name,
      class: mark.student.class,
      subjectName: mark.subject.name,
      marks: mark.marks,
      grade: mark.grade,
      term: mark.term,
      academicYear: mark.academicYear,
      remarks: mark.teacherRemarks || '',
    }))

    return NextResponse.json(exportData)
  } catch (error) {
    console.error('Export marks error:', error)
    return NextResponse.json(
      { error: 'Failed to export marks' },
      { status: 500 }
    )
  }
}
