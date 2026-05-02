require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database tables...');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY required in .env file');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const tables = [
    {
      name: 'visitors',
      sql: `
        CREATE TABLE IF NOT EXISTS visitors (
          id SERIAL PRIMARY KEY,
          ip_address TEXT NOT NULL,
          user_agent TEXT,
          referrer TEXT,
          page_visited TEXT NOT NULL,
          visit_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          session_id TEXT
        );
      `
    },
    {
      name: 'contacts',
      sql: `
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT,
          message TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status TEXT DEFAULT 'pending'
        );
      `
    },
    {
      name: 'reviews',
      sql: `
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          review_text TEXT,
          approved BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'admin_users',
      sql: `
        CREATE TABLE IF NOT EXISTS admin_users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ];

  try {
    for (const table of tables) {
      console.log(`📋 Creating table: ${table.name}`);
      
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: table.sql });
      
      if (error) {
        console.error(`❌ Error creating ${table.name}:`, error.message);
      } else {
        console.log(`✅ Table ${table.name} created successfully`);
      }
    }

    console.log('\n🎉 Database setup completed!');
    console.log('📊 Tables created: visitors, contacts, reviews, admin_users');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Alternative: Use Supabase Dashboard > SQL Editor to run the queries manually');
  }
}

setupDatabase();
