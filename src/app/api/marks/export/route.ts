import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// TODO: Refactor to use Student.academicRecords instead of separate Mark collection
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Marks are now stored in Student.academicRecords
    return NextResponse.json({ 
      error: 'This endpoint needs to be refactored',
      message: 'Marks are now stored in Student.academicRecords array'
    }, { status: 501 })
  } catch (error) {
    console.error('Export marks error:', error)
    return NextResponse.json(
      { error: 'Failed to export marks' },
      { status: 500 }
    )
  }
}
