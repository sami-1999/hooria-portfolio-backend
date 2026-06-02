const { getAdminClient } = require('../config/supabase')

const BUCKET = 'videos'

/**
 * Generate a signed URL so the frontend can upload directly to Supabase Storage.
 * The video never passes through Vercel — bypasses the 4.5MB serverless limit.
 *
 * Returns: { signedUrl, publicUrl }
 *   signedUrl — frontend PUT's the video file to this
 *   publicUrl — store this in the DB after upload completes
 */
async function createSignedUploadUrl(originalName) {
  const client = getAdminClient()
  if (!client) throw new Error('Storage not configured — SUPABASE_SERVICE_ROLE_KEY missing')

  const ext = (originalName || 'video.mp4').split('.').pop().toLowerCase()
  const path = `project-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`

  const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) throw error

  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(path)

  return {
    signedUrl: data.signedUrl,
    publicUrl: urlData.publicUrl,
    path,
  }
}

/**
 * Delete a video from Supabase Storage by its public URL.
 * Silently ignores if the URL is not from our bucket.
 */
async function deleteVideo(publicUrl) {
  if (!publicUrl) return
  const client = getAdminClient()
  if (!client) return

  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return

  const filename = publicUrl.slice(idx + marker.length)
  const { error } = await client.storage.from(BUCKET).remove([filename])
  if (error) console.warn('Storage delete warning:', error.message)
}

module.exports = { createSignedUploadUrl, deleteVideo }
