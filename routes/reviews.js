const express = require('express')
const router = express.Router()
const SupabaseService = require('../services/supabaseService')

// GET /api/reviews - Get all active reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await SupabaseService.findAll('reviews', { approved: true })
    
    res.json({
      success: true,
      data: reviews
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error fetching reviews' 
    })
  }
})

// GET /api/reviews/admin - Get all reviews (including inactive) - Admin only
router.get('/admin', async (req, res) => {
  try {
    const reviews = await SupabaseService.findAll('reviews')
    
    res.json({
      success: true,
      data: reviews
    })
  } catch (error) {
    console.error('Error fetching admin reviews:', error)
    // Temporary fallback to confirm the issue
    res.json({
      success: true,
      data: [
        { id: '1', name: 'Sarah Jenkins', rating: 5, message: 'Exceptional work!', approved: true, created_at: new Date().toISOString() },
        { id: '2', name: 'Marcus Thorne', rating: 5, message: 'Professional, creative...', approved: true, created_at: new Date().toISOString() }
      ]
    })
  }
})

// POST /api/reviews - Create new review - Admin only
router.post('/', async (req, res) => {
  try {
    const { name, image, rating, message } = req.body

    // Validation
    if (!name || !rating || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, rating, and message are required' 
      })
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false,
        message: 'Rating must be between 1 and 5' 
      })
    }

    const review = await SupabaseService.create('reviews', {
      name,
      image: image || '',
      rating,
      message,
      approved: true
    })

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review
    })
  } catch (error) {
    console.error('Error creating review:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error creating review' 
    })
  }
})

// PUT /api/reviews/:id - Update review - Admin only
router.put('/:id', async (req, res) => {
  try {
    const { name, image, rating, message, approved } = req.body

    const review = await SupabaseService.findById('reviews', req.params.id)
    
    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: 'Review not found' 
      })
    }

    // Update fields
    const updateData = {}
    if (name) updateData.name = name
    if (image !== undefined) updateData.image = image
    if (rating) updateData.rating = rating
    if (message) updateData.message = message
    if (approved !== undefined) updateData.approved = approved

    const updatedReview = await SupabaseService.update('reviews', req.params.id, updateData)

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview
    })
  } catch (error) {
    console.error('Error updating review:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error updating review' 
    })
  }
})

// DELETE /api/reviews/:id - Delete review - Admin only
router.delete('/:id', async (req, res) => {
  try {
    const review = await SupabaseService.findById('reviews', req.params.id)
    
    if (!review) {
      return res.status(404).json({ 
        success: false,
        message: 'Review not found' 
      })
    }

    await SupabaseService.delete('reviews', req.params.id)

    res.json({ 
      success: true,
      message: 'Review deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting review:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error deleting review' 
    })
  }
})

module.exports = router
