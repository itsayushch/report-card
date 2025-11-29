import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNextClass } from '@/lib/calculations'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentIds, action } = body as {
      studentIds: string[]
      action: 'PROMOTE' | 'DETAIN'
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      )
    }

    if (action !== 'PROMOTE' && action !== 'DETAIN') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const results = await Promise.all(
      studentIds.map(async (studentId) => {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
        })

        if (!student) {
          return { studentId, success: false, error: 'Student not found' }
        }

        const updateData: any = {
          promotionStatus: action === 'PROMOTE' ? 'PROMOTED' : 'DETAINED',
        }

        // If promoting, update class
        if (action === 'PROMOTE') {
          const nextClass = getNextClass(student.class)
          
          if (nextClass === 'GRADUATED') {
            updateData.class = student.class // Keep same class
            updateData.status = 'INACTIVE' // Mark as inactive
            updateData.promotionStatus = 'PROMOTED'
          } else {
            updateData.class = nextClass
          }
        }

        await prisma.student.update({
          where: { id: studentId },
          data: updateData,
        })

        return {
          studentId,
          success: true,
          action,
          newClass: updateData.class || student.class,
        }
      })
    )

    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      message: `${successCount} student(s) ${action === 'PROMOTE' ? 'promoted' : 'detained'} successfully`,
      results,
    })
  } catch (error) {
    console.error('Promote students error:', error)
    return NextResponse.json(
      { error: 'Failed to process promotion' },
      { status: 500 }
    )
  }
}
