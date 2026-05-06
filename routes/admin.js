const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const SupabaseService = require('../services/supabaseService')

// Validate JWT secret is available
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ Invalid JWT secret configuration')
  throw new Error('JWT_SECRET must be configured and at least 32 characters')
}

// Admin credentials (in production, store in database)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hooria.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      })
    }

    // Use admin client to bypass RLS for admin operations
    let adminUser = null
    try {
      const adminClient = SupabaseService.getAdminClient();
      const { data, error } = await adminClient
        .from('admin_users')
        .select('*')
        .eq('email', ADMIN_EMAIL)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        adminUser = data;
      } else {
        // Admin user doesn't exist, create default admin
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
        const { data: newAdmin, error: createError } = await adminClient
          .from('admin_users')
          .insert({
            email: ADMIN_EMAIL,
            password: hashedPassword
          })
          .select()
          .single();

        if (createError) throw createError;
        adminUser = newAdmin;
      }
    } catch (err) {
      console.warn('⚠️ Database unavailable, using fallback authentication:', err.message);
      // Fallback authentication when database is not available
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        adminUser = {
          email: ADMIN_EMAIL,
          id: 'fallback-admin-id'
        };
      } else {
        throw err;
      }
    }

    // Check credentials
    let isValidPassword = false
    if (adminUser.id === 'fallback-admin-id') {
      isValidPassword = password === ADMIN_PASSWORD
    } else {
      isValidPassword = await bcrypt.compare(password, adminUser.password)
    }
    const isValidEmail = email === adminUser.email

    if (!isValidEmail || !isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    const token = jwt.sign(
      { email: adminUser.email, role: 'admin', id: adminUser.id },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        email: adminUser.email,
        role: 'admin',
        id: adminUser.id
      }
    })
  } catch (error) {
    console.error('❌ Admin Login Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    res.status(500).json({ 
      success: false,
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }
    req.admin = decoded
    next()
  } catch (error) {
    console.error('JWT verification failed:', error.message)
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
}

// GET /api/admin/dashboard - Get dashboard data
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    // Get statistics with fallback for database issues
    let totalContacts = 0, newContacts = 0, totalReviews = 0, activeReviews = 0
    let recentContacts = [], recentReviews = []
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
      // Use fallback data when database is not available
      totalContacts = 0
      newContacts = 0
      totalReviews = 4 // Use fallback reviews count
      activeReviews = 4
      recentContacts = []
      recentReviews = [
        { id: '1', name: 'Sarah Jenkins', rating: 5, message: 'Exceptional work!', approved: true, created_at: new Date().toISOString() },
        { id: '2', name: 'Marcus Thorne', rating: 5, message: 'Professional, creative...', approved: true, created_at: new Date().toISOString() }
      ]
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
          activeReviews
        },
        recentContacts,
        recentReviews
      }
    })
  } catch (error) {
    console.error('Error getting dashboard data:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error getting dashboard data' 
    })
  }
})

// GET /api/admin/contacts - Get all contacts
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
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error getting contacts:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error getting contacts' 
    })
  }
})

// PUT /api/admin/contacts/:id/status - Update contact status
router.put('/contacts/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body

    if (!['pending', 'contacted', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status' 
      })
    }

    const contact = await SupabaseService.findById('contacts', req.params.id, true)
    
    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact not found' 
      })
    }

    const updatedContact = await SupabaseService.update('contacts', req.params.id, { status }, true)

    res.json({
      success: true,
      message: 'Contact status updated successfully',
      data: updatedContact
    })
  } catch (error) {
    console.error('Error updating contact status:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error updating contact status' 
    })
  }
})

// DELETE /api/admin/contacts/:id - Delete contact
router.delete('/contacts/:id', verifyAdmin, async (req, res) => {
  try {
    const contact = await SupabaseService.findById('contacts', req.params.id, true)
    
    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: 'Contact not found' 
      })
    }

    await SupabaseService.delete('contacts', req.params.id, true)

    res.json({ 
      success: true,
      message: 'Contact deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting contact:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error deleting contact' 
    })
  }
})

// GET /api/admin/stats - Get detailed statistics
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    // Contact statistics by status
    const contactsByStatus = await SupabaseService.getContactStats()

    // Visit statistics
    const visitorStats = await SupabaseService.getVisitorStats()

    // Review statistics
    const reviewsByRating = await SupabaseService.getReviewStats()

    res.json({
      success: true,
      data: {
        contactsByStatus,
        visitsByDate: visitorStats.visitsByPage,
        reviewsByRating
      }
    })
  } catch (error) {
    console.error('Error getting statistics:', error)
    res.status(500).json({ 
      success: false,
      message: 'Error getting statistics' 
    })
  }
})

module.exports = router
