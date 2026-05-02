const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  // Get admin client with service role key for bypassing RLS
  static getAdminClient() {
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  // Get regular client for public operations
  static getClient() {
    const { getSupabase } = require('../config/supabase');
    return getSupabase();
  }

  // Generic CRUD operations
  static async create(table, data, useAdmin = false) {
    const client = useAdmin ? this.getAdminClient() : this.getClient();
    const { data: result, error } = await client
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw error;
    return result[0];
  }

  // Generic CRUD operations
  static async findAll(table, filters = {}, useAdmin = false) {
    const client = useAdmin ? this.getAdminClient() : this.getClient();
    let query = client.from(table).select('*');
    
    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined) {
        query = query.eq(key, filters[key]);
      }
    });
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async findById(table, id, useAdmin = false) {
    const client = useAdmin ? this.getAdminClient() : this.getClient();
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(table, id, data, useAdmin = false) {
    const client = useAdmin ? this.getAdminClient() : this.getClient();
    const { data: result, error } = await client
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return result[0];
  }

  static async delete(table, id, useAdmin = false) {
    const client = useAdmin ? this.getAdminClient() : this.getClient();
    const { error } = await client
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

static async count(table, filters = {}, useAdmin = false) {
  const client = useAdmin ? this.getAdminClient() : this.getClient();

  let query = client
    .from(table)
    .select('*', { count: 'exact', head: true });

  // Apply filters AFTER select
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      query = query.eq(key, value);
    }
  }

  const { count, error } = await query;

  if (error) {
    console.error('Count error:', error);
    throw error;
  }

  return count || 0;
}
  // Specific operations for visitors
  static async getVisitorStats() {
    const client = this.getAdminClient();
    
    // Get total visits
    const { count: totalVisits } = await client
      .from('visitors')
      .select('*', { count: 'exact', head: true });
    
    // Get unique visitors
    const { data: uniqueIPs } = await client
      .from('visitors')
      .select('ip_address');
    
    const uniqueVisitors = uniqueIPs ? [...new Set(uniqueIPs.map(v => v.ip_address))].length : 0;
    
    // Get today's visits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayVisits } = await client
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .gte('visit_time', today.toISOString());
    
    // Get visits by page
    const { data: visitsByPage } = await client
      .from('visitors')
      .select('page_visited');
    
    const pageStats = {};
    if (visitsByPage) {
      visitsByPage.forEach(visit => {
        pageStats[visit.page_visited] = (pageStats[visit.page_visited] || 0) + 1;
      });
    }
    
    return {
      totalVisits,
      uniqueVisitors,
      todayVisits,
      visitsByPage: Object.entries(pageStats).map(([page, count]) => ({
        page,
        count
      }))
    };
  }

  // Specific operations for contacts
  static async getContactStats() {
    const client = this.getAdminClient();
    
    // Get contacts by status
    const { data: contacts } = await client
      .from('contacts')
      .select('status');
    
    const statusStats = {};
    if (contacts) {
      contacts.forEach(contact => {
        statusStats[contact.status] = (statusStats[contact.status] || 0) + 1;
      });
    }
    
    return statusStats;
  }

  // Specific operations for reviews
  static async getReviewStats() {
    const client = this.getAdminClient();
    
    // Get reviews by rating
    const { data: reviews } = await client
      .from('reviews')
      .select('rating');
    
    const ratingStats = {};
    if (reviews) {
      reviews.forEach(review => {
        ratingStats[review.rating] = (ratingStats[review.rating] || 0) + 1;
      });
    }
    
    return ratingStats;
  }

  // Get recent records
  static async getRecent(table, limit = 5, useAdmin = false) {
    const client = useAdmin ? this.getAdminClient() : this.getClient();
    const { data, error } = await client
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  // Enhanced visitor stats with sections and referrers
  static async getDetailedVisitorStats() {
    const client = this.getAdminClient();
    
    // Get total visits
    const { count: totalVisits } = await client
      .from('visitors')
      .select('*', { count: 'exact', head: true });
    
    // Get unique visitors
    const { data: uniqueIPs } = await client
      .from('visitors')
      .select('ip_address');
    
    const uniqueVisitors = uniqueIPs ? [...new Set(uniqueIPs.map(v => v.ip_address))].length : 0;
    
    // Get today's visits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayVisits } = await client
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .gte('visit_time', today.toISOString());
    
    // Get visits by page
    const { data: visitsByPage } = await client
      .from('visitors')
      .select('page_visited');
    
    const pageStats = {};
    if (visitsByPage) {
      visitsByPage.forEach(visit => {
        pageStats[visit.page_visited] = (pageStats[visit.page_visited] || 0) + 1;
      });
    }

    // Get visits by section
    const { data: visitsBySection } = await client
      .from('visitors')
      .select('section')
      .not('section', 'is', null);
    
    const sectionStats = {};
    if (visitsBySection) {
      visitsBySection.forEach(visit => {
        sectionStats[visit.section] = (sectionStats[visit.section] || 0) + 1;
      });
    }

    // Get referrer stats
    const { data: referrerData } = await client
      .from('visitors')
      .select('referrer');
    
    const referrerStats = {};
    if (referrerData) {
      referrerData.forEach(visit => {
        const referrer = visit.referrer || 'direct';
        referrerStats[referrer] = (referrerStats[referrer] || 0) + 1;
      });
    }
    
    return {
      totalVisits,
      uniqueVisitors,
      todayVisits,
      visitsByPage: Object.entries(pageStats).map(([page, count]) => ({
        page,
        count
      })),
      visitsBySection: Object.entries(sectionStats).map(([section, count]) => ({
        section,
        count
      })),
      referrers: Object.entries(referrerStats).map(([referrer, count]) => ({
        referrer,
        count
      }))
    };
  }
}

module.exports = SupabaseService;
