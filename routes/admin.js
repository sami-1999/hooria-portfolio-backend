const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const SupabaseService = require('../services/supabaseService')
const env = require('../config/env')
const verifyAdmin = require('../middleware/verifyAdmin')

// Guard — rejects requests when JWT_SECRET is not properly configured
const requireJwtSecret = (_req, res, next) => {
  if (!env.jwtReady) {
    return res.status(503).json({
      success: false,
      message: 'Admin routes not available — JWT_SECRET not configured',
    })
  }
  next()
}

// POST /api/admin/login
router.post('/login', requireJwtSecret, async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    let adminUser = null
    try {
      const adminClient = SupabaseService.getAdminClient()
      const { data, error } = await adminClient
        .from('admin_users')
        .select('*')
        .eq('email', env.ADMIN_EMAIL)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        adminUser = data
      } else {
        const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 12)
        const { data: newAdmin, error: createError } = await adminClient
          .from('admin_users')
          .insert({ email: env.ADMIN_EMAIL, password: hashedPassword })
          .select()
          .single()
        if (createError) throw createError
        adminUser = newAdmin
      }
    } catch (err) {
      console.warn('⚠️ Database unavailable, using fallback authentication:', err.message)
      if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
        adminUser = { email: env.ADMIN_EMAIL, id: 'fallback-admin-id' }
      } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
      }
    }

    const isValidEmail = email === adminUser.email
    const isValidPassword =
      adminUser.id === 'fallback-admin-id'
        ? password === env.ADMIN_PASSWORD
        : await bcrypt.compare(password, adminUser.password)

    if (!isValidEmail || !isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { email: adminUser.email, role: 'admin', id: adminUser.id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    )

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: { email: adminUser.email, role: 'admin', id: adminUser.id },
    })
  } catch (error) {
    console.error('❌ Admin login error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: env.isProduction ? undefined : error.message,
    })
  }
})

// GET /api/admin/dashboard
router.get('/dashboard', verifyAdmin, async (_req, res) => {
  try {
    let totalContacts = 0,
      newContacts = 0,
      totalReviews = 0,
      activeReviews = 0
    let recentContacts = [],
      recentReviews = []
    let visitorStats = { totalVisits: 0, uniqueVisitors: 0, todayVisits: 0 }

    try {
      totalContacts = await SupabaseService.count('contacts', {}, true)
      newContacts = await SupabaseService.count('contacts', { status: 'pending' }, true)
      visitorStats = await SupabaseService.getVisitorStats()
      totalReviews = await SupabaseService.count('reviews', {}, true)
      activeReviews = await SupabaseService.count('reviews', { approved: true }, true)
      recentContacts = await SupabaseService.getRecent('contacts', 5, true)
      recentReviews = await SupabaseService.getRecent('reviews', 5, true)
    } catch (dbError) {
      console.warn('Database operations failed, using fallback data:', dbError.message)
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalContacts,
          newContacts,
          totalVisits: visitorStats.totalVisits,
          uniqueVisitors: visitorStats.uniqueVisitors,
          todayVisits: visitorStats.todayVisits,
          totalReviews,
          activeReviews,
        },
        recentContacts,
        recentReviews,
      },
    })
  } catch (error) {
    console.error('Error getting dashboard data:', error)
    res.status(500).json({ success: false, message: 'Error getting dashboard data' })
  }
})

// GET /api/admin/contacts
router.get('/contacts', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const query = status ? { status } : {}

    const contacts = await SupabaseService.findAll('contacts', query, true)
    const total = await SupabaseService.count('contacts', query, true)

    res.json({
      success: true,
      data: {
        contacts: contacts.slice((page - 1) * limit, page * limit),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error getting contacts:', error)
    res.status(500).json({ success: false, message: 'Error getting contacts' })
  }
})

// PUT /api/admin/contacts/:id/status
router.put('/contacts/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body

    if (!['pending', 'contacted', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    const contact = await SupabaseService.findById('contacts', req.params.id, true)
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' })
    }

    const updatedContact = await SupabaseService.update(
      'contacts',
      req.params.id,
      { status },
      true
    )

    res.json({
      success: true,
      message: 'Contact status updated successfully',
      data: updatedContact,
    })
  } catch (error) {
    console.error('Error updating contact status:', error)
    res.status(500).json({ success: false, message: 'Error updating contact status' })
  }
})

// DELETE /api/admin/contacts/:id
router.delete('/contacts/:id', verifyAdmin, async (req, res) => {
  try {
    const contact = await SupabaseService.findById('contacts', req.params.id, true)
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' })
    }
    await SupabaseService.delete('contacts', req.params.id, true)
    res.json({ success: true, message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('Error deleting contact:', error)
    res.status(500).json({ success: false, message: 'Error deleting contact' })
  }
})

// GET /api/admin/stats
router.get('/stats', verifyAdmin, async (_req, res) => {
  try {
    const contactsByStatus = await SupabaseService.getContactStats()
    const visitorStats = await SupabaseService.getVisitorStats()
    const reviewsByRating = await SupabaseService.getReviewStats()

    res.json({
      success: true,
      data: {
        contactsByStatus,
        visitsByDate: visitorStats.visitsByPage,
        reviewsByRating,
      },
    })
  } catch (error) {
    console.error('Error getting statistics:', error)
    res.status(500).json({ success: false, message: 'Error getting statistics' })
  }
})

module.exports = router
