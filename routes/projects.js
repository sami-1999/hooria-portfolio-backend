const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const router = express.Router()
const SupabaseService = require('../services/supabaseService')

const uploadsDir = path.join(__dirname, '..', 'uploads', 'projects')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.mp4'
    cb(null, `project-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if ((file.mimetype || '').startsWith('video/')) return cb(null, true)
    cb(new Error('Only video files are allowed'))
  }
})

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') {
    const trimmed = tags.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((tag) => String(tag).trim()).filter(Boolean)
    } catch (_e) {}
    return trimmed.split(',').map((tag) => tag.trim()).filter(Boolean)
  }
  return []
}

const normalizeProjectType = (value) => {
  const raw = String(value || '').trim()
  const lower = raw.toLowerCase()
  if (lower === 'short_video' || lower === 'long_video' || lower === 'ai_video') return lower
  if (raw === 'SHORT_VIDEO') return 'short_video'
  if (raw === 'LONG_VIDEO') return 'long_video'
  if (raw === 'AI_VIDEO') return 'ai_video'
  return 'short_video'
}

const normalizeVideoSource = (value, youtubeUrl, uploadedVideoUrl) => {
  const source = String(value || '').trim().toLowerCase()
  if (source === 'youtube' || source === 'upload') return source
  if (youtubeUrl) return 'youtube'
  if (uploadedVideoUrl) return 'upload'
  return 'youtube'
}

// GET /api/projects - Get all active projects
router.get('/', async (_req, res) => {
  try {
    const projects = await SupabaseService.findAll('projects', { active: true })
    res.json({ success: true, data: projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ success: false, message: 'Error fetching projects' })
  }
})

// GET /api/projects/admin - Get all projects (including inactive)
router.get('/admin', async (_req, res) => {
  try {
    const projects = await SupabaseService.findAll('projects')
    res.json({ success: true, data: projects })
  } catch (error) {
    console.error('Error fetching admin projects:', error)
    res.status(500).json({ success: false, message: 'Error fetching projects' })
  }
})

// POST /api/projects - Create project
router.post('/', upload.single('uploaded_video_file'), async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      duration,
      aspect_ratio,
      tags,
      active,
      project_type,
      type,
      video_source,
      youtube_url,
      video_url,
      uploaded_video_url
    } = req.body || {}

    if (!title || !category || !description) {
      return res.status(400).json({ success: false, message: 'Title, category, and description are required' })
    }

    const finalProjectType = normalizeProjectType(project_type || type)
    const filePath = req.file ? `/uploads/projects/${req.file.filename}` : ''
    const finalYoutubeUrl = (youtube_url || video_url || '').trim()
    const finalUploadedVideoUrl = (uploaded_video_url || filePath || '').trim()
    const finalVideoSource = normalizeVideoSource(video_source, finalYoutubeUrl, finalUploadedVideoUrl)

    if (finalVideoSource === 'youtube' && !finalYoutubeUrl) {
      return res.status(400).json({ success: false, message: 'YouTube URL is required when video source is youtube' })
    }

    if (finalVideoSource === 'upload' && !finalUploadedVideoUrl) {
      return res.status(400).json({ success: false, message: 'Uploaded video is required when video source is upload' })
    }

    const project = await SupabaseService.create('projects', {
      title,
      category,
      project_type: finalProjectType,
      video_source: finalVideoSource,
      youtube_url: finalVideoSource === 'youtube' ? finalYoutubeUrl : '',
      uploaded_video_url: finalVideoSource === 'upload' ? finalUploadedVideoUrl : '',
      description,
      duration: duration || 'N/A',
      aspect_ratio: aspect_ratio || '16:9',
      tags: normalizeTags(tags),
      active: active !== undefined ? active === true || active === 'true' : true
    }, true)

    res.status(201).json({ success: true, message: 'Project created successfully', data: project })
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ success: false, message: 'Error creating project' })
  }
})

// PUT /api/projects/:id - Update project
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

    const incomingProjectType = payload.project_type || payload.type
    if (incomingProjectType !== undefined) {
      updateData.project_type = normalizeProjectType(incomingProjectType)
    }

    const filePath = req.file ? `/uploads/projects/${req.file.filename}` : ''
    const youtubeIncoming = (payload.youtube_url || payload.video_url || '').trim()
    const uploadIncoming = (payload.uploaded_video_url || filePath || '').trim()
    const resolvedSource = normalizeVideoSource(payload.video_source, youtubeIncoming, uploadIncoming)

    if (payload.video_source !== undefined || payload.youtube_url !== undefined || payload.video_url !== undefined || payload.uploaded_video_url !== undefined || req.file) {
      updateData.video_source = resolvedSource

      if (resolvedSource === 'youtube') {
        const yt = youtubeIncoming || project.youtube_url || ''
        if (!yt) {
          return res.status(400).json({ success: false, message: 'YouTube URL is required when video source is youtube' })
        }
        updateData.youtube_url = yt
        updateData.uploaded_video_url = ''
      } else {
        const up = uploadIncoming || project.uploaded_video_url || ''
        if (!up) {
          return res.status(400).json({ success: false, message: 'Uploaded video is required when video source is upload' })
        }
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

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await SupabaseService.findById('projects', req.params.id, true)
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' })
    }

    await SupabaseService.delete('projects', req.params.id, true)
    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ success: false, message: 'Error deleting project' })
  }
})

module.exports = router
