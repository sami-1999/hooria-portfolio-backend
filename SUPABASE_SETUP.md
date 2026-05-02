# Supabase Configuration Guide

## 🚀 Supabase Project Setup

### 1. **Supabase Account Banayein**
- https://supabase.com par jaayein
- GitHub account se sign up karein
- Free plan select karein

### 2. **New Project Create Karein**
- Dashboard par "New Project" click karein
- Organization select karein (ya nayi banayein)
- Project details fill karein:
  - **Project Name**: `hooria-portfolio`
  - **Database Password**: Strong password rakhein
  - **Region**: Apke users ke closest region select karein
- "Create new project" click karein

### 3. **Database Tables Create Karein**

#### Visitors Table
```sql
CREATE TABLE visitors (
  id SERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  page_visited TEXT NOT NULL,
  visit_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT
);
```

#### Contacts Table
```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending'
);
```

#### Reviews Table
```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Admin Users Table
```sql
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. **API Keys Copy Karein**
- Project mein jaayein
- Left sidebar mein "Settings" click karein
- "API" section mein jaayein
- **Project URL** copy karein
- **anon/public** key copy karein
- **service_role** key copy karein (secret rakhein)

### 5. **Environment Variables Configure Karein**

Apke `.env` file mein ye values add karein:

```env
# Database Configuration (Supabase)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 6. **Row Level Security (RLS) Setup**

#### Visitors Table RLS
```sql
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visitors" ON visitors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view visitors" ON visitors
  FOR SELECT USING (true);
```

#### Contacts Table RLS
```sql
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contacts" ON contacts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all contacts" ON contacts
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
```

#### Reviews Table RLS
```sql
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert reviews" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view approved reviews" ON reviews
  FOR SELECT USING (approved = true);

CREATE POLICY "Admins can view all reviews" ON reviews
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
```

### 7. **Dependencies Install Karein**

```bash
npm install
```

### 8. **Server Start Karein**

```bash
# Development mode
npm run dev

# Production mode
npm run prod
```

## 🔍 Troubleshooting

### **Connection Issues**
- Internet connection check karein
- Supabase URL correct hai ya nahi
- API keys properly copy kiye hain ya nahi

### **Table Not Found Errors**
- SQL tables properly create kiye hain ya nahi
- Table names correct hain ya nahi

### **Permission Errors**
- RLS policies properly set kiye hain ya nahi
- API keys correct hain ya nahi

## 📊 Health Check

Server start karne ke baad ye URL check karein:
```
http://localhost:5000/api/health
```

Response mein database connection status dikhega.

## 🎯 Benefits of Supabase

- ✅ **Free Tier**: 500MB database, 50k monthly active users
- ✅ **Real-time**: Automatic real-time subscriptions
- ✅ **Authentication**: Built-in auth system
- ✅ **Easy Setup**: No complex configuration
- ✅ **PostgreSQL**: Powerful database with full SQL support
- ✅ **REST API**: Automatic API generation
- ✅ **Dashboard**: Beautiful web interface
