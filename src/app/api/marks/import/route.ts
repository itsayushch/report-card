import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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
      select: {
        id: true,
        regNo: true,
        class: true,
        section: true,
      }
    })

    const studentMap = new Map(students.map(s => [s.regNo, s]))
    const studentIds = students.map(s => s.id)

    // FETCH ALL RELEVANT ACADEMIC RECORDS IN ONE GO
    const existingRecords = await prisma.academicRecord.findMany({
      where: {
        studentId: { in: studentIds },
        academicYear,
      }
    })

    const recordMap = new Map(existingRecords.map(r => [r.studentId, r]))
    
    let successCount = 0
    let errorCount = 0
    const operations = []

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
      const maxMarksForTerm = termConfig?.maxMarks || 100

      const yearRecord = recordMap.get(student.id)
      const terms = (yearRecord?.terms as any[] || [])
      const termIndex = terms.findIndex(t => t.name === term)

      const updatedTerms = [...terms]
      const newSubjectData = {
        subjectCode: subject,
        marks: typeof row.marks === 'number' ? row.marks : 0,
        maxMarks: maxMarksForTerm,
        grade: row.grade || undefined,
      }

      if (termIndex >= 0) {
        // Update existing term
        const existingTerm = terms[termIndex]
        const otherSubjects = (existingTerm.subjects || []).filter((s: any) => s.subjectCode !== subject)
        updatedTerms[termIndex] = {
          ...existingTerm,
          subjects: [...otherSubjects, newSubjectData],
          enteredBy: session.user.id,
          enteredAt: new Date(),
        }
      } else {
        // Add new term
        updatedTerms.push({
          name: term,
          subjects: [newSubjectData],
          enteredBy: session.user.id,
          enteredAt: new Date(),
          published: false,
        })
      }

      if (yearRecord) {
        // Queue Update
        operations.push(
          prisma.academicRecord.update({
            where: { id: yearRecord.id },
            data: { terms: updatedTerms }
          })
        )
      } else {
        // Queue Create
        operations.push(
          prisma.academicRecord.create({
            data: {
              studentId: student.id,
              academicYear,
              class: student.class,
              section: student.section || null,
              terms: updatedTerms,
            }
          })
        )
      }
      
      successCount++
    }

    // Execute all updates in a single transaction if possible, or in batches
    // For large datasets, Prisma transaction is safer on MongoDB
    if (operations.length > 0) {
      await prisma.$transaction(operations)
    }

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
