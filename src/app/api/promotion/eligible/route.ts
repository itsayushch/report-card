import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const classParam = searchParams.get('class')
    const academicYear = searchParams.get('academicYear')

    if (!classParam || !academicYear) {
      return NextResponse.json(
        { error: 'Class and academic year are required' },
        { status: 400 }
      )
    }

    // Fetch students with their academic records
    const students = await prisma.student.findMany({
      where: {
        class: classParam,
        academicYear,
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

    // Calculate totals and percentages from Final Term
    const studentsWithResults = students.map((student) => {
      const yearRecord = student.academicRecords[0]
      const finalTerm = yearRecord?.terms.find((t: any) => t.name === 'Final Term')

      if (!finalTerm || !finalTerm.subjects || finalTerm.subjects.length === 0) {
        return {
          id: student.id,
          name: student.name,
          regNo: student.regNo,
          class: student.class,
          promotionStatus: student.promotionStatus,
          hasMarks: false,
          totalObtained: 0,
          totalMax: 0,
          percentage: 0,
          result: 'NO_MARKS',
        }
      }

      const totalObtained = finalTerm.subjects.reduce(
        (sum: number, subject: any) => sum + (subject.marks || 0),
        0
      )
      const totalMax = finalTerm.subjects.reduce(
        (sum: number, subject: any) => sum + (subject.maxMarks || 0),
        0
      )
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0

      // Determine pass/fail (assuming 33% is passing)
      const result = percentage >= 33 ? 'PASS' : 'FAIL'

      return {
        id: student.id,
        name: student.name,
        regNo: student.regNo,
        class: student.class,
        promotionStatus: student.promotionStatus,
        hasMarks: true,
        totalObtained,
        totalMax,
        percentage: parseFloat(percentage.toFixed(2)),
        result,
      }
    })

    return NextResponse.json(studentsWithResults)
  } catch (error: any) {
    console.error('Fetch eligible students error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch eligible students' },
      { status: 500 }
    )
  }
}
