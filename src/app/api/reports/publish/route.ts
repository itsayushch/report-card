import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSection } from '@/lib/class-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { class: className, term, academicYear } = body
    const section = normalizeSection(body.section)

    if (!className || !term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if already published
    const existing = await prisma.reportPublish.findFirst({
      where: {
        class: className,
        section,
        term,
        academicYear,
      },
    })

    if (existing && existing.isPublished) {
      return NextResponse.json(
        { error: 'Reports already published for this class and term' },
        { status: 400 }
      )
    }

    // Create or update publish record
    const publishRecord = existing
      ? await prisma.reportPublish.update({
          where: { id: existing.id },
          data: {
            isPublished: true,
            publishedAt: new Date(),
            publishedById: session.user.id,
          },
        })
      : await prisma.reportPublish.create({
          data: {
            class: className,
            section,
            term,
            academicYear,
            isPublished: true,
            publishedAt: new Date(),
            publishedById: session.user.id,
          },
        })
    

    return NextResponse.json({
      success: true,
      message: 'Reports published successfully',
      data: publishRecord,
    })
  } catch (error) {
    console.error('Publish reports error:', error)
    return NextResponse.json(
      { error: 'Failed to publish reports' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const className = searchParams.get('class')
    const section = normalizeSection(searchParams.get('section'))
    const term = searchParams.get('term')
    const academicYear = searchParams.get('academicYear')

    if (!className || !term || !academicYear) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Unpublish by setting isPublished to false
    await prisma.reportPublish.updateMany({
      where: {
        class: className,
        section,
        term,
        academicYear,
      },
      data: {
        isPublished: false,
        publishedAt: null,
        publishedById: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Reports unpublished successfully',
    })
  } catch (error) {
    console.error('Unpublish reports error:', error)
    return NextResponse.json(
      { error: 'Failed to unpublish reports' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const academicYear = searchParams.get('academicYear')

    const where: { academicYear?: string } = {}
    if (academicYear) {
      where.academicYear = academicYear
    }

    const publishedReports = await prisma.reportPublish.findMany({
      where,
      include: {
        publishedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { class: 'asc' },
        { section: 'asc' },
      ],
    })

    return NextResponse.json(
      publishedReports.map((record) => ({
        ...record,
        publishedBy: record.publishedBy?.name || null,
      }))
    )
  } catch (error) {
    console.error('Get published reports error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch published reports' },
      { status: 500 }
    )
  }
}
