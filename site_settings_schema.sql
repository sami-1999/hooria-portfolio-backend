-- Site Settings Table
-- Run this SQL in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Stores the single row of public contact info (email, WhatsApp, socials) that the
-- admin panel's Settings page edits and the public site's Contact/Footer read.

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  contact_email TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  facebook_url TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT site_settings_single_row CHECK (id = 1)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings" ON site_settings
  FOR SELECT USING (true);

-- Seed the singleton row with today's placeholder contact email so the site has
-- something to show before you fill in real details from the admin panel.
INSERT INTO site_settings (id, contact_email, whatsapp_number, instagram_url, facebook_url)
VALUES (1, 'admin@hooria.com', '', '', '')
ON CONFLICT (id) DO NOTHING;
