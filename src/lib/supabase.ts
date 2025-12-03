import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to upload teacher profile picture
export async function uploadTeacherProfilePicture(file: File, teacherId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${teacherId}-${Date.now()}.${fileExt}`
  const filePath = `teachers/${fileName}`

  const { data, error } = await supabase.storage
    .from('Profile Pictures')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('Profile Pictures')
    .getPublicUrl(filePath)

  return publicUrl
}

// Helper function to delete teacher profile picture
export async function deleteTeacherProfilePicture(url: string) {
  try {
    // Extract file path from URL
    const urlParts = url.split('/Profile%20Pictures/')
    if (urlParts.length < 2) return

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('Profile Pictures')
      .remove([`teachers/${filePath.split('/').pop()}`])

    if (error) {
      console.error('Failed to delete profile picture:', error)
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error)
  }
}
