const { createClient } = require('@supabase/supabase-js')
const env = require('./env')

// Singletons — created once, reused across all requests in the same process
let _client = null
let _adminClient = null

const getSupabase = () => {
  if (!env.supabaseReady) return null
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: true, persistSession: false, detectSessionInUrl: false },
    })
    console.log('✅ Supabase client initialized')
  }
  return _client
}

const getAdminClient = () => {
  if (!env.supabaseAdminReady) return null
  if (!_adminClient) {
    _adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _adminClient
}

const testConnection = async () => {
  const client = getSupabase()
  if (!client) return false
  try {
    const { error } = await client.from('contacts').select('id').limit(1)
    return !error || error.code === 'PGRST116'
  } catch {
    return false
  }
}

// Legacy alias used by server.js for local startup logging
const connectSupabase = () => {
  if (!env.supabaseReady) {
    console.warn('⚠️ Supabase not configured — SUPABASE_URL or SUPABASE_ANON_KEY missing')
    return null
  }
  return getSupabase()
}

module.exports = { getSupabase, getAdminClient, testConnection, connectSupabase }
