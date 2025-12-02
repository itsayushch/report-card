import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateResult } from '@/lib/calculations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const academicYear = searchParams.get('academicYear')
    
    // Await params in Next.js 15
    const { id } = await params

    if (!term || !academicYear) {
      return NextResponse.json(
        { error: 'Term and academic year are required' },
        { status: 400 }
      )
    }

    // Get student data and publish status in parallel
    const [student, publishStatus] = await Promise.all([
      prisma.student.findUnique({
        where: { id },
      }),
      prisma.reportPublish.findFirst({
        where: {
          term,
          academicYear,
          isPublished: true,
        },
      }),
    ])

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    

    // Check if student is accessing their own data (if role is STUDENT)
    if (session.user.role === 'STUDENT') {
      if (session.user.email !== student.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Verify publish status matches student's class
    const isPublishedForStudent = publishStatus && 
      publishStatus.class === student.class
    

    if (!isPublishedForStudent && session.user.role === 'STUDENT') {
      return NextResponse.json(
        {
          error: 'Report card not published yet',
          isPublished: false,
        },
        { status: 403 }
      )
    }

    // Get marks
    const marks = await prisma.mark.findMany({
      where: {
        studentId: id,
        term,
        academicYear,
      },
      include: {
        subject: true,
      },
      orderBy: {
        subject: {
          name: 'asc',
        },
      },
    })

    // Calculate summary - map to format expected by calculateResult
    const formattedMarks = marks.map(m => ({
      marks: m.marks,
      subjectId: m.subject.id,
    }))
    const subjects = marks.map((m) => m.subject)
    const summary = calculateResult(formattedMarks, subjects)

    return NextResponse.json({
      student: {
        name: student.name,
        rollNo: student.rollNo,
        class: student.class,
      },
      academicYear,
      term,
      marks: marks.map((m) => ({
        subject: m.subject.name,
        maxMarks: m.subject.maxMarks,
        obtainedMarks: m.marks,
        grade: m.grade,
        remarks: m.teacherRemarks || '',
      })),
      summary,
      promotionStatus: student.promotionStatus,
      isPublished: !!publishStatus,
    })
  } catch (error) {
    console.error('Get student report error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report card' },
      { status: 500 }
    )
  }
}
