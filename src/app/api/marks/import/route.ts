import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { upsertTermMarks } from '@/lib/academic-records'
import { prisma } from '@/lib/prisma'
import { getTermsForClass } from '@/lib/terms'

interface ImportRow {
  regNo: string
  marks: number | string
  grade?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { data, classParam, subject, term, academicYear } = body

    if (!data || !Array.isArray(data) || !classParam || !subject || !term || !academicYear) {
      return NextResponse.json(
        { error: 'Invalid import data or missing parameters' },
        { status: 400 }
      )
    }

    // Get all students by regNo
    const regNos = data.map((row: ImportRow) => row.regNo)
    const students = await prisma.student.findMany({
      where: {
        regNo: { in: regNos },
        class: classParam,
        academicYear,
      },
    })

    const studentMap = new Map(students.map(s => [s.regNo, s]))
    const updates = []
    let successCount = 0
    let errorCount = 0

    for (const row of data as ImportRow[]) {
      const student = studentMap.get(row.regNo)
      
      if (!student) {
        console.warn(`Student not found: ${row.regNo}`)
        errorCount++
        continue
      }

      // Get the correct maxMarks for this term and class
      const termsForClass = getTermsForClass(student.class)
      const termConfig = termsForClass.find(t => t.name === term)
      const maxMarksForTerm = termConfig?.maxMarks || 100 // Fallback to 100 if not found

      try {
        // Get existing term data or create new
        const yearRecord = await prisma.academicRecord.findUnique({
          where: {
            studentId_academicYear: {
              studentId: student.id,
              academicYear,
            },
          },
        })

        // Build subjects array with imported marks
        const existingTerm = yearRecord?.terms.find(t => t.name === term)
        const existingSubjects = existingTerm?.subjects || []
        
        // Update or add the subject - convert existing subjects to proper type
        const updatedSubjects = existingSubjects
          .filter(s => s.subjectCode !== subject)
          .map(s => ({
            subjectCode: s.subjectCode,
            marks: s.marks,
            maxMarks: s.maxMarks,
            grade: s.grade || undefined,
          }))
        
        updatedSubjects.push({
          subjectCode: subject,
          marks: typeof row.marks === 'number' ? row.marks : 0,
          maxMarks: maxMarksForTerm, // Use correct maxMarks from term definition
          grade: row.grade || undefined,
        })

        updates.push(
          upsertTermMarks(
            student.id,
            academicYear,
            student.class,
            term,
            updatedSubjects,
            session.user.id
          )
        )
        
        successCount++
      } catch (error) {
        console.error(`Error importing marks for ${row.regNo}:`, error)
        errorCount++
      }
    }

    // Execute all updates
    await Promise.all(updates)

    return NextResponse.json({
      message: `Import completed. Success: ${successCount}, Errors: ${errorCount}`,
      successCount,
      errorCount,
    })
  } catch (error) {
    console.error('Import marks error:', error)
    return NextResponse.json(
      { error: 'Failed to import marks' },
      { status: 500 }
    )
  }
}
