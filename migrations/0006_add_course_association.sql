-- Migration: Add course/module/lesson association to content_library
-- Allows resources to be linked to specific courses, modules, and lessons
-- Enables role-based visibility (teachers see their courses, students see enrolled courses)

BEGIN TRANSACTION;

-- Add association and visibility columns to content_library
ALTER TABLE content_library ADD COLUMN course_id TEXT;
ALTER TABLE content_library ADD COLUMN module_id TEXT;
ALTER TABLE content_library ADD COLUMN lesson_id TEXT;
ALTER TABLE content_library ADD COLUMN visibility TEXT DEFAULT 'institution';

-- Create indexes for efficient querying by course/module/lesson
CREATE INDEX IF NOT EXISTS idx_content_course ON content_library(course_id);
CREATE INDEX IF NOT EXISTS idx_content_module ON content_library(module_id);
CREATE INDEX IF NOT EXISTS idx_content_lesson ON content_library(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_visibility ON content_library(institution_id, visibility);

COMMIT;
