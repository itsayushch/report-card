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
    const subject = searchParams.get('subject')
    const term = searchParams.get('term')
    const academicYear = searchParams.get('academicYear')

    if (!classParam || !subject || !term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required parameters: class, subject, term, academicYear' },
        { status: 400 }
      )
    }

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        class: classParam,
        academicYear,
        status: 'ACTIVE',
      },
      include: {
        academicRecords: {
          where: {
            academicYear,
            class: classParam,
          },
        },
      },
      orderBy: {
        regNo: 'asc',
      },
    })

    // Extract marks for CSV export
    const csvData = students.map(student => {
      const yearRecord = student.academicRecords[0]
      const termRecord = yearRecord?.terms.find(t => t.name === term)
      const subjectData = termRecord?.subjects.find(s => s.subjectCode === subject)

      return {
        regNo: student.regNo,
        name: student.name,
        class: student.class,
        subject: subject,
        term: term,
        marks: subjectData?.marks || '',
        maxMarks: subjectData?.maxMarks || 100,
        grade: subjectData?.grade || '',
        status: termRecord?.status || 'not_entered',
      }
    })

    return NextResponse.json(csvData)
  } catch (error) {
    console.error('Export marks error:', error)
    return NextResponse.json(
      { error: 'Failed to export marks' },
      { status: 500 }
    )
  }
}
