import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePercentage, calculateResult } from '@/lib/calculations'
import { getSubjectsForClass, getSubjectById } from '@/lib/subjects'

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
      include: {
        academicRecords: {
          where: {
            academicYear,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate marks and determine eligibility based on average of all 4 terms
    const studentsWithMarks = students.map((student) => {
      let totalAveragePercentage = 0
      let numericSubjectCount = 0
      let hasMarks = false

      // Get the academic record bucket for this year
      const yearRecord = student.academicRecords[0] // Should only be one per year

      if (yearRecord) {
        // Get all unique subjects across all terms AND from class definition
        const allSubjects = new Set<string>()
        const allTerms = ['1st Unit Test', 'Mid Term', '2nd Unit Test', 'Final Term']
        
        // Add subjects from terms that have marks
        allTerms.forEach(termName => {
          const term = yearRecord.terms.find((t) => t.name === termName)
          if (term) {
            term.subjects.forEach((subject) => {
              allSubjects.add(subject.subjectCode)
            })
          }
        })

        // Also add all subjects from class definition (to show subjects with no marks)
        const classSubjects = getSubjectsForClass(student.class)
        classSubjects.forEach((subject) => {
          allSubjects.add(subject.id)
        })

        // For each subject, calculate average percentage across all terms
        allSubjects.forEach(subjectCode => {
          let subjectTotalObtained = 0
          let subjectTotalMax = 0
          let isAlphabetical = false
          let hasSubjectMarks = false

          // Check if this subject is alphabetical from definition
          const subjectDetail = getSubjectById(student.class, subjectCode)
          if (subjectDetail?.dataType === 'string') {
            isAlphabetical = true
          }

          if (!isAlphabetical) {
            allTerms.forEach(termName => {
              const term = yearRecord.terms.find((t) => t.name === termName)
              if (term) {
                const subject = term.subjects.find((s) => s.subjectCode === subjectCode)
                if (subject) {
                  subjectTotalObtained += subject.marks
                  subjectTotalMax += subject.maxMarks
                  hasMarks = true
                  hasSubjectMarks = true
                }
              }
            })

            // Calculate average percentage for this subject
            if (subjectTotalMax > 0) {
              const subjectAveragePercentage = (subjectTotalObtained / subjectTotalMax) * 100
              totalAveragePercentage += subjectAveragePercentage
              numericSubjectCount++
            }
          }
        })
      }

      // Total marks out of (numericSubjectCount * 100)
      const totalObtained = Math.round(totalAveragePercentage)
      const totalMax = numericSubjectCount * 100
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
