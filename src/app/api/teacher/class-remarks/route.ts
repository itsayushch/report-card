import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
type StudentRow = {
  id: string
  class: string
  section?: string | null
}

type AcademicRecordRow = {
  id: string
  studentId: string
  terms: unknown
}

type TermRecord = {
  name: string
  subjects: Array<{
    subjectCode: string
    marks: number
    maxMarks: number
    grade?: string
  }>
  enteredBy: string
  enteredAt: Date
  published: boolean
  teacherRemarks?: string | null
}

type RemarkEntry = {
  studentId: string
  remarks?: string
  term: string
  academicYear: string
}

// GET - Fetch remarks for a class and term
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classParam = searchParams.get('class')
    const term = searchParams.get('term')
    const academicYear = searchParams.get('academicYear')

    if (!classParam || !term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify that the teacher is a class teacher for this class
    const classTeacherAssignment = await prisma.classTeacher.findFirst({
      where: {
        teacherId: session.user.id,
        class: classParam,
      },
    })

    if (!classTeacherAssignment) {
      return NextResponse.json(
        { error: 'You are not the class teacher for this class' },
        { status: 403 }
      )
    }

    // Prevent remarks entry for Final Term
    if (term === 'Final Term') {
      return NextResponse.json(
        { error: 'Remarks cannot be entered for Final Term' },
        { status: 400 }
      )
    }

    const students = await prisma.student.findMany({
      where: {
        class: classParam,
        ...(classTeacherAssignment.section ? { section: classTeacherAssignment.section } : {}),
        academicYear,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    })

    // Get academic records for the teacher's students.
    const academicRecords: AcademicRecordRow[] = await prisma.academicRecord.findMany({
      where: {
        studentId: { in: students.map((student) => student.id) },
        academicYear,
      },
    })

    // Extract remarks and marks for the specified term
    const studentsData = academicRecords
      .map((record: AcademicRecordRow) => {
        const terms = record.terms as TermRecord[]
        const termRecord = terms.find((t) => t.name === term)
        if (!termRecord) return null

        return {
          studentId: record.studentId,
          remarks: termRecord.teacherRemarks || null,
          subjects: termRecord.subjects.map((subject) => ({
            subjectCode: subject.subjectCode,
            marks: subject.marks,
            maxMarks: subject.maxMarks,
            grade: subject.grade,
          })),
        }
      })
      .filter(Boolean)

    return NextResponse.json(studentsData)
  } catch (error) {
    console.error('Get remarks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch remarks' },
      { status: 500 }
    )
  }
}

// POST - Save remarks for students
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { remarks } = body as { remarks?: RemarkEntry[] }

    console.log('Received remarks:', remarks?.length || 0, 'entries')

    if (!remarks || !Array.isArray(remarks) || remarks.length === 0) {
      return NextResponse.json(
        { error: 'Invalid remarks data' },
        { status: 400 }
      )
    }

    // Get term and academicYear from first entry (all should be the same)
    const { term, academicYear } = remarks[0]

    if (!term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Saving remarks for term:', term, 'year:', academicYear)

    // Prevent remarks entry for Final Term
    if (term === 'Final Term') {
      return NextResponse.json(
        { error: 'Remarks cannot be entered for Final Term' },
        { status: 400 }
      )
    }

    // Get the student's class from the first student
    const firstStudent = await prisma.student.findUnique({
      where: { id: remarks[0].studentId },
      select: { class: true, section: true },
    })

    if (!firstStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Verify that the teacher is a class teacher for this class
    const classTeacherAssignment = await prisma.classTeacher.findFirst({
      where: {
        teacherId: session.user.id,
        class: firstStudent.class,
        OR: [
          { section: firstStudent.section || null },
          { section: null },
        ],
      },
    })

    if (!classTeacherAssignment) {
      return NextResponse.json(
        { error: 'You are not the class teacher for this class' },
        { status: 403 }
      )
    }

    let successCount = 0
    let errorCount = 0

    const remarkEntries = remarks.filter(
      (entry): entry is RemarkEntry => !!entry?.studentId
    )

    const studentIds = Array.from(
      new Set(remarkEntries.map((entry) => entry.studentId))
    )

    const [students, academicRecords] = await Promise.all([
      prisma.student.findMany({
        where: {
          id: { in: studentIds },
          class: classTeacherAssignment.class,
          ...(classTeacherAssignment.section ? { section: classTeacherAssignment.section } : {}),
        },
        select: { id: true, class: true, section: true },
      }) as Promise<StudentRow[]>,
      prisma.academicRecord.findMany({
        where: {
          studentId: { in: studentIds },
          academicYear,
        },
      }) as Promise<AcademicRecordRow[]>,
    ])

    const studentMap = new Map(
      students.map((student: StudentRow) => [student.id, student])
    )
    const recordMap = new Map<string, AcademicRecordRow>(
      academicRecords.map((record: AcademicRecordRow) => [record.studentId, record])
    )

    const results = await Promise.all(
      remarkEntries.map(async (remarkEntry) => {
        try {
          const { studentId } = remarkEntry
          const remarkText = remarkEntry.remarks?.trim() || null
          const student = studentMap.get(studentId)

          if (!student) {
            return { success: false, error: 'Student not found' }
          }

          let academicRecord: AcademicRecordRow | undefined = recordMap.get(studentId)

          if (!academicRecord) {
            const createdRecord = await prisma.academicRecord.create({
              data: {
                studentId,
                academicYear,
                class: student.class,
                section: student.section || null,
                terms: [],
              },
            })
            academicRecord = createdRecord
            recordMap.set(studentId, createdRecord)
          }

          if (!academicRecord) {
            return { success: false, error: 'Academic record not found' }
          }

          const terms = academicRecord.terms as TermRecord[]
          const termIndex = terms.findIndex((t) => t.name === term)

          if (termIndex === -1) {
            return { success: false, error: 'Term not found' }
          }

          const updatedTerms = terms.map((t, i) => {
            if (i !== termIndex) return t
            return {
              name: t.name,
              subjects: t.subjects,
              enteredBy: t.enteredBy,
              enteredAt: t.enteredAt,
              published: t.published,
              teacherRemarks: remarkText,
            }
          })

          console.log(`[save-remarks] studentId=${studentId}, term=${term}, remarkText=${remarkText}`)

          await prisma.academicRecord.update({
            where: { id: academicRecord.id },
            data: {
              terms: updatedTerms,
            },
          })

          return { success: true }
        } catch (error) {
          console.error(
            `Error updating remarks for student ${remarkEntry.studentId}:`,
            error
          )
          return { success: false, error: 'Update failed' }
        }
      })
    )

    successCount = results.filter((result) => result.success).length
    errorCount = results.length - successCount

    console.log('Remarks update complete:', { successCount, errorCount })

    return NextResponse.json({
      message: `Successfully updated remarks for ${successCount} student(s)`,
      success: successCount,
      failed: errorCount,
    })
  } catch (error) {
    console.error('Save remarks error:', error)
    return NextResponse.json(
      { error: 'Failed to save remarks' },
      { status: 500 }
    )
  }
}
