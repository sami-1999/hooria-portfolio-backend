const express = require('express')
const router = express.Router()
const SupabaseService = require('../services/supabaseService')

// GET /api/projects - Get all active projects
router.get('/', async (req, res) => {
  try {
    const projects = await SupabaseService.findAll('projects', { active: true })

    res.json({
      success: true,
      data: projects
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching projects'
    })
  }
})

// GET /api/projects/admin - Get all projects (including inactive)
router.get('/admin', async (req, res) => {
  try {
    const projects = await SupabaseService.findAll('projects')

    res.json({
      success: true,
      data: projects
    })
  } catch (error) {
    console.error('Error fetching admin projects:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching projects'
    })
  }
})

// POST /api/projects - Create project
router.post('/', async (req, res) => {
  try {
    const {
      title,
      category,
      duration,
      aspect_ratio,
      thumbnail,
      image,
      description,
      tags,
      project_url,
      projectUrl,
      active
    } = req.body

    if (!title || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and description are required'
      })
    }

    const normalizedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : []

    const project = await SupabaseService.create('projects', {
      title,
      category,
      duration: duration || 'N/A',
      aspect_ratio: aspect_ratio || '16:9',
      thumbnail: thumbnail || image || '',
      description,
      tags: normalizedTags,
      project_url: project_url || projectUrl || '',
      active: active !== undefined ? active : true
    }, true)

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    })
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({
      success: false,
      message: 'Error creating project'
    })
  }
})

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const project = await SupabaseService.findById('projects', req.params.id, true)

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      })
    }

    const updateData = {}
    const payload = req.body || {}

    if (payload.title !== undefined) updateData.title = payload.title
    if (payload.category !== undefined) updateData.category = payload.category
    if (payload.duration !== undefined) updateData.duration = payload.duration
    if (payload.aspect_ratio !== undefined) updateData.aspect_ratio = payload.aspect_ratio
    if (payload.aspectRatio !== undefined) updateData.aspect_ratio = payload.aspectRatio
    if (payload.thumbnail !== undefined) updateData.thumbnail = payload.thumbnail
    if (payload.image !== undefined) updateData.thumbnail = payload.image
    if (payload.description !== undefined) updateData.description = payload.description
    if (payload.project_url !== undefined) updateData.project_url = payload.project_url
    if (payload.projectUrl !== undefined) updateData.project_url = payload.projectUrl
    if (payload.active !== undefined) updateData.active = payload.active

    if (payload.tags !== undefined) {
      updateData.tags = Array.isArray(payload.tags)
        ? payload.tags
        : typeof payload.tags === 'string'
        ? payload.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : []
    }

    const updatedProject = await SupabaseService.update('projects', req.params.id, updateData, true)

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject
    })
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({
      success: false,
      message: 'Error updating project'
    })
  }
})

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await SupabaseService.findById('projects', req.params.id, true)

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      })
    }

    await SupabaseService.delete('projects', req.params.id, true)

    res.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({
      success: false,
      message: 'Error deleting project'
    })
  }
})

module.exports = router
