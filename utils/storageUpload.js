const { getAdminClient } = require('../config/supabase')

const BUCKET = 'videos'

/**
 * Upload a video buffer to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
async function uploadVideo(buffer, originalName, mimetype) {
  const client = getAdminClient()
  if (!client) throw new Error('Storage not configured — SUPABASE_SERVICE_ROLE_KEY missing')

  const ext = originalName ? originalName.split('.').pop().toLowerCase() : 'mp4'
  const filename = `project-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`

  const { error } = await client.storage.from(BUCKET).upload(filename, buffer, {
    contentType: mimetype || 'video/mp4',
    upsert: false,
  })

  if (error) throw error

  const { data } = client.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

/**
 * Delete a video from Supabase Storage by its public URL.
 * Silently ignores if the URL is not from our bucket.
 */
async function deleteVideo(publicUrl) {
  if (!publicUrl) return
  const client = getAdminClient()
  if (!client) return

  // Extract the filename from the URL
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return // not our storage URL

  const filename = publicUrl.slice(idx + marker.length)
  const { error } = await client.storage.from(BUCKET).remove([filename])
  if (error) console.warn('Storage delete warning:', error.message)
}

module.exports = { uploadVideo, deleteVideo }
