const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const SupabaseService = require('../services/supabaseService')

// Admin credentials (in production, store in database)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hooria.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
  try {
    console.log('🔍 Login attempt started');
    const { email, password } = req.body
    console.log('📧 Email received:', email);

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      })
    }

    console.log('🔍 Looking for admin user...');
    // Use admin client to bypass RLS for admin operations
    let adminUser = null
    try {
      // Use admin client to find admin user
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
        console.log('✅ Admin user found:', adminUser.email);
      } else {
        console.log('👤 Admin user not found, creating default admin...');
        console.log('🔧 Default admin email:', ADMIN_EMAIL);
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
        console.log('✅ Default admin created');
      }
    } catch (err) {
      console.error('❌ Admin user operation failed:', err);
      throw err;
    }

    console.log('🔐 Checking credentials...');
    console.log('📧 Provided email:', email);
    console.log('📧 Stored email:', adminUser.email);
    console.log('🔑 Password comparison starting...');

    // Check credentials
    const isValidPassword = await bcrypt.compare(password, adminUser.password)
    const isValidEmail = email === adminUser.email

    console.log('✅ Email valid:', isValidEmail);
    console.log('✅ Password valid:', isValidPassword);

    if (!isValidEmail || !isValidPassword) {
      console.log('❌ Invalid credentials');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      })
    }

    console.log('🎟️ Generating JWT token...');
    // Generate JWT token
    const token = jwt.sign(
      { email: adminUser.email, role: 'admin', id: adminUser.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    console.log('✅ Login successful');
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      })
    }
    req.admin = decoded
    next()
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    })
  }
}

// GET /api/admin/dashboard - Get dashboard data
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    // Get statistics
    const totalContacts = await SupabaseService.count('contacts', {}, true)
    const newContacts = await SupabaseService.count('contacts', { status: 'pending' }, true)
    const visitorStats = await SupabaseService.getVisitorStats()
    const totalReviews = await SupabaseService.count('reviews', {}, true)
    const activeReviews = await SupabaseService.count('reviews', { approved: true }, true)

    // Get recent contacts
    const recentContacts = await SupabaseService.getRecent('contacts', 5, true)

    // Get recent reviews
    const recentReviews = await SupabaseService.getRecent('reviews', 5, true)

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
