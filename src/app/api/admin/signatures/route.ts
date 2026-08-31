import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'
import { v2 as cloudinary } from 'cloudinary'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('signature') as File | null
    const className = formData.get('class') as string | null
    const sectionName = formData.get('section') as string | null

    if (!file || !className) {
      return NextResponse.json({ error: 'Missing file or class name' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const isPrincipal = className.toLowerCase() === 'principal'
    const normalizedClass = className.toLowerCase()
    const normalizedSection = sectionName ? sectionName.trim().toLowerCase() : ''
    
    let fileName = normalizedClass
    if (!isPrincipal) {
      fileName = normalizedSection ? `class_${normalizedClass}_${normalizedSection}` : `class_${normalizedClass}`
    }

    // Upload to Cloudinary if configured
    if (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })

      await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'signatures', public_id: fileName, overwrite: true },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        uploadStream.end(buffer)
      })

      return NextResponse.json({ success: true, fileName: `${fileName}.png`, provider: 'cloudinary' })
    }

    // Fallback to local file system
    const signaturesDir = path.join(process.cwd(), 'public', 'signatures')
    
    // Ensure directory exists
    try {
      await fs.access(signaturesDir)
    } catch {
      await fs.mkdir(signaturesDir, { recursive: true })
    }

    const filePath = path.join(signaturesDir, `${fileName}.png`)
    await fs.writeFile(filePath, buffer)

    return NextResponse.json({ success: true, fileName: `${fileName}.png`, provider: 'local' })
  } catch (error) {
    console.error('Error uploading signature:', error)
    return NextResponse.json({ error: 'Failed to upload signature' }, { status: 500 })
  }
}
