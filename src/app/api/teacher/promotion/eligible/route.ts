import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePercentage, calculateResult } from '@/lib/calculations'

// GET - Fetch eligible students for promotion (for the class teacher's assigned class)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const academicYear = searchParams.get('academicYear')

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year is required' },
        { status: 400 }
      )
    }

    // Check if this teacher is a class teacher
    const classTeacherAssignment = await prisma.classTeacher.findFirst({
      where: {
        teacherId: session.user.id,
      },
    })

    if (!classTeacherAssignment) {
      return NextResponse.json(
        { error: 'You are not assigned as a class teacher' },
        { status: 403 }
      )
    }

    // Fetch students from the assigned class
    const students = await prisma.student.findMany({
      where: {
        class: classTeacherAssignment.class,
        academicYear,
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate marks and determine eligibility
    const studentsWithMarks = students.map((student) => {
      let totalObtained = 0
      let totalMax = 0
      let hasMarks = false

      // Get the latest academic record for this year
      const currentRecord = student.academicRecords.find(
        (record) => record.year === academicYear && record.status === 'published'
      )

      if (currentRecord && currentRecord.subjects.length > 0) {
        hasMarks = true
        currentRecord.subjects.forEach((subject) => {
          totalObtained += subject.marks
          totalMax += subject.maxMarks
        })
      }

      const percentage = totalMax > 0 ? calculatePercentage(totalObtained, totalMax) : 0
      const result = hasMarks ? (percentage >= 45 ? 'PASS' : 'FAIL') : 'NO_MARKS'

      return {
        id: student.id,
        name: student.name,
        regNo: student.regNo,
        class: student.class,
        promotionStatus: student.promotionStatus,
        hasMarks,
        totalObtained,
        totalMax,
        percentage,
        result,
      }
    })

    return NextResponse.json(studentsWithMarks)
  } catch (error) {
    console.error('Error fetching eligible students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible students' },
      { status: 500 }
    )
  }
}
