-- Migration: Reclassify existing content library entries as videos when filename or MIME indicates a video
BEGIN TRANSACTION;

-- Update rows where stored MIME indicates a video
UPDATE content_library
SET file_type = 'video', category = 'Lecture Videos'
WHERE LOWER(COALESCE(file_type, '')) LIKE 'video/%';

-- Update rows where title (filename) ends with known video extensions
UPDATE content_library
SET file_type = 'video', category = 'Lecture Videos'
WHERE LOWER(COALESCE(title, '')) LIKE '%.mp4'
   OR LOWER(COALESCE(title, '')) LIKE '%.mov'
   OR LOWER(COALESCE(title, '')) LIKE '%.webm'
   OR LOWER(COALESCE(title, '')) LIKE '%.m4v'
   OR LOWER(COALESCE(title, '')) LIKE '%.avi'
   OR LOWER(COALESCE(title, '')) LIKE '%.mkv';

-- Also check r2_key paths (object keys) for file extensions
UPDATE content_library
SET file_type = 'video', category = 'Lecture Videos'
WHERE LOWER(COALESCE(r2_key, '')) LIKE '%.mp4'
   OR LOWER(COALESCE(r2_key, '')) LIKE '%.mov'
   OR LOWER(COALESCE(r2_key, '')) LIKE '%.webm'
   OR LOWER(COALESCE(r2_key, '')) LIKE '%.m4v'
   OR LOWER(COALESCE(r2_key, '')) LIKE '%.avi'
   OR LOWER(COALESCE(r2_key, '')) LIKE '%.mkv';

COMMIT;
