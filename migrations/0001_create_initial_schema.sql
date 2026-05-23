-- D1 Database Migration: Create Initial Schema
-- Run with: wrangler d1 migrations apply zerot-db

-- ============= USERS TABLE =============
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  profile_picture TEXT,
  role TEXT DEFAULT 'student', -- 'student', 'teacher', 'owner' (institution founders are treated as owners)
  status TEXT DEFAULT 'active',  -- 'active', 'suspended', 'inactive'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============= INSTITUTIONS TABLE =============
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  founder_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (founder_id) REFERENCES users(id)
);

-- ============= COURSES TABLE =============
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id TEXT NOT NULL,
  category TEXT,
  thumbnail TEXT,
  level TEXT, -- 'beginner', 'intermediate', 'advanced'
  start_date DATETIME,
  end_date DATETIME,
  max_students INTEGER,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- ============= MODULES TABLE =============
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- ============= LESSONS TABLE =============
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  order_index INTEGER,
  duration_minutes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES modules(id)
);

-- ============= ENROLLMENTS TABLE =============
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  completion_date DATETIME,
  progress_percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'dropped'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE(course_id, student_id)
);

-- ============= ATTENDANCE TABLE =============
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  attended BOOLEAN DEFAULT 0,
  marked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE(lesson_id, student_id)
);

-- ============= ASSESSMENTS TABLE =============
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT, -- 'quiz', 'assignment', 'exam'
  total_points INTEGER,
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

-- ============= SUBMISSIONS TABLE =============
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  submission_content TEXT,
  file_url TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  score INTEGER,
  feedback TEXT,
  graded_at DATETIME,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  UNIQUE(assessment_id, student_id)
);

-- ============= CERTIFICATES TABLE =============
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  certificate_url TEXT,
  issued_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  verification_code TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- ============= ANNOUNCEMENTS TABLE =============
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- ============= LIVE_CLASSES TABLE =============
CREATE TABLE IF NOT EXISTS live_classes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INTEGER,
  meeting_url TEXT,
  recording_url TEXT,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- ============= CONTENT_LIBRARY TABLE =============
CREATE TABLE IF NOT EXISTS content_library (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT, -- 'pdf', 'video', 'document', etc
  category TEXT,
  uploader_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);

-- ============= FINANCIAL_RECORDS TABLE =============
CREATE TABLE IF NOT EXISTS financial_records (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT,
  student_id TEXT,
  transaction_type TEXT, -- 'enrollment', 'refund', 'payment'
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

-- ============= INDEXES FOR PERFORMANCE =============

-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Institution queries
CREATE INDEX idx_institutions_founder ON institutions(founder_id);
CREATE INDEX idx_institutions_status ON institutions(status);

-- Course queries
CREATE INDEX idx_courses_institution ON courses(institution_id);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);

-- Module queries
CREATE INDEX idx_modules_course ON modules(course_id);

-- Lesson queries
CREATE INDEX idx_lessons_module ON lessons(module_id);

-- Enrollment queries
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Attendance queries
CREATE INDEX idx_attendance_lesson ON attendance(lesson_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);

-- Assessment queries
CREATE INDEX idx_assessments_lesson ON assessments(lesson_id);

-- Submission queries
CREATE INDEX idx_submissions_assessment ON submissions(assessment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);

-- Certificate queries
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_course ON certificates(course_id);

-- Announcement queries
CREATE INDEX idx_announcements_institution ON announcements(institution_id);
CREATE INDEX idx_announcements_course ON announcements(course_id);

-- Live class queries
CREATE INDEX idx_live_classes_course ON live_classes(course_id);

-- Content library queries
CREATE INDEX idx_content_library_institution ON content_library(institution_id);

-- Financial records queries
CREATE INDEX idx_financial_records_institution ON financial_records(institution_id);
CREATE INDEX idx_financial_records_student ON financial_records(student_id);
