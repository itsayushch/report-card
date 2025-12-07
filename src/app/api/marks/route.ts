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

    // Fetch all students in the class
    const students = await prisma.student.findMany({
      where: {
        class: classParam,
        academicYear: academicYear,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        academicRecords: true,
      },
    })

    // Extract marks for the specific term and subject
    const marks = students.flatMap(student => {
      const record = student.academicRecords.find(
        rec => rec.term === term && rec.year === academicYear
      )
      
      if (!record) return []
      
      const subjectData = record.subjects.find(sub => sub.subjectCode === subject)
      
      if (!subjectData) return []
      
      return [{
        studentId: student.id,
        subjectId: subject,
        marks: subjectData.marks,
        grade: '', // Grade is calculated on frontend
        teacherRemarks: null,
      }]
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