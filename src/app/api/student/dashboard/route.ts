import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStudentYearRecords } from '@/lib/academic-records'
import { calculateGrade } from '@/lib/calculations'
import { getSubjectById, resolveLegacySubjectCode } from '@/lib/subjects'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student data and active academic year in parallel
    const [student, activeYear] = await Promise.all([
      prisma.student.findUnique({
        where: { regNo: session.user.email! }, // session.user.email contains regNo for students
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
      }),
    ])

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!activeYear) {
      return NextResponse.json({
        student,
        activeYear: null,
        latestTermSummary: null,
      })
    }

    // Check for any published report for this student
    const publishStatus = await prisma.reportPublish.findFirst({
      where: {
        class: student.class,
        OR: [
          { section: student.section || null },
          { section: null },
          { section: { isSet: false } },
        ],
        academicYear: activeYear.year,
        isPublished: true,
      },
      orderBy: {
        createdAt: 'asc', // Get the earliest published report
      },
    })


    let latestTermSummary = null

    // Calculate from academic records using new bucket structure
    if (publishStatus) {
      const yearRecord = await getStudentYearRecords(student.id, activeYear.year)
      
      if (yearRecord) {
        const publishedTerm = yearRecord.terms.find(
          t => t.name === publishStatus.term && t.published === true
        )
        
        if (publishedTerm && publishedTerm.subjects.length > 0) {
          // Filter out alphabetical grading subjects from totals
          let totalObtained = 0
          let totalMax = 0
          
          publishedTerm.subjects.forEach(subject => {
            const resolvedCode = resolveLegacySubjectCode(student.class, subject.subjectCode, {
              secondLanguageSubject: student.secondLanguageSubject,
              thirdLanguageSubject: student.thirdLanguageSubject,
              sixthSubject: student.sixthSubject,
            })
            const subjectDetail = getSubjectById(student.class, resolvedCode)
            
            // Only include numeric subjects in total
            if (subjectDetail && subjectDetail.dataType !== 'string') {
              totalObtained += subject.marks
              totalMax += subject.maxMarks
            }
          })
          
          const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
          const grade = calculateGrade(percentage)
          const result = percentage >= 33 ? 'PASS' : 'FAIL'
          
          latestTermSummary = {
            term: publishStatus.term,
            totalSubjects: publishedTerm.subjects.length,
            totalObtained,
            totalMax,
            percentage,
            grade,
            result,
          }
        }
      }
    }

    return NextResponse.json({
      student,
      activeYear,
      latestTermSummary,
      isPublished: !!publishStatus,
    })
  } catch (error) {
    console.error('Student dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student dashboard data' },
      { status: 500 }
    )
  }
}
