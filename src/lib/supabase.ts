import { createClient } from '@supabase/supabase-js'

// Use server-side environment variables (not exposed to client)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create a server-side client with service role key for admin operations
// This should only be used in API routes, never on the client
export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper function to upload teacher profile picture
export async function uploadTeacherProfilePicture(file: File, teacherId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
  }
  
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
  if (!supabase) {
    console.warn('Supabase is not configured, skipping profile picture deletion')
    return
  }
  
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
