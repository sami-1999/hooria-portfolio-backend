// Database Schema Update Script
// Run this script to update the database schema to match the frontend expectations

const { getSupabase } = require('../config/supabase');

async function updateDatabaseSchema() {
  console.log('🔄 Starting database schema update...');

  try {
    const supabase = getSupabase();

    // 1. Update visitors table to add missing columns
    console.log('📋 Updating visitors table...');
    
    // Add action column if it doesn't exist
    const { error: actionError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE visitors 
        ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'visit';
      `
    });

    if (actionError) {
      console.log('⚠️  Could not add action column via RPC, trying direct approach...');
      
      // Try direct column addition
      const { error: directError } = await supabase
        .from('visitors')
        .select('action')
        .limit(1);
      
      if (directError && directError.code === 'PGRST204') {
        console.log('❌ Action column missing. Please manually add it to the visitors table:');
        console.log('   ALTER TABLE visitors ADD COLUMN action TEXT DEFAULT \'visit\';');
      }
    }

    // Add referrer column if it doesn't exist
    const { error: referrerError } = await supabase
      .from('visitors')
      .select('referrer')
      .limit(1);
    
    if (referrerError && referrerError.code === 'PGRST204') {
      console.log('❌ Referrer column missing. Please manually add it to the visitors table:');
      console.log('   ALTER TABLE visitors ADD COLUMN referrer TEXT;');
    }

    // Add section column if it doesn't exist
    const { error: sectionError } = await supabase
      .from('visitors')
      .select('section')
      .limit(1);
    
    if (sectionError && sectionError.code === 'PGRST204') {
      console.log('❌ Section column missing. Please manually add it to the visitors table:');
      console.log('   ALTER TABLE visitors ADD COLUMN section TEXT;');
    }

    // 2. Update contacts table to ensure proper columns
    console.log('📋 Updating contacts table...');
    
    // Check if whatsapp column exists
    const { error: whatsappError } = await supabase
      .from('contacts')
      .select('whatsapp')
      .limit(1);
    
    if (whatsappError && whatsappError.code === 'PGRST204') {
      console.log('❌ WhatsApp column missing. Please manually add it to the contacts table:');
      console.log('   ALTER TABLE contacts ADD COLUMN whatsapp TEXT;');
    }

    // Check if project_details column exists
    const { error: projectDetailsError } = await supabase
      .from('contacts')
      .select('project_details')
      .limit(1);
    
    if (projectDetailsError && projectDetailsError.code === 'PGRST204') {
      console.log('❌ Project details column missing. Please manually add it to the contacts table:');
      console.log('   ALTER TABLE contacts ADD COLUMN project_details TEXT;');
    }

    // Check if status column exists
    const { error: statusError } = await supabase
      .from('contacts')
      .select('status')
      .limit(1);
    
    if (statusError && statusError.code === 'PGRST204') {
      console.log('❌ Status column missing. Please manually add it to the contacts table:');
      console.log('   ALTER TABLE contacts ADD COLUMN status TEXT DEFAULT \'pending\';');
    }

    // 3. Update reviews table to ensure proper columns
    console.log('📋 Updating reviews table...');
    
    // Check if message column exists (instead of review_text)
    const { error: messageError } = await supabase
      .from('reviews')
      .select('message')
      .limit(1);
    
    if (messageError && messageError.code === 'PGRST204') {
      console.log('❌ Message column missing. Please manually add it to the reviews table:');
      console.log('   ALTER TABLE reviews ADD COLUMN message TEXT;');
      
      // Check if review_text exists and suggest migration
      const { error: reviewTextError } = await supabase
        .from('reviews')
        .select('review_text')
        .limit(1);
      
      if (!reviewTextError) {
        console.log('📝 Migration needed: UPDATE reviews SET message = review_text;');
      }
    }

    // Check if image column exists
    const { error: imageError } = await supabase
      .from('reviews')
      .select('image')
      .limit(1);
    
    if (imageError && imageError.code === 'PGRST204') {
      console.log('❌ Image column missing. Please manually add it to the reviews table:');
      console.log('   ALTER TABLE reviews ADD COLUMN image TEXT;');
    }

    // 4. Test basic operations
    console.log('🧪 Testing database operations...');
    
    // Test visitors table
    try {
      const { data: visitors, error: testVisitorsError } = await supabase
        .from('visitors')
        .select('*')
        .limit(1);
      
      if (testVisitorsError) {
        console.log('❌ Visitors table test failed:', testVisitorsError.message);
      } else {
        console.log('✅ Visitors table test passed');
      }
    } catch (error) {
      console.log('❌ Visitors table test failed:', error.message);
    }

    // Test contacts table
    try {
      const { data: contacts, error: testContactsError } = await supabase
        .from('contacts')
        .select('*')
        .limit(1);
      
      if (testContactsError) {
        console.log('❌ Contacts table test failed:', testContactsError.message);
      } else {
        console.log('✅ Contacts table test passed');
      }
    } catch (error) {
      console.log('❌ Contacts table test failed:', error.message);
    }

    // Test reviews table
    try {
      const { data: reviews, error: testReviewsError } = await supabase
        .from('reviews')
        .select('*')
        .limit(1);
      
      if (testReviewsError) {
        console.log('❌ Reviews table test failed:', testReviewsError.message);
      } else {
        console.log('✅ Reviews table test passed');
      }
    } catch (error) {
      console.log('❌ Reviews table test failed:', error.message);
    }

    console.log('\n🎉 Database schema update completed!');
    console.log('\n📋 Manual SQL commands needed (if any columns are missing):');
    console.log(`
-- Visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'visit';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS section TEXT;

-- Contacts table  
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS project_details TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS image TEXT;

-- Migration for reviews (if needed)
UPDATE reviews SET message = review_text WHERE message IS NULL AND review_text IS NOT NULL;
    `);

  } catch (error) {
    console.error('❌ Schema update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateDatabaseSchema().catch(console.error);
