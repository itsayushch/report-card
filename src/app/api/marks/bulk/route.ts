import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGrade } from '@/lib/calculations'
import { getSubjectById } from '@/lib/subjects'
import { getTermsForClass } from '@/lib/terms'

interface MarkEntry {
  studentId: string
  subjectId: string
  marks: number | string
  grade: string
  term: string
  academicYear: string
  teacherRemarks?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher ID
    const teacher = await prisma.teacher.findUnique({
      where: {
        email: session.user.email!,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    const body = await request.json()
    const { marks } = body as { marks: MarkEntry[] }

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid marks data' },
        { status: 400 }
      )
    }

    // Process marks for each student
    const results = await Promise.all(
      marks.map(async (markEntry) => {
        const { studentId, subjectId, marks: markValue, term, academicYear, teacherRemarks, grade } = markEntry

        // Skip empty marks
        if (markValue === '' || markValue === null || markValue === undefined) {
          return null
        }

        // Get student with their class
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          select: { id: true, class: true, academicRecords: true },
        })

        if (!student) {
          throw new Error(`Student not found: ${studentId}`)
        }

        // Get subject details to check if it's numeric or alphabetic
        const subjectDetail = getSubjectById(student.class, subjectId)
        
        if (!subjectDetail) {
          throw new Error(`Subject not found: ${subjectId}`)
        }

        const isNumeric = subjectDetail.dataType === 'number'
        
        // Validate marks for numeric subjects
        if (isNumeric) {
          const numericMarks = typeof markValue === 'number' ? markValue : parseFloat(markValue as string)
          
          if (isNaN(numericMarks)) {
            return null
          }

          // Get max marks from term configuration
          const terms = getTermsForClass(student.class)
          const currentTerm = terms.find(t => t.name === term)
          const maxMarks = currentTerm?.maxMarks || 100

          if (numericMarks < 0 || numericMarks > maxMarks) {
            throw new Error(
              `Invalid marks for subject ${subjectDetail.name}: ${numericMarks}. Must be between 0 and ${maxMarks}`
            )
          }
        }

        // Find existing academic record for this term
        const existingRecordIndex = student.academicRecords.findIndex(
          (record: any) => record.term === term && record.year === academicYear
        )

        let updatedRecords = [...student.academicRecords]

        if (existingRecordIndex >= 0) {
          // Update existing record
          const existingRecord = updatedRecords[existingRecordIndex]
          const existingSubjectIndex = existingRecord.subjects.findIndex(
            (sub: any) => sub.subjectCode === subjectId
          )

          // Get max marks from term configuration
          const terms = getTermsForClass(student.class)
          const currentTerm = terms.find(t => t.name === term)
          const maxMarks = currentTerm?.maxMarks || 100

          if (existingSubjectIndex >= 0) {
            // Update existing subject
            existingRecord.subjects[existingSubjectIndex] = {
              subjectCode: subjectId,
              marks: isNumeric ? (typeof markValue === 'number' ? markValue : parseFloat(markValue as string)) : 0,
              maxMarks: maxMarks,
              grade: isNumeric ? undefined : (grade || String(markValue)),
            }
          } else {
            // Add new subject to existing record
            existingRecord.subjects.push({
              subjectCode: subjectId,
              marks: isNumeric ? (typeof markValue === 'number' ? markValue : parseFloat(markValue as string)) : 0,
              maxMarks: maxMarks,
              grade: isNumeric ? undefined : (grade || String(markValue)),
            })
          }

          updatedRecords[existingRecordIndex] = {
            ...existingRecord,
            enteredBy: teacher.id,
            enteredAt: new Date(),
          }
        } else {
          // Get max marks from term configuration
          const terms = getTermsForClass(student.class)
          const currentTerm = terms.find(t => t.name === term)
          const maxMarks = currentTerm?.maxMarks || 100

          // Create new record
          updatedRecords.push({
            year: academicYear,
            class: student.class,
            term,
            subjects: [{
              subjectCode: subjectId,
              marks: isNumeric ? (typeof markValue === 'number' ? markValue : parseFloat(markValue as string)) : 0,
              maxMarks: maxMarks,
              grade: isNumeric ? undefined : (grade || String(markValue)),
            }],
            enteredBy: teacher.id,
            enteredAt: new Date(),
            status: 'published',
          })
        }

        // Update student with new academic records
        return await prisma.student.update({
          where: { id: studentId },
          data: {
            academicRecords: updatedRecords,
          },
        })
      })
    )

    const successCount = results.filter(r => r !== null).length

    return NextResponse.json({
      success: true,
      message: `${successCount} marks saved successfully`,
      count: successCount,
    })
  } catch (error: any) {
    console.error('Bulk marks error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save marks' },
      { status: 500 }
    )
  }
}
