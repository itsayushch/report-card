# Supabase Storage Setup Guide

This guide will help you set up Supabase storage for teacher profile pictures.

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in the details:
   - Name: `sthelens-report-card` (or your preferred name)
   - Database Password: (generate a strong password)
   - Region: Choose the closest to your users
4. Click "Create new project"

## Step 2: Create Storage Bucket

✅ **You already have a bucket named `Profile Pictures`** - you can use this existing bucket!

If you need to create a new bucket:
1. In your Supabase project dashboard, navigate to **Storage** in the left sidebar
2. Click "Create a new bucket"
3. Configure the bucket:
   - Name: `Profile Pictures`
   - Public bucket: ✅ **Check this box** (we need public access for profile pictures)
4. Click "Create bucket"

## Step 3: Set Up Storage Policies

1. Click on the `Profile Pictures` bucket
2. Go to the **Policies** tab
3. Click "New Policy"

### Policy 1: Allow Public Read Access
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'Profile Pictures' );
```

### Policy 2: Allow Authenticated Upload
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Profile Pictures'
);
```

### Policy 3: Allow Authenticated Update
```sql
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'Profile Pictures' )
WITH CHECK ( bucket_id = 'Profile Pictures' );
```

### Policy 4: Allow Authenticated Delete
```sql
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'Profile Pictures' );
```

**Or use the UI Policy Editor:**
1. Click "New Policy"
2. Select "Get started quickly" → "Enable read access for all users"
3. Repeat for INSERT, UPDATE, DELETE with "authenticated" role

## Step 4: Get Your Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the settings menu
3. Copy the following:
   - **Project URL**: This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 5: Add to Environment Variables

Add these to your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

## Step 6: Restart Your Development Server

```bash
npm run dev
```

## Testing

1. Go to Admin → Teachers
2. Click "Add New Teacher" or edit an existing teacher
3. You should see a profile picture upload section
4. Upload an image (JPG, PNG, or WebP, max 5MB)
5. The image should appear in the avatar

## Folder Structure in Supabase

Profile pictures are stored with this structure:
```
Profile Pictures/
  └── teachers/
      └── {teacherId}-{timestamp}.{ext}
```

## Security Notes

- The bucket is public, so anyone with the URL can view the images
- Only authenticated users can upload/update/delete images
- Images are named with teacher ID to prevent conflicts
- Old images are automatically deleted when uploading a new one

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure you've added both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your `.env` file
- Restart your development server after adding env variables

### Error: "Upload failed: new row violates row-level security policy"
- Check that you've created the storage policies (Step 3)
- Make sure the bucket is set to public

### Images not showing
- Verify the bucket is set to public
- Check that the "Public Access" policy is enabled
- Inspect the browser console for CORS errors

### File size too large
- Maximum file size is 5MB
- Compress your images before uploading

## Optional: Customize File Size Limit

In `src/lib/supabase.ts`, you can adjust the maximum file size:

```typescript
// Change this line in uploadTeacherProfilePicture function
const maxSize = 5 * 1024 * 1024  // 5MB (change as needed)
```

## Supabase Free Tier Limits

- Storage: 1 GB
- Bandwidth: 2 GB/month
- API requests: 500,000/month

These limits should be more than enough for a school management system. If you need more, consider upgrading to Supabase Pro.
