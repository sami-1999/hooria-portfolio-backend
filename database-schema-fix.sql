-- Database Schema Fix Script
-- Run this SQL in your Supabase SQL Editor to fix missing columns

-- 1. Update visitors table
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'visit';

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS referrer TEXT;

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS section TEXT;

-- 2. Update contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS project_details TEXT;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 3. Update reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS image TEXT;

-- 4. Migration for existing reviews (if review_text exists)
UPDATE reviews 
SET message = review_text 
WHERE message IS NULL AND review_text IS NOT NULL;

-- 5. Verify the schema changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('visitors', 'contacts', 'reviews')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
