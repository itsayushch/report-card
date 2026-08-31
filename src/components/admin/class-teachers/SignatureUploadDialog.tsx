'use client'

import React, { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface SignatureUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  className: string
  sectionName?: string | null
  onSuccess: () => void
}

export function SignatureUploadDialog({
  open,
  onOpenChange,
  className,
  sectionName,
  onSuccess,
}: SignatureUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processedFile, setProcessedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = img.width
        canvas.height = img.height
        
        ctx.drawImage(img, 0, 0)
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Convert white/light pixels to transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          
          // If the pixel is very light (close to white), make it transparent
          if (r > 200 && g > 200 && b > 200) {
            data[i + 3] = 0 // alpha = 0
          } else {
            // Darken the non-white parts to ensure the signature is visible
            data[i] = Math.max(0, r - 50)
            data[i + 1] = Math.max(0, g - 50)
            data[i + 2] = Math.max(0, b - 50)
          }
        }
        
        ctx.putImageData(imageData, 0, 0)
        
        canvas.toBlob((blob) => {
          if (!blob) return
          const newFile = new File([blob], 'signature.png', { type: 'image/png' })
          setProcessedFile(newFile)
          setPreviewUrl(URL.createObjectURL(blob))
        }, 'image/png')
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!processedFile) return
    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('signature', processedFile)
      formData.append('class', className)
      if (sectionName) {
        formData.append('section', sectionName)
      }

      const res = await fetch('/api/admin/signatures', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Failed to upload signature')
      }

      toast.success('Signature updated successfully!')
      onSuccess()
      handleClose()
    } catch (error) {
      toast.error('Failed to upload signature')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setPreviewUrl(null)
    setProcessedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose()
      else onOpenChange(val)
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Signature for Class {className}{sectionName ? ` Section ${sectionName}` : ''}</DialogTitle>
          <DialogDescription>
            Upload a photo or scan of the signature. We will automatically remove the white background to make it transparent.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          
          {!previewUrl ? (
            <Button 
              variant="outline" 
              className="w-full h-32 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span>Click to select image</span>
              </div>
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="relative w-full h-40 border rounded bg-checkerboard flex items-center justify-center overflow-hidden bg-gray-100">
                <Image
                  src={previewUrl}
                  alt="Processed signature preview"
                  fill
                  className="object-contain p-4"
                  unoptimized
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Different Image
              </Button>
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!processedFile || isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
