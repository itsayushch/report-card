import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// TODO: Refactor to check Student.academicRecords for promotion eligibility
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Marks are now stored in Student.academicRecords
    // Need to check final term marks from embedded academicRecords array
    return NextResponse.json({ 
      error: 'This endpoint needs to be refactored',
      message: 'Marks are now stored in Student.academicRecords array'
    }, { status: 501 })
  } catch (error) {
    console.error('Promotion eligibility error:', error)
    return NextResponse.json(
      { error: 'Failed to check promotion eligibility' },
      { status: 500 }
    )
  }
}
