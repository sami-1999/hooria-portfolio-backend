-- Adds an optional external storage link (Google Drive, Dropbox, etc.) to projects.
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS drive_link TEXT DEFAULT '';
