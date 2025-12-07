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
    const academicYear = searchParams.get('academicYear')
    
    // Await params in Next.js 15
    const { id } = await params

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year is required' },
        { status: 400 }
      )
    }

    // Get student data with academic records
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    

    // Check if student is accessing their own data (if role is STUDENT)
    if (session.user.role === 'STUDENT') {
      // Students log in with regNo, so check against that
      if (session.user.id !== student.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get publish statuses for each term for the student's class
    const publishStatuses = await prisma.reportPublish.findMany({
      where: {
        academicYear,
        class: student.class,
        isPublished: true,
      },
    })

    // Create a map of published terms
    const publishedTerms = new Set(publishStatuses.map(status => status.term))

    // Process academic records for the specified year
    const yearRecords = student.academicRecords?.filter(
      (record: any) => record.year === academicYear && record.class === student.class
    ) || []

    // Helper to calculate grade based on percentage
    const calculateGrade = (percentage: number): string => {
      if (percentage >= 91) return 'A+';
      if (percentage >= 81) return 'A';
      if (percentage >= 71) return 'B+';
      if (percentage >= 61) return 'B';
      if (percentage >= 51) return 'C+';
      if (percentage >= 41) return 'C';
      if (percentage >= 33) return 'D';
      if (percentage >= 21) return 'E';
      return 'F';
    };

    // Build term reports
    const termReports: any = {};
    const terms = ['1st Unit Test', 'Mid Term', '2nd Unit Test', 'Final Term'];

    terms.forEach(term => {
      const termRecord = yearRecords.find((r: any) => r.term === term);
      const isTermPublished = publishedTerms.has(term);
      
      if (termRecord && termRecord.subjects && termRecord.subjects.length > 0 && isTermPublished) {
        const subjects = termRecord.subjects.map((s: any) => ({
          subjectCode: s.subjectCode,
          marks: s.marks,
          maxMarks: s.maxMarks,
          grade: calculateGrade((s.marks / s.maxMarks) * 100),
        }));

        const totalObtained = termRecord.subjects.reduce((sum: number, s: any) => sum + s.marks, 0);
        const totalMax = termRecord.subjects.reduce((sum: number, s: any) => sum + s.maxMarks, 0);
        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

        termReports[term] = {
          subjects,
          totalObtained,
          totalMax,
          percentage,
          isPublished: true,
        };
      } else if (termRecord && termRecord.subjects && termRecord.subjects.length > 0) {
        // Term has data but is not published
        termReports[term] = {
          subjects: [],
          totalObtained: 0,
          totalMax: 0,
          percentage: 0,
          isPublished: false,
        };
      }
    });

    // Calculate overall statistics (only from published terms)
    let overallObtained = 0;
    let overallMax = 0;

    Object.values(termReports).forEach((termData: any) => {
      if (termData && termData.isPublished) {
        overallObtained += termData.totalObtained;
        overallMax += termData.totalMax;
      }
    });

    const overallPercentage = overallMax > 0 ? (overallObtained / overallMax) * 100 : 0;
    const overallGrade = calculateGrade(overallPercentage);
    const result = overallPercentage >= 33 ? 'PASS' : 'FAIL';

    return NextResponse.json({
      student: {
        name: student.name,
        regNo: student.regNo,
        class: student.class,
      },
      academicYear,
      termReports,
      overallPercentage,
      overallGrade,
      result,
      promotionStatus: student.promotionStatus,
      publishedTerms: Array.from(publishedTerms),
    })
  } catch (error) {
    console.error('Get student report error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report card' },
      { status: 500 }
    )
  }
}
