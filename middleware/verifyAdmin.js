const jwt = require('jsonwebtoken')
const env = require('../config/env')

// Verifies the admin JWT on protected routes — shared by admin.js, settings.js, etc.
const verifyAdmin = (req, res, next) => {
  if (!env.jwtReady) {
    return res.status(503).json({
      success: false,
      message: 'Admin routes not available — JWT_SECRET not configured',
    })
  }

  const token = req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET)
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    req.admin = decoded
    next()
  } catch (error) {
    console.error('JWT verification failed:', error.message)
    res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

module.exports = verifyAdmin
