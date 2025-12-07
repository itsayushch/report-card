import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface StudentImportData {
  name: string
  regNo: string
  dateOfBirth?: string
  class: string
  parentName?: string
  email: string
  phone?: string
  academicYear?: string
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
        if (!student.name || !student.regNo || !student.class || !student.email) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields (name, regNo, class, email)',
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

        // Check if email already exists
        const existingEmail = await prisma.student.findFirst({
          where: { email: student.email },
        })

        if (existingEmail) {
          results.failed++
          results.errors.push({
            row: i + 1,
            error: `Email ${student.email} already exists`,
          })
          continue
        }

        // Password is dateOfBirth in DDMMYYYY format (plain text, no slashes)
        // dateOfBirth is stored with slashes DD/MM/YYYY
        let password: string
        let dateOfBirth: string

        if (student.dateOfBirth) {
          // Remove any slashes from input to get DDMMYYYY
          const dobWithoutSlashes = student.dateOfBirth.replace(/\//g, '')
          password = dobWithoutSlashes
          
          // Format as DD/MM/YYYY for storage
          if (dobWithoutSlashes.length === 8) {
            dateOfBirth = `${dobWithoutSlashes.slice(0, 2)}/${dobWithoutSlashes.slice(2, 4)}/${dobWithoutSlashes.slice(4, 8)}`
          } else {
            dateOfBirth = student.dateOfBirth
          }
        } else {
          password = student.regNo
          dateOfBirth = ''
        }

        // Create student with embedded auth
        await prisma.student.create({
          data: {
            name: student.name,
            regNo: student.regNo,
            email: student.email,
            password: password,
            dateOfBirth: dateOfBirth,
            class: student.class,
            parentName: student.parentName || 'Parent',
            phone: student.phone || '',
            status: 'ACTIVE',
            academicYear: student.academicYear || activeYear?.year || '2024-2025',
            promotionStatus: 'PENDING',
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
