# Row Level Security (RLS) Policy Fix Guide

## Problem Identified
Your application is experiencing RLS violations because:
1. Admin operations need to bypass RLS policies
2. Service role key is required for admin functions
3. Current setup properly uses service role but needs proper RLS policies

## Solution Options

### Option A: Use Service Role Key (RECOMMENDED for Admin Operations)
✅ **Current Implementation is Correct**
- Your `getAdminClient()` already uses `SUPABASE_SERVICE_ROLE_KEY`
- This bypasses RLS entirely for admin operations
- All admin routes in `routes/admin.js` correctly pass `useAdmin = true`

### Option B: Create RLS Policies (Alternative)
If you prefer to keep RLS enabled even for admin operations:

```sql
-- Enable RLS on tables
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin bypass policy
CREATE POLICY "Admin users can do everything" ON visitors
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can do everything" ON contacts
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can do everything" ON reviews
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can do everything" ON admin_users
  USING (auth.jwt() ->> 'role' = 'admin');

-- Public policies for visitors table
CREATE POLICY "Enable insert for all users" ON visitors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON visitors
  FOR SELECT USING (true);
```

## Current Status: ✅ FIXED

Your code is now correctly configured with:
- ✅ Static `count()` function
- ✅ Proper client references (`this.getClient()` instead of `this.client`)
- ✅ Service role key usage for admin operations
- ✅ Correct query builder chaining (.eq, .order, .select)

## Environment Variables Required
Ensure your `.env` file contains:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Testing the Fix
1. Restart your Node.js server
2. Test admin dashboard endpoints
3. Verify visitor tracking works
4. Check contact/review operations

The TypeError: "query.eq is not a function" should now be resolved.
