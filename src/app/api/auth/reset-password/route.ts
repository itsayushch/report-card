import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

// Send password reset email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { email },
    })

    if (!teacher) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        message: 'If the email exists, a password reset email has been sent',
      })
    }

    // Generate a random temporary password (8 characters: letters + numbers)
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase()

    const userName = teacher.name

    // Update the password in database
    await prisma.teacher.update({
      where: { email },
      data: {
        password: tempPassword,
        firstLogin: true, // Force password change on next login
      },
    })

    // Send email via SendGrid
    const emailResult = await sendPasswordResetEmail(email, tempPassword, userName)

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error)
      // In development, return the temp password if email fails
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          message: 'Email service unavailable. Use this temporary password:',
          tempPassword,
        })
      }
    }

    return NextResponse.json({
      message: 'Password reset email has been sent successfully',
      // Only return temp password in development when email fails
      tempPassword: process.env.NODE_ENV === 'development' && !emailResult.success ? tempPassword : undefined,
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset' },
      { status: 500 }
    )
  }
}
