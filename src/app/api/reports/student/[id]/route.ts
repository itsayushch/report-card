import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateResult } from '@/lib/calculations'
import { getSubjectById, resolveLegacySubjectCode } from '@/lib/subjects'
import { getTermsForClass } from '@/lib/terms'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

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

    // Get student data
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        academicRecords: {
          where: {
            academicYear,
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    

    // Check if student is accessing their own data (if role is STUDENT and session exists)
    if (session && session.user.role === 'STUDENT') {
      // Students log in with regNo, so check against that
      if (session.user.id !== student.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get the academic record bucket for this year
    const yearRecord = student.academicRecords[0]; // Should only be one per year
    const classForYear = yearRecord?.class || student.class;

    // Get publish statuses for each term for the student's class in that academic year
    const publishStatuses = await prisma.reportPublish.findMany({
      where: {
        academicYear,
        class: classForYear,
        isPublished: true,
      },
    })

    // Create a map of published terms
    const publishedTerms = new Set(publishStatuses.map(status => status.term))

    // Check if user is a teacher - they can see unpublished reports
    const isTeacher = session && session.user.role === 'TEACHER'

    // Get terms from the academic record bucket
    const yearTerms = yearRecord?.terms || [];

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

    // Get the correct maxMarks per term from the class config (source of truth)
    const termConfigs = getTermsForClass(classForYear);
    const termMaxMarksMap = new Map(termConfigs.map(t => [t.name, t.maxMarks]));

    terms.forEach(term => {
      const termRecord = yearTerms.find((t: any) => t.name === term);
      const isTermPublished = publishedTerms.has(term);
      // Use the class config maxMarks, not the stored value (stored value may be stale)
      const correctMaxMarks = termMaxMarksMap.get(term) || 100;
      
      // Show data if: no session (direct URL access), OR teacher, OR published (for logged-in students)
      if (termRecord && termRecord.subjects && termRecord.subjects.length > 0 && (!session || isTeacher || isTermPublished)) {
        const choices = {
          secondLanguageSubject: student.secondLanguageSubject,
          thirdLanguageSubject: student.thirdLanguageSubject,
          sixthSubject: student.sixthSubject,
        };
        const subjectMap = new Map<string, { subjectCode: string; marks: number; maxMarks: number; grade: string }>();

        termRecord.subjects.forEach((s: any) => {
          const resolvedCode = resolveLegacySubjectCode(classForYear, s.subjectCode, choices);
          const gradeValue = s.grade !== undefined && s.grade !== null && s.grade !== ''
            ? s.grade
            : calculateGrade((s.marks / correctMaxMarks) * 100);
          const current = subjectMap.get(resolvedCode);
          const prefersCurrent = s.subjectCode === resolvedCode;
          const shouldReplace = !current || prefersCurrent;

          if (shouldReplace) {
            subjectMap.set(resolvedCode, {
              subjectCode: resolvedCode,
              marks: s.marks,
              maxMarks: correctMaxMarks, // Always use term config value
              grade: gradeValue,
            });
          }
        });

        const subjects = Array.from(subjectMap.values());

        // Only include numeric subjects (those without alphabetical grading) in totals
        const totalObtained = subjects.reduce((sum: number, s: any) => {
          const subjectDetail = getSubjectById(classForYear, s.subjectCode);
          if (!subjectDetail || subjectDetail.dataType === 'string') return sum;
          return sum + s.marks;
        }, 0);
        
        const totalMax = subjects.reduce((sum: number, s: any) => {
          const subjectDetail = getSubjectById(classForYear, s.subjectCode);
          if (!subjectDetail || subjectDetail.dataType === 'string') return sum;
          return sum + correctMaxMarks; // Use correct maxMarks from config
        }, 0);
        
        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

        console.log(`[reports] term=${term}, teacherRemarks=${JSON.stringify(termRecord.teacherRemarks)}`);
        termReports[term] = {
          subjects,
          totalObtained,
          totalMax,
          percentage,
          isPublished: isTermPublished,
          teacherRemarks: termRecord.teacherRemarks || null,
        };
      }
    });

    // Calculate overall statistics (no session or teachers see all terms, students see only published)
    let overallObtained = 0;
    let overallMax = 0;

    Object.values(termReports).forEach((termData: any) => {
      if (termData && (!session || isTeacher || termData.isPublished)) {
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
        class: classForYear, // Use the class from that academic year
        secondLanguageSubject: student.secondLanguageSubject,
        thirdLanguageSubject: student.thirdLanguageSubject,
        sixthSubject: student.sixthSubject,
        valueFaithSubject: student.valueFaithSubject,
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
