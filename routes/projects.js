const express = require('express')
const multer = require('multer')
const router = express.Router()
const SupabaseService = require('../services/supabaseService')
const { uploadVideo, deleteVideo } = require('../utils/storageUpload')

// Memory storage — no disk writes, file stays in req.file.buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    if ((file.mimetype || '').startsWith('video/')) return cb(null, true)
    cb(new Error('Only video files are allowed'))
  },
})

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') {
    const trimmed = tags.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean)
    } catch (_e) {}
    return trimmed.split(',').map((t) => t.trim()).filter(Boolean)
  }
  return []
}

const normalizeProjectType = (value) => {
  const lower = String(value || '').trim().toLowerCase()
  if (['short_video', 'long_video', 'ai_video'].includes(lower)) return lower
  return 'short_video'
}

const normalizeVideoSource = (value, youtubeUrl, uploadedUrl) => {
  const source = String(value || '').trim().toLowerCase()
  if (source === 'youtube' || source === 'upload') return source
  if (youtubeUrl) return 'youtube'
  if (uploadedUrl) return 'upload'
  return 'youtube'
}

// GET /api/projects
router.get('/', async (_req, res) => {
  try {
    const projects = await SupabaseService.findAll('projects', { active: true })
    res.json({ success: true, data: projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ success: false, message: 'Error fetching projects' })
  }
})

// GET /api/projects/admin
router.get('/admin', async (_req, res) => {
  try {
    const projects = await SupabaseService.findAll('projects')
    res.json({ success: true, data: projects })
  } catch (error) {
    console.error('Error fetching admin projects:', error)
    res.status(500).json({ success: false, message: 'Error fetching projects' })
  }
})

// POST /api/projects
router.post('/', upload.single('uploaded_video_file'), async (req, res) => {
  try {
    const {
      title, category, description, duration, aspect_ratio,
      tags, active, project_type, type, video_source, youtube_url, video_url,
    } = req.body || {}

    if (!title || !category || !description) {
      return res.status(400).json({ success: false, message: 'Title, category, and description are required' })
    }

    const finalProjectType = normalizeProjectType(project_type || type)
    const finalYoutubeUrl = (youtube_url || video_url || '').trim()

    // Upload file to Supabase Storage if provided
    let uploadedVideoUrl = ''
    if (req.file) {
      uploadedVideoUrl = await uploadVideo(req.file.buffer, req.file.originalname, req.file.mimetype)
    }

    const finalVideoSource = normalizeVideoSource(video_source, finalYoutubeUrl, uploadedVideoUrl)

    if (finalVideoSource === 'youtube' && !finalYoutubeUrl) {
      return res.status(400).json({ success: false, message: 'YouTube URL is required when video source is youtube' })
    }
    if (finalVideoSource === 'upload' && !uploadedVideoUrl) {
      return res.status(400).json({ success: false, message: 'Please upload a video file' })
    }

    const project = await SupabaseService.create('projects', {
      title,
      category,
      project_type: finalProjectType,
      video_source: finalVideoSource,
      youtube_url: finalVideoSource === 'youtube' ? finalYoutubeUrl : '',
      uploaded_video_url: finalVideoSource === 'upload' ? uploadedVideoUrl : '',
      description,
      duration: duration || 'N/A',
      aspect_ratio: aspect_ratio || '16:9',
      tags: normalizeTags(tags),
      active: active !== undefined ? active === true || active === 'true' : true,
    }, true)

    res.status(201).json({ success: true, message: 'Project created successfully', data: project })
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ success: false, message: 'Error creating project' })
  }
})

// PUT /api/projects/:id
router.put('/:id', upload.single('uploaded_video_file'), async (req, res) => {
  try {
    const project = await SupabaseService.findById('projects', req.params.id, true)
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' })
    }

    const payload = req.body || {}
    const updateData = {}

    if (payload.title !== undefined) updateData.title = payload.title
    if (payload.category !== undefined) updateData.category = payload.category
    if (payload.description !== undefined) updateData.description = payload.description
    if (payload.duration !== undefined) updateData.duration = payload.duration
    if (payload.aspect_ratio !== undefined) updateData.aspect_ratio = payload.aspect_ratio
    if (payload.aspectRatio !== undefined) updateData.aspect_ratio = payload.aspectRatio
    if (payload.active !== undefined) updateData.active = payload.active === true || payload.active === 'true'
    if (payload.tags !== undefined) updateData.tags = normalizeTags(payload.tags)

    const incomingType = payload.project_type || payload.type
    if (incomingType !== undefined) updateData.project_type = normalizeProjectType(incomingType)

    const youtubeIncoming = (payload.youtube_url || payload.video_url || '').trim()

    // Upload new file to Supabase Storage if provided
    let newUploadedUrl = ''
    if (req.file) {
      newUploadedUrl = await uploadVideo(req.file.buffer, req.file.originalname, req.file.mimetype)
    }

    const videoFieldChanged =
      payload.video_source !== undefined ||
      payload.youtube_url !== undefined ||
      payload.video_url !== undefined ||
      payload.uploaded_video_url !== undefined ||
      req.file

    if (videoFieldChanged) {
      const resolvedSource = normalizeVideoSource(payload.video_source, youtubeIncoming, newUploadedUrl)
      updateData.video_source = resolvedSource

      if (resolvedSource === 'youtube') {
        const yt = youtubeIncoming || project.youtube_url || ''
        if (!yt) {
          return res.status(400).json({ success: false, message: 'YouTube URL is required when video source is youtube' })
        }
        updateData.youtube_url = yt
        updateData.uploaded_video_url = ''
        // Remove old uploaded file from storage
        if (project.uploaded_video_url) await deleteVideo(project.uploaded_video_url)
      } else {
        const up = newUploadedUrl || project.uploaded_video_url || ''
        if (!up) {
          return res.status(400).json({ success: false, message: 'Please upload a video file' })
        }
        // Remove old file if a new one was uploaded
        if (newUploadedUrl && project.uploaded_video_url) await deleteVideo(project.uploaded_video_url)
        updateData.uploaded_video_url = up
        updateData.youtube_url = ''
      }
    }

    const updatedProject = await SupabaseService.update('projects', req.params.id, updateData, true)
    res.json({ success: true, message: 'Project updated successfully', data: updatedProject })
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ success: false, message: 'Error updating project' })
  }
})

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const project = await SupabaseService.findById('projects', req.params.id, true)
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' })
    }

    // Remove video from storage before deleting the record
    if (project.uploaded_video_url) await deleteVideo(project.uploaded_video_url)

    await SupabaseService.delete('projects', req.params.id, true)
    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ success: false, message: 'Error deleting project' })
  }
})

module.exports = router
