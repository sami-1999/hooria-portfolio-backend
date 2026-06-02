const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Admin
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@hooria.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123456',

  // Email
  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || '',
}

// Computed flags — used throughout the app to gate features
env.isProduction = env.NODE_ENV === 'production'
env.isServerless = !!process.env.VERCEL
env.supabaseReady = !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
env.supabaseAdminReady = !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
env.jwtReady = !!(env.JWT_SECRET && env.JWT_SECRET.length >= 32)
env.emailReady = !!(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS)

// Log missing required vars once at startup — never throw
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET']
const missing = required.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error(`❌ Missing environment variables: ${missing.join(', ')}`)
}
if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
  console.warn('⚠️ JWT_SECRET is too short — must be at least 32 characters')
}

module.exports = env
