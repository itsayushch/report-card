import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface StudentImportData {
  name: string
  regNo: string
  class: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { students } = body as { students: StudentImportData[] }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'Invalid students data' },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    }

    const regNos = students.map((student) => student.regNo)
    const [activeYear, existingStudents] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { isActive: true },
      }),
      prisma.student.findMany({
        where: { regNo: { in: regNos } },
        select: { regNo: true },
      }),
    ])

    const existingRegNos = new Set(existingStudents.map((student) => student.regNo))
    const regNoSeen = new Set<string>()
    const createData = []

    for (let i = 0; i < students.length; i++) {
      const student = students[i]

      // Validate required fields
      if (!student.name || !student.regNo || !student.class) {
        results.failed++
        results.errors.push({
          row: i + 1,
          error: 'Missing required fields (name, regNo, class)',
        })
        continue
      }

      if (regNoSeen.has(student.regNo)) {
        results.failed++
        results.errors.push({
          row: i + 1,
          error: `Duplicate registration number in import: ${student.regNo}`,
        })
        continue
      }

      regNoSeen.add(student.regNo)

      if (existingRegNos.has(student.regNo)) {
        results.failed++
        results.errors.push({
          row: i + 1,
          error: `Student with registration number ${student.regNo} already exists`,
        })
        continue
      }

      const classNum = parseInt(student.class)
      if (isNaN(classNum) || classNum < 1 || classNum > 12) {
        results.failed++
        results.errors.push({
          row: i + 1,
          error: `Invalid class: ${student.class}. Must be between 1 and 12`,
        })
        continue
      }

      const password = student.regNo
      const now = new Date().toISOString()

      createData.push({
        name: student.name,
        regNo: student.regNo,
        password,
        class: student.class,
        status: 'ACTIVE',
        academicYear: activeYear?.year || new Date().getFullYear().toString(),
        promotionStatus: 'PENDING',
        createdAt: now,
        updatedAt: now,
      })
    }

    if (createData.length > 0) {
      const createResult = await prisma.student.createMany({
        data: createData,
        skipDuplicates: true,
      })

      results.success += createResult.count
      results.failed += createData.length - createResult.count
    }

    return NextResponse.json({
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      ...results,
    })
  } catch (error) {
    console.error('Import students error:', error)
    return NextResponse.json(
      { error: 'Failed to import students' },
      { status: 500 }
    )
  }
}
