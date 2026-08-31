import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatClassSection } from '@/lib/class-utils'
import { getTermsForClass } from '@/lib/terms'
import { getSubjectById, getSubjectsForClassWithChoices, resolveLegacySubjectCode } from '@/lib/subjects'
import ExcelJS from 'exceljs'

const getTermSubjectMap = (
  classValue: string,
  termSubjects: Array<{ subjectCode: string; marks: number; maxMarks: number; grade?: string | null }>,
  choices: { secondLanguageSubject?: string | null; thirdLanguageSubject?: string | null; sixthSubject?: string | null }
) => {
  const map = new Map<string, { marks: number; maxMarks: number; grade?: string | null }>()

  termSubjects.forEach((subject) => {
    const resolvedCode = resolveLegacySubjectCode(classValue, subject.subjectCode, choices)
    const existing = map.get(resolvedCode)
    const prefersCurrent = subject.subjectCode === resolvedCode

    if (!existing || prefersCurrent) {
      map.set(resolvedCode, subject)
    }
  })

  return map
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const academicYearParam = searchParams.get('academicYear')

    const [classTeacherAssignment, activeYear] = await Promise.all([
      prisma.classTeacher.findFirst({
        where: {
          teacherId: session.user.id,
        },
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
      }),
    ])

    if (!classTeacherAssignment) {
      return NextResponse.json({ error: 'You are not assigned as a class teacher' }, { status: 403 })
    }

    const academicYear = academicYearParam || activeYear?.year

    if (!academicYear) {
      return NextResponse.json({ error: 'Academic year is required' }, { status: 400 })
    }

    const classValue = classTeacherAssignment.class
    const sectionValue = classTeacherAssignment.section

    const students = await prisma.student.findMany({
      where: {
        class: classValue,
        ...(sectionValue ? { section: sectionValue } : {}),
        academicYear,
        status: 'ACTIVE',
      },
      include: {
        academicRecords: {
          where: { academicYear },
        },
      },
      orderBy: {
        regNo: 'asc',
      },
    })

    const classTerms = getTermsForClass(classValue)
    const terms = classTerms.length > 0
      ? classTerms
      : [
          { name: '1st Unit Test', maxMarks: 50 },
          { name: 'Mid Term', maxMarks: 50 },
          { name: '2nd Unit Test', maxMarks: 50 },
          { name: 'Final Term', maxMarks: 50 },
        ]

    const headers = [
      'S.No',
      'Reg No',
      'Name',
      'Subject',
      ...terms.map((term) => `${term.name} (${term.maxMarks})`),
      'Total',
      'Average (100)',
    ]

    const rows: Array<Array<string | number>> = []
    const studentRowGroups: Array<{ serial: string; regNo: string; name: string; rowCount: number }> = []
    let serialNo = 1

    students.forEach((student) => {
      const choices = {
        secondLanguageSubject: student.secondLanguageSubject,
        thirdLanguageSubject: student.thirdLanguageSubject,
        sixthSubject: student.sixthSubject,
      }

      const subjects = getSubjectsForClassWithChoices(student.class, {
        ...choices,
        valueFaithSubject: student.valueFaithSubject,
      })

      const yearRecord = student.academicRecords[0]
      const termMaps = new Map<string, Map<string, { marks: number; maxMarks: number; grade?: string | null }>>()

      terms.forEach((term) => {
        const termRecord = yearRecord?.terms.find((t) => t.name === term.name)
        const termSubjects = termRecord?.subjects || []
        termMaps.set(term.name, getTermSubjectMap(student.class, termSubjects, choices))
      })

      const numericSubjects = subjects.filter((subject) => {
        const subjectDetail = getSubjectById(student.class, subject.id)
        return subjectDetail?.dataType !== 'string'
      })
      const numericSubjectCount = numericSubjects.length
      const studentTermTotals = new Map<string, number>()
      const studentTermHasData = new Map<string, boolean>()

      const studentRowStartIndex = rows.length

      subjects.forEach((subject) => {
        const subjectDetail = getSubjectById(student.class, subject.id)
        const isAlphabetical = subjectDetail?.dataType === 'string'
        const row: Array<string | number> = [
          serialNo,
          student.regNo,
          student.name,
          subject.name,
        ]

        let subjectTotal = 0
        let subjectMaxTotal = 0

        terms.forEach((term) => {
          const termMap = termMaps.get(term.name)
          const mark = termMap?.get(subject.id)
          const currentTotal = studentTermTotals.get(term.name) || 0

          if (!mark) {
            row.push('')
            return
          }

          if (mark.grade === 'AB') {
            studentTermHasData.set(term.name, true)
            row.push('AB')
            return
          }

          if (subjectDetail?.dataType === 'string' && mark.grade) {
            row.push(mark.grade)
            return
          }

          row.push(mark.marks)
          subjectTotal += mark.marks
          subjectMaxTotal += term.maxMarks
          studentTermTotals.set(term.name, currentTotal + mark.marks)
          studentTermHasData.set(term.name, true)
        })

        if (isAlphabetical) {
          row.push('')
          row.push('')
        } else {
          const totalValue = subjectMaxTotal > 0 ? subjectTotal : 0
          const averageValue = subjectMaxTotal > 0 ? (subjectTotal / subjectMaxTotal) * 100 : 0
          row.push(subjectMaxTotal > 0 ? Number(totalValue.toFixed(0)) : '')
          row.push(subjectMaxTotal > 0 ? Number(averageValue.toFixed(1)) : '')
        }

        rows.push(row)
      })

      if (numericSubjectCount > 0) {
        const totalsRow: Array<string | number> = [
          serialNo,
          student.regNo,
          student.name,
          'TOTAL',
        ]

        let studentTotal = 0
        let studentMaxTotal = 0

        terms.forEach((term) => {
          const termTotal = studentTermTotals.get(term.name) || 0
          const termMaxTotal = numericSubjectCount * term.maxMarks
          const hasTermData = studentTermHasData.get(term.name) || false
          totalsRow.push(hasTermData ? Number(termTotal.toFixed(0)) : '')
          studentTotal += termTotal
          if (hasTermData) {
            studentMaxTotal += termMaxTotal
          }
        })

        const studentAverage = studentMaxTotal > 0 ? (studentTotal / studentMaxTotal) * 100 : 0
        totalsRow.push(studentMaxTotal > 0 ? Number(studentTotal.toFixed(0)) : '')
        totalsRow.push(studentMaxTotal > 0 ? Number(studentAverage.toFixed(1)) : '')
        rows.push(totalsRow)
      }

      const studentRowCount = rows.length - studentRowStartIndex
      studentRowGroups.push({
        serial: serialNo.toString(),
        regNo: student.regNo,
        name: student.name,
        rowCount: studentRowCount,
      })

      serialNo += 1
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Marks Sheet')

    const headerRow = worksheet.addRow([formatClassSection(classValue, sectionValue), '', '', '', `Year: ${academicYear}`])
    worksheet.mergeCells('A1:D1')
    worksheet.mergeCells('E1:H1')
    worksheet.addRow([])
    const columnHeaderRow = worksheet.addRow(headers)

    rows.forEach((row) => {
      worksheet.addRow(row)
    })

    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
    columnHeaderRow.font = { bold: true }
    columnHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' }

    worksheet.columns = headers.map((header, index) => ({
      key: `col_${index}`,
      width: Math.max(header.length + 4, 12),
    }))

    worksheet.getColumn(3).width = 26
    worksheet.getColumn(4).width = 26

    const firstMarksColumn = 5
    const lastMarksColumn = 4 + terms.length + 2

    for (let col = firstMarksColumn; col <= lastMarksColumn; col += 1) {
      const column = worksheet.getColumn(col)
      column.alignment = { vertical: 'middle', horizontal: 'center' }
      if (col === lastMarksColumn) {
        column.numFmt = '0.00'
      }
    }

    worksheet.views = [{ state: 'frozen', ySplit: 3 }]

    const studentGroupRanges: Array<{ startRow: number; endRow: number }> = []
    let currentRow = 4
    studentRowGroups.forEach((group) => {
      if (group.rowCount > 1) {
        const endRow = currentRow + group.rowCount - 1
        worksheet.mergeCells(currentRow, 1, endRow, 1)
        worksheet.mergeCells(currentRow, 2, endRow, 2)
        worksheet.mergeCells(currentRow, 3, endRow, 3)
        ;[1, 2, 3].forEach((col) => {
          const cell = worksheet.getCell(currentRow, col)
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        })
      }
      studentGroupRanges.push({ startRow: currentRow, endRow: currentRow + group.rowCount - 1 })
      currentRow += group.rowCount
    })

    const totalColumns = headers.length

    const headerRowIndex = 3
    const columnHeaderRowRef = worksheet.getRow(headerRowIndex)
    columnHeaderRowRef.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })

    studentGroupRanges.forEach((range) => {
      for (let rowIndex = range.startRow; rowIndex <= range.endRow; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex)
        const subjectCell = row.getCell(4)
        const isTotalRow = subjectCell.value === 'TOTAL'

        if (isTotalRow) {
          row.font = { bold: true }
        }

        for (let colIndex = 1; colIndex <= totalColumns; colIndex += 1) {
          const cell = row.getCell(colIndex)
          const isTop = rowIndex === range.startRow
          const isBottom = rowIndex === range.endRow
          const isLeft = colIndex === 1
          const isRight = colIndex === totalColumns

          cell.border = {
            top: { style: isTop ? 'medium' : 'thin' },
            left: { style: isLeft ? 'medium' : 'thin' },
            bottom: { style: isBottom ? 'medium' : 'thin' },
            right: { style: isRight ? 'medium' : 'thin' },
          }
        }
      }
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const sectionPart = sectionValue ? `_section_${sectionValue.replace(/[^a-z0-9]+/gi, '_')}` : ''
    const filename = `class_${classValue}${sectionPart}_marks_${academicYear}.xlsx`

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export marks sheet error:', error)
    return NextResponse.json(
      { error: 'Failed to export marks sheet' },
      { status: 500 }
    )
  }
}
