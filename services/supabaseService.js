const { getSupabase, getAdminClient } = require('../config/supabase')

const requireClient = (useAdmin) => {
  const client = useAdmin ? getAdminClient() : getSupabase()
  if (!client) {
    throw new Error(
      useAdmin
        ? 'Database admin client not configured — SUPABASE_SERVICE_ROLE_KEY missing'
        : 'Database client not configured — SUPABASE_URL or SUPABASE_ANON_KEY missing'
    )
  }
  return client
}

class SupabaseService {
  static getAdminClient() {
    return requireClient(true)
  }

  static getClient() {
    return requireClient(false)
  }

  static async create(table, data, useAdmin = false) {
    const client = requireClient(useAdmin)
    const { data: result, error } = await client.from(table).insert(data).select()
    if (error) throw error
    return result[0]
  }

  static async findAll(table, filters = {}, useAdmin = false) {
    const client = requireClient(useAdmin)
    let query = client.from(table).select('*')
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined) query = query.eq(key, filters[key])
    })
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  static async findById(table, id, useAdmin = false) {
    const client = requireClient(useAdmin)
    const { data, error } = await client.from(table).select('*').eq('id', id).single()
    if (error) throw error
    return data
  }

  static async update(table, id, data, useAdmin = false) {
    const client = requireClient(useAdmin)
    const { data: result, error } = await client.from(table).update(data).eq('id', id).select()
    if (error) throw error
    return result[0]
  }

  static async delete(table, id, useAdmin = false) {
    const client = requireClient(useAdmin)
    const { error } = await client.from(table).delete().eq('id', id)
    if (error) throw error
    return true
  }

  static async count(table, filters = {}, useAdmin = false) {
    const client = requireClient(useAdmin)
    let query = client.from(table).select('*', { count: 'exact', head: true })
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value)
      }
    }
    const { count, error } = await query
    if (error) {
      console.error('Count error:', error)
      throw error
    }
    return count || 0
  }

  static async getVisitorStats() {
    const client = requireClient(true)

    const { count: totalVisits } = await client
      .from('visitors')
      .select('*', { count: 'exact', head: true })

    const { data: uniqueIPs } = await client.from('visitors').select('ip_address')
    const uniqueVisitors = uniqueIPs
      ? [...new Set(uniqueIPs.map((v) => v.ip_address))].length
      : 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayVisits } = await client
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .gte('visit_time', today.toISOString())

    const { data: visitsByPage } = await client.from('visitors').select('page_visited')
    const pageStats = {}
    if (visitsByPage) {
      visitsByPage.forEach((visit) => {
        pageStats[visit.page_visited] = (pageStats[visit.page_visited] || 0) + 1
      })
    }

    return {
      totalVisits,
      uniqueVisitors,
      todayVisits,
      visitsByPage: Object.entries(pageStats).map(([page, count]) => ({ page, count })),
    }
  }

  static async getContactStats() {
    const client = requireClient(true)
    const { data: contacts } = await client.from('contacts').select('status')
    const statusStats = {}
    if (contacts) {
      contacts.forEach((c) => {
        statusStats[c.status] = (statusStats[c.status] || 0) + 1
      })
    }
    return statusStats
  }

  static async getReviewStats() {
    const client = requireClient(true)
    const { data: reviews } = await client.from('reviews').select('rating')
    const ratingStats = {}
    if (reviews) {
      reviews.forEach((r) => {
        ratingStats[r.rating] = (ratingStats[r.rating] || 0) + 1
      })
    }
    return ratingStats
  }

  static async getRecent(table, limit = 5, useAdmin = false) {
    const client = requireClient(useAdmin)
    const { data, error } = await client
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  }
}

module.exports = SupabaseService
