'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, User, Mail, Lock, Upload, Camera, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ImageCropper } from '@/components/ui/image-cropper'
import { getSubjectById } from '@/lib/subjects'

interface TeacherProfile {
  id: string
  name: string
  email: string
  profilePicture: string | null
  classSubjectPairs: Array<{ subject: string; classAssigned: string }>
  isAdmin: boolean
  isSuperAdmin: boolean
  firstLogin: boolean
}

export default function TeacherProfilePage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)

  const [formData, setFormData] = useState({
    name: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/teacher/profile')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile')
      }

      setProfile(data.teacher)
      setFormData({
        name: data.teacher.name,
      })
      setPreviewImage(data.teacher.profilePicture)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/teacher/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      toast.success('Profile updated successfully')
      setProfile(data.teacher)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/teacher/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      toast.success('Password changed successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, or WebP)')
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB')
      return
    }

    // Read the file and show cropper
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageToCrop(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = (croppedImage: Blob) => {
    setCroppedBlob(croppedImage)
    
    // Create preview URL from blob
    const previewUrl = URL.createObjectURL(croppedImage)
    setPreviewImage(previewUrl)
    
    // Create a File from the Blob
    const file = new File([croppedImage], 'profile-picture.jpg', { type: 'image/jpeg' })
    setSelectedFile(file)
  }

  const handleUploadProfilePicture = async () => {
    if (!selectedFile || !profile) return

    const formData = new FormData()
    formData.append('file', selectedFile)

    setUploadingImage(true)
    try {
      const response = await fetch(`/api/teachers/${profile.id}/profile-picture`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload profile picture')
      }

      const data = await response.json()
      setProfile({ ...profile, profilePicture: data.teacher.profilePicture })
      setPreviewImage(data.teacher.profilePicture)
      setSelectedFile(null)
      toast.success('Profile picture updated successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteProfilePicture = async () => {
    if (!profile) return

    setUploadingImage(true)
    try {
      const response = await fetch(`/api/teachers/${profile.id}/profile-picture`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete profile picture')
      }

      setProfile({ ...profile, profilePicture: null })
      setPreviewImage(null)
      setSelectedFile(null)
      toast.success('Profile picture removed successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const cancelImageSelection = () => {
    setSelectedFile(null)
    setCroppedBlob(null)
    setPreviewImage(profile?.profilePicture || null)
    
    // Clean up preview URL if it was created from blob
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                  <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">Failed to load profile</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid gap-8">
          {/* Profile Header Card */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Profile Picture */}
                <div className="shrink-0">
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                      <AvatarImage 
                        src={previewImage || profile.profilePicture || undefined} 
                        alt={profile.name}
                        onError={(e) => {
                          console.error('Failed to load profile picture:', previewImage || profile.profilePicture)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-4xl">
                        {profile.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => document.getElementById('profile-picture-input')?.click()}
                      className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
                      disabled={uploadingImage}
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    <input
                      id="profile-picture-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  
                  {selectedFile && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleUploadProfilePicture}
                        disabled={uploadingImage}
                        className="flex-1"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelImageSelection}
                        disabled={uploadingImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {!selectedFile && previewImage && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleDeleteProfilePicture}
                      disabled={uploadingImage}
                    >
                      Remove Photo
                    </Button>
                  )}
                  
                  <p className="text-xs text-gray-500 text-center mt-3">
                    JPG, PNG or WebP<br />Max 5MB
                  </p>
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                    {profile.isSuperAdmin && (
                      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                        Super Admin
                      </Badge>
                    )}
                    {profile.isAdmin && !profile.isSuperAdmin && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                  </div>
                  <p className="text-gray-600 flex items-center justify-center md:justify-start gap-2 mb-6">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </p>

                  {/* Class Assignments */}
                  {profile.classSubjectPairs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Teaching Assignments</h3>
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {profile.classSubjectPairs.map((pair, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                            Class {pair.classAssigned} - {getSubjectById(pair.classAssigned, pair.subject)?.name || pair.subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Information */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-blue-600" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your name"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        value={profile.email}
                        disabled
                        className="pl-10 bg-gray-50 h-11"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <Button type="submit" disabled={saving} className="w-full h-11 mt-6">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5 text-blue-600" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      placeholder="Enter current password"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      placeholder="Enter new password"
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500">Minimum 8 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      placeholder="Confirm new password"
                      className="h-11"
                    />
                  </div>

                  <Button type="submit" disabled={changingPassword} className="w-full h-11 mt-6">
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>

                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Forgot your password?</strong> Contact your administrator to reset it.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Cropper Dialog */}
      <ImageCropper
        open={showCropper}
        onOpenChange={setShowCropper}
        imageSrc={imageToCrop || ''}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
