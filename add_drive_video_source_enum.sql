-- Allows video_source to be 'drive' in addition to 'youtube' and 'upload'.
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Needed for the "Drive Link" video source option in the admin Projects form.

ALTER TYPE project_video_source_enum ADD VALUE IF NOT EXISTS 'drive';
