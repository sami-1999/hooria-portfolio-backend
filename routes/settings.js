const express = require('express')
const router = express.Router()
const SupabaseService = require('../services/supabaseService')
const verifyAdmin = require('../middleware/verifyAdmin')
const env = require('../config/env')

const DEFAULT_SETTINGS = {
  contact_email: env.ADMIN_EMAIL,
  whatsapp_number: '',
  instagram_url: '',
  facebook_url: '',
}

// GET /api/settings — public, used by the site's footer/contact section
router.get('/', async (_req, res) => {
  try {
    const client = SupabaseService.getClient()
    const { data, error } = await client.from('site_settings').select('*').eq('id', 1).single()

    if (error && error.code !== 'PGRST116') throw error

    res.json({ success: true, data: data || DEFAULT_SETTINGS })
  } catch (error) {
    // Table may not exist yet (migration not run) or DB unreachable — fall back
    // to defaults so the public site never breaks because of this endpoint.
    console.warn('Site settings unavailable, using defaults:', error.message)
    res.json({ success: true, data: DEFAULT_SETTINGS })
  }
})

// PUT /api/settings — admin only, upserts the singleton settings row
router.put('/', verifyAdmin, async (req, res) => {
  try {
    const { contact_email, whatsapp_number, instagram_url, facebook_url } = req.body || {}

    const payload = {
      id: 1,
      contact_email: (contact_email ?? '').trim(),
      whatsapp_number: (whatsapp_number ?? '').trim(),
      instagram_url: (instagram_url ?? '').trim(),
      facebook_url: (facebook_url ?? '').trim(),
      updated_at: new Date().toISOString(),
    }

    const adminClient = SupabaseService.getAdminClient()
    const { data, error } = await adminClient
      .from('site_settings')
      .upsert(payload)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, message: 'Settings updated successfully', data })
  } catch (error) {
    console.error('Error updating site settings:', error)
    res.status(500).json({ success: false, message: 'Error updating site settings' })
  }
})

module.exports = router
