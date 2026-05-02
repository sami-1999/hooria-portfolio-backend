const { createClient } = require('@supabase/supabase-js');

let supabase = null;

const connectSupabase = () => {
  try {
    // Check if environment variables are defined
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    }

    // Create Supabase client
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );

    console.log('✅ Supabase client initialized');
    return supabase;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error.message);
    
    // Provide helpful troubleshooting information
    if (error.message.includes('SUPABASE_URL')) {
      console.error('\n🔧 Supabase Configuration Steps:');
      console.error('1. Create a Supabase account at https://supabase.com');
      console.error('2. Create a new project');
      console.error('3. Go to Project Settings > API');
      console.error('4. Copy the Project URL and anon/public key');
      console.error('5. Add them to your .env file');
    }
    
    throw error;
  }
};

// Get Supabase client (initialize if not already done)
const getSupabase = () => {
  if (!supabase) {
    return connectSupabase();
  }
  return supabase;
};

// Test connection
const testConnection = async () => {
  try {
    // Test with actual table that should exist
    const { data, error } = await getSupabase().from('contacts').select('id').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = relation doesn't exist (expected)
      throw error;
    }
    
    console.log('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  connectSupabase,
  getSupabase,
  testConnection
};
