const express = require('express')
const router = express.Router()
const SupabaseService = require('../services/supabaseService')
const getClientIp = require('../utils/getClientIp')

// POST /api/track-visit - Track visitor
router.post('/', async (req, res) => {
  try {
    const ip = getClientIp(req)
    const userAgent = req.get('User-Agent') || 'Unknown'
    const { page = 'home', section, action = 'visit', referrer, timestamp } = req.body

    // Create new visitor record (use admin client to bypass RLS)
    const visitorData = {
      ip_address: ip,
      user_agent: userAgent,
      page_visited: page,
      visit_time: timestamp || new Date().toISOString()
    };

    // Only add optional fields if they're provided
    if (referrer) {
      visitorData.referrer = referrer;
    }
    if (section) {
      visitorData.section = section;
    }
    if (action) {
      visitorData.action = action;
    }

    await SupabaseService.create('visitors', visitorData, true);

    // Get visitor statistics
    const stats = await SupabaseService.getVisitorStats()

    res.status(201).json({
      success: true,
      message: 'Visit tracked successfully',
      stats
    })
  } catch (error) {
    console.error('Error tracking visit:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error tracking visit' 
    })
  }
})

// GET /api/track-visit/stats - Get visitor statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await SupabaseService.getVisitorStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting visitor stats:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error getting visitor statistics' 
    })
  }
})

module.exports = router
