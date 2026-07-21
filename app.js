const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const path = require('path')
const env = require('./config/env')
const errorHandler = require('./config/errorHandler')

const app = express()

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://hooria-zaman.vercel.app',
]
if (env.FRONTEND_URL) allowedOrigins.push(env.FRONTEND_URL)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      if (isLocalhost || allowedOrigins.includes(origin)) return callback(null, true)
      callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
)

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static uploads — /tmp on Vercel (writable), local folder otherwise
const uploadsPath = env.isServerless
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsPath))

// Routes
const visitorRoutes = require('./routes/visitors')
const contactRoutes = require('./routes/contacts')
const reviewRoutes = require('./routes/reviews')
const projectRoutes = require('./routes/projects')
const adminRoutes = require('./routes/admin')

app.use('/api/track-visit', visitorRoutes)
app.use('/api/submit-form', contactRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/admin', adminRoutes)

app.options('*', cors())

// Health check — always responds, reports config status without crashing
app.get('/api/health', async (_req, res) => {
  const { getSupabase } = require('./config/supabase')

  let dbConnected = false
  if (env.supabaseReady) {
    try {
      const { error } = await getSupabase().from('contacts').select('id').limit(1)
      dbConnected = !error || error.code === 'PGRST116'
    } catch (_err) {
      dbConnected = false
    }
  }

  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    config: {
      supabase: env.supabaseReady ? '✅ Configured' : '❌ Not configured',
      jwt: env.jwtReady ? '✅ Configured' : '❌ Not configured',
      email: env.emailReady ? '✅ Configured' : '❌ Not configured',
    },
    database: {
      connected: dbConnected,
      type: 'Supabase',
    },
  })
})

// 404
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// Global error handler
app.use(errorHandler)

module.exports = app
