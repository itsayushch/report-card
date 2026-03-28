import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const TEACHER_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'teachers')
const PUBLIC_UPLOAD_PREFIX = '/uploads/teachers/'

function getExtensionFromMimeType(mimeType: string): string | null {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  return map[mimeType] ?? null
}

function extractStoredFileName(profilePicture: string): string | null {
  if (!profilePicture) return null

  if (profilePicture.startsWith(PUBLIC_UPLOAD_PREFIX)) {
    return path.basename(profilePicture)
  }

  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    try {
      const url = new URL(profilePicture)
      if (url.pathname.startsWith(PUBLIC_UPLOAD_PREFIX)) {
        return path.basename(url.pathname)
      }
    } catch {
      return null
    }
  }

  return null
}

async function deleteStoredTeacherProfilePicture(profilePicture: string): Promise<void> {
  const fileName = extractStoredFileName(profilePicture)
  if (!fileName) return

  const filePath = path.join(TEACHER_UPLOAD_DIR, fileName)
  try {
    await fs.unlink(filePath)
  } catch {
    // Ignore missing files; DB state remains source of truth.
  }
}

async function saveTeacherProfilePicture(file: File, teacherId: string): Promise<string> {
  const extension = getExtensionFromMimeType(file.type)
  if (!extension) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed')
  }

  await fs.mkdir(TEACHER_UPLOAD_DIR, { recursive: true })

  const fileName = `${teacherId}-${Date.now()}-${randomUUID()}.${extension}`
  const outputPath = path.join(TEACHER_UPLOAD_DIR, fileName)
  const buffer = Buffer.from(await file.arrayBuffer())

  await fs.writeFile(outputPath, buffer)

  return `${PUBLIC_UPLOAD_PREFIX}${fileName}`
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow teachers to upload their own picture or admins to upload anyone's
    const isAdmin = session.user.role === 'ADMIN'
    if (!isAdmin && session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      )
    }

    // Get existing teacher data
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      select: { profilePicture: true }
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Delete old profile picture if exists
    if (teacher.profilePicture) {
      await deleteStoredTeacherProfilePicture(teacher.profilePicture)
    }

    // Save new profile picture to local storage
    const publicUrl = await saveTeacherProfilePicture(file, id)

    // Update teacher record
    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: { profilePicture: publicUrl },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
      },
    })

    return NextResponse.json({
      message: 'Profile picture uploaded successfully',
      teacher: updatedTeacher,
    })
  } catch (error) {
    console.error('Upload profile picture error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload profile picture' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow teachers to delete their own picture or admins to delete anyone's
    const isAdmin = session.user.role === 'ADMIN'
    if (!isAdmin && session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get existing teacher data
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      select: { profilePicture: true }
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    if (!teacher.profilePicture) {
      return NextResponse.json({ error: 'No profile picture to delete' }, { status: 404 })
    }

    // Delete from local storage
    await deleteStoredTeacherProfilePicture(teacher.profilePicture)

    // Update teacher record
    await prisma.teacher.update({
      where: { id },
      data: { profilePicture: null },
    })

    return NextResponse.json({ message: 'Profile picture deleted successfully' })
  } catch (error) {
    console.error('Delete profile picture error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete profile picture' },
      { status: 500 }
    )
  }
}
