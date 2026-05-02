require('dotenv').config();
const { getSupabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    const supabase = getSupabase();

    // 1. Create default admin user
    console.log('👤 Creating admin user...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hooria.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const { data: existingAdmin, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (!existingAdmin && !adminError) {
      await supabase
        .from('admin_users')
        .insert([{
          email: adminEmail,
          password: hashedPassword
        }]);
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // 2. Add sample reviews
    console.log('⭐ Adding sample reviews...');
    const sampleReviews = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        rating: 5,
        review_text: 'Excellent work! Very professional and delivered on time.',
        approved: true
      },
      {
        name: 'Sarah Smith',
        email: 'sarah@example.com',
        rating: 4,
        review_text: 'Great communication and amazing video editing skills!',
        approved: true
      },
      {
        name: 'Mike Johnson',
        email: 'mike@example.com',
        rating: 5,
        review_text: 'Outstanding quality! Highly recommend for video editing projects.',
        approved: true
      },
      {
        name: 'Emily Davis',
        email: 'emily@example.com',
        rating: 4,
        review_text: 'Very creative and professional. Will work again!',
        approved: true
      },
      {
        name: 'Alex Wilson',
        email: 'alex@example.com',
        rating: 5,
        review_text: 'Perfect video editing! Exceeded my expectations.',
        approved: true
      }
    ];

    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('id')
      .limit(1);

    if (!existingReviews || existingReviews.length === 0) {
      await supabase
        .from('reviews')
        .insert(sampleReviews);
      console.log('✅ Sample reviews added');
    } else {
      console.log('ℹ️ Reviews already exist');
    }

    // 3. Add sample contacts
    console.log('📧 Adding sample contacts...');
    const sampleContacts = [
      {
        name: 'Robert Brown',
        email: 'robert@example.com',
        subject: 'Video Editing Project',
        message: 'I need a 5-minute promotional video for my startup. Budget is around $500.',
        status: 'pending'
      },
      {
        name: 'Lisa Anderson',
        email: 'lisa@example.com',
        subject: 'YouTube Content',
        message: 'Looking for ongoing video editing services for my YouTube channel. 2 videos per month.',
        status: 'contacted'
      },
      {
        name: 'David Miller',
        email: 'david@example.com',
        subject: 'Wedding Video',
        message: 'Need professional editing for wedding footage. 2 hours of raw footage.',
        status: 'completed'
      }
    ];

    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id')
      .limit(1);

    if (!existingContacts || existingContacts.length === 0) {
      await supabase
        .from('contacts')
        .insert(sampleContacts);
      console.log('✅ Sample contacts added');
    } else {
      console.log('ℹ️ Contacts already exist');
    }

    // 4. Add sample visitors
    console.log('👥 Adding sample visitors...');
    const sampleVisitors = [];
    const pages = ['home', 'about', 'portfolio', 'contact', 'services'];
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    const ips = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '203.0.113.1'];

    // Generate 20 sample visitor records
    for (let i = 0; i < 20; i++) {
      const randomDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      sampleVisitors.push({
        ip_address: ips[Math.floor(Math.random() * ips.length)],
        user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
        page_visited: pages[Math.floor(Math.random() * pages.length)],
        visit_time: randomDate.toISOString(),
        session_id: `session_${Math.random().toString(36).substr(2, 9)}`
      });
    }

    const { data: existingVisitors } = await supabase
      .from('visitors')
      .select('id')
      .limit(1);

    if (!existingVisitors || existingVisitors.length === 0) {
      await supabase
        .from('visitors')
        .insert(sampleVisitors);
      console.log('✅ Sample visitors added');
    } else {
      console.log('ℹ️ Visitors already exist');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Admin user: admin@hooria.com / admin123456');
    console.log('- Sample reviews: 5 entries');
    console.log('- Sample contacts: 3 entries');
    console.log('- Sample visitors: 20 entries');
    console.log('\n🚀 You can now start the server with: npm run dev');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.log('\n💡 Make sure tables are created first!');
      console.log('Run: npm run setup-db');
      console.log('Or create tables manually in Supabase dashboard');
    }
    
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();
