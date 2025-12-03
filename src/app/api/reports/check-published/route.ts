import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const className = searchParams.get('class')
    const term = searchParams.get('term')
    const academicYear = searchParams.get('academicYear')

    if (!className || !term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const publishRecord = await prisma.reportPublish.findUnique({
      where: {
        class_term_academicYear: {
          class: className,
          term,
          academicYear,
        },
      },
    })

    return NextResponse.json({
      isPublished: publishRecord?.isPublished || false,
      publishedAt: publishRecord?.publishedAt,
    })
  } catch (error) {
    console.error('Check published error:', error)
    return NextResponse.json(
      { error: 'Failed to check publish status' },
      { status: 500 }
    )
  }
}
