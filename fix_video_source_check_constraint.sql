-- The projects table has a separate CHECK constraint (in addition to the
-- enum type fixed by add_drive_video_source_enum.sql) that still only
-- allows video_source to be 'youtube' or 'upload'. This replaces it to
-- also allow 'drive'. Run this in your Supabase SQL Editor.

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_video_source_check;

ALTER TABLE projects
ADD CONSTRAINT projects_video_source_check
CHECK (video_source IN ('youtube', 'upload', 'drive'));
