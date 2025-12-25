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

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    })

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    }

    for (let i = 0; i < students.length; i++) {
      const student = students[i]

      try {
        // Validate required fields
        if (!student.name || !student.regNo || !student.class) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields (name, regNo, class)',
          })
          continue
        }

        // Check if student already exists
        const existing = await prisma.student.findUnique({
          where: { regNo: student.regNo },
        })

        if (existing) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: `Student with registration number ${student.regNo} already exists`,
          })
          continue
        }

        // Validate class is valid (optional but recommended)
        const classNum = parseInt(student.class)
        if (isNaN(classNum) || classNum < 1 || classNum > 12) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: `Invalid class: ${student.class}. Must be between 1 and 12`,
          })
          continue
        }

        // Use registration number as default password
        const password = student.regNo

        // Create student with all required fields
        await prisma.student.create({
          data: {
            name: student.name,
            regNo: student.regNo,
            password: password,
            class: student.class,
            status: 'ACTIVE',
            academicYear: activeYear?.year || new Date().getFullYear().toString(),
            promotionStatus: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push({
          row: i + 1,
          error: error.message || 'Failed to create student',
        })
      }
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
