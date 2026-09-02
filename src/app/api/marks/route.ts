import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getClassSubjectMarks } from '@/lib/academic-records'

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
    const section = searchParams.get('section')

    if (!classParam || !subject || !term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required parameters: class, subject, term, academicYear' },
        { status: 400 }
      )
    }

    // Use the new helper function to get marks
    const marksData = await getClassSubjectMarks(
      classParam,
      academicYear,
      term,
      subject,
      section
    )

    // Transform to match expected format
    const marks = marksData.map(data => ({
      studentId: data?.studentId || '',
      subjectId: subject,
      marks: data?.marks ?? 0,
      grade: data?.grade || '',
      isAbsent: data?.grade === 'AB',
      teacherRemarks: null,
    }))

    return NextResponse.json(marks)
  } catch (error) {
    console.error('Get marks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marks' },
      { status: 500 }
    )
  }
}