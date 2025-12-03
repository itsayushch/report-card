import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// TODO: Refactor to use Student.academicRecords instead of separate Mark collection
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      error: 'This endpoint needs to be refactored for the new academicRecords structure',
      message: 'Marks are now stored in Student.academicRecords array'
    }, { status: 501 })
  } catch (error) {
    console.error('Get marks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marks' },
      { status: 500 }
    )
  }
}
