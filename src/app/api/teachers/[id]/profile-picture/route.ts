import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadTeacherProfilePicture, deleteTeacherProfilePicture } from '@/lib/supabase'

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
      await deleteTeacherProfilePicture(teacher.profilePicture)
    }

    // Upload new profile picture
    const publicUrl = await uploadTeacherProfilePicture(file, id)

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
  } catch (error: any) {
    console.error('Upload profile picture error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload profile picture' },
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

    // Delete from Supabase
    await deleteTeacherProfilePicture(teacher.profilePicture)

    // Update teacher record
    await prisma.teacher.update({
      where: { id },
      data: { profilePicture: null },
    })

    return NextResponse.json({ message: 'Profile picture deleted successfully' })
  } catch (error: any) {
    console.error('Delete profile picture error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete profile picture' },
      { status: 500 }
    )
  }
}
