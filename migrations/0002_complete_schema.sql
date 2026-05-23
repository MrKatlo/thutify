-- D1 Migration 0002: Complete schema aligned with src/types.ts
-- DESTRUCTIVE: drops legacy 0001 tables. Apply only if 0001 has no production data.
-- Run with: wrangler d1 migrations apply lms

-- ============= DROP LEGACY TABLES =============
DROP TABLE IF EXISTS financial_records;
DROP TABLE IF EXISTS content_library;
DROP TABLE IF EXISTS live_classes;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS institutions;
DROP TABLE IF EXISTS users;

-- ============= PLATFORM USERS =============
-- Global account record. One row per Firebase Auth uid. Independent of any institution.
CREATE TABLE platform_users (
  uid TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  photo_url TEXT,
  is_platform_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_platform_users_email ON platform_users(email);
CREATE INDEX idx_platform_users_is_admin ON platform_users(is_platform_admin);

-- ============= INSTITUTIONS =============
CREATE TABLE institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  country TEXT,
  institution_type TEXT NOT NULL CHECK (institution_type IN ('school','college','training_center','company')),
  owner_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending','suspended')),
  -- branding & settings
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  locale TEXT DEFAULT 'en',
  custom_domain TEXT,
  -- payment gateway config (stored encrypted at app layer; placeholders here)
  stripe_publishable_key TEXT,
  stripe_secret_key TEXT,
  paystack_public_key TEXT,
  paystack_secret_key TEXT,
  -- email config
  smtp_host TEXT,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_institutions_slug ON institutions(slug);
CREATE INDEX idx_institutions_owner ON institutions(owner_user_id);
CREATE INDEX idx_institutions_status ON institutions(status);

-- ============= INSTITUTION USERS (membership join) =============
-- Each row binds a platform_user to an institution with a role + status.
CREATE TABLE institution_users (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','teacher','student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  UNIQUE(institution_id, user_id)
);
CREATE INDEX idx_inst_users_inst ON institution_users(institution_id);
CREATE INDEX idx_inst_users_user ON institution_users(user_id);
CREATE INDEX idx_inst_users_role ON institution_users(institution_id, role);

-- ============= STUDENT PROFILES =============
CREATE TABLE student_profiles (
  user_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  student_number TEXT NOT NULL,
  phone TEXT DEFAULT '',
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid','partial','unpaid')),
  total_fee REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  academic_status TEXT DEFAULT 'active' CHECK (academic_status IN ('active','probation','graduated','withdrawn')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, institution_id),
  FOREIGN KEY (user_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(institution_id, student_number)
);
CREATE INDEX idx_student_profiles_inst ON student_profiles(institution_id);

-- ============= TEACHER PROFILES =============
CREATE TABLE teacher_profiles (
  user_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  employee_number TEXT NOT NULL,
  phone TEXT DEFAULT '',
  assigned_courses TEXT DEFAULT '[]', -- JSON array of course_ids
  department TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, institution_id),
  FOREIGN KEY (user_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(institution_id, employee_number)
);
CREATE INDEX idx_teacher_profiles_inst ON teacher_profiles(institution_id);

-- ============= USER INVITES =============
CREATE TABLE user_invites (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student')),
  assigned_courses TEXT, -- JSON array of course_ids
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','used','expired')),
  expires_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  pending_user_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES platform_users(uid)
);
CREATE INDEX idx_invites_inst ON user_invites(institution_id);
CREATE INDEX idx_invites_token ON user_invites(token);
CREATE INDEX idx_invites_email ON user_invites(email);

-- ============= STUDENT APPLICATIONS =============
CREATE TABLE student_applications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  UNIQUE(institution_id, user_id)
);
CREATE INDEX idx_applications_inst ON student_applications(institution_id);
CREATE INDEX idx_applications_user ON student_applications(user_id);

-- ============= COURSES =============
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  teacher_id TEXT,
  category TEXT,
  thumbnail_url TEXT,
  level TEXT CHECK (level IS NULL OR level IN ('beginner','intermediate','advanced')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active','archived','draft')),
  fee REAL DEFAULT 0,
  max_students INTEGER,
  start_date TEXT,
  end_date TEXT,
  syllabus TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES platform_users(uid) ON DELETE SET NULL
);
CREATE INDEX idx_courses_inst ON courses(institution_id);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_status ON courses(status);

-- ============= COURSE CATEGORIES =============
CREATE TABLE course_categories (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(institution_id, name)
);

-- ============= MODULES =============
CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE INDEX idx_modules_course ON modules(course_id, order_index);

-- ============= LESSONS =============
CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  video_r2_key TEXT, -- R2 key for video
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE INDEX idx_lessons_module ON lessons(module_id, order_index);
CREATE INDEX idx_lessons_course ON lessons(course_id);

-- ============= LESSON MATERIALS (slides, PDFs, files in R2) =============
CREATE TABLE lesson_materials (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  title TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_type TEXT, -- 'pdf', 'slides', 'doc', 'image', 'other'
  file_size INTEGER,
  uploaded_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES platform_users(uid)
);
CREATE INDEX idx_lesson_materials_lesson ON lesson_materials(lesson_id);

-- ============= LESSON PROGRESS =============
CREATE TABLE lesson_progress (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  resume_position_seconds INTEGER DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(lesson_id, student_id)
);
CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id, institution_id);

-- ============= ENROLLMENTS =============
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','dropped')),
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completion_date TEXT,
  progress_percentage INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  UNIQUE(course_id, student_id)
);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_inst ON enrollments(institution_id);

-- ============= ASSIGNMENTS =============
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  teacher_id TEXT NOT NULL,
  file_url TEXT, -- reference link
  due_date TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  total_points INTEGER DEFAULT 100,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_assignments_inst ON assignments(institution_id);
CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignments_lesson ON assignments(lesson_id);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_status ON assignments(status);

-- ============= ASSIGNMENT SUBMISSIONS =============
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  submission_content TEXT,
  file_url TEXT, -- can be R2 key or external URL
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','graded','returned')),
  grade INTEGER,
  feedback TEXT,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  graded_at TEXT,
  graded_by TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(assignment_id, student_id)
);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_inst ON submissions(institution_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ============= QUIZZES =============
CREATE TABLE quizzes (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  time_limit_minutes INTEGER DEFAULT 15,
  questions TEXT NOT NULL, -- JSON array
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_quizzes_inst ON quizzes(institution_id);
CREATE INDEX idx_quizzes_course ON quizzes(course_id);
CREATE INDEX idx_quizzes_lesson ON quizzes(lesson_id);
CREATE INDEX idx_quizzes_status ON quizzes(status);

-- ============= QUIZ ATTEMPTS =============
CREATE TABLE quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  answers TEXT NOT NULL, -- JSON object {questionIdx: chosenOption}
  score INTEGER NOT NULL,
  questions_snapshot TEXT NOT NULL, -- JSON snapshot of quiz questions at attempt time
  status TEXT DEFAULT 'completed',
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);

-- ============= ATTENDANCE SESSIONS =============
-- A class session (one date+course). Records belong to a session.
CREATE TABLE attendance_sessions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  teacher_id TEXT,
  session_date TEXT NOT NULL,
  topic TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES platform_users(uid) ON DELETE SET NULL,
  UNIQUE(course_id, session_date)
);
CREATE INDEX idx_attendance_sessions_course ON attendance_sessions(course_id, session_date);

-- ============= ATTENDANCE RECORDS =============
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  marked_by TEXT,
  marked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(session_id, student_id)
);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_records_session ON attendance_records(session_id);

-- ============= LIVE CLASSES =============
CREATE TABLE live_classes (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  platform TEXT NOT NULL CHECK (platform IN ('zoom','google_meet','custom')),
  meeting_url TEXT,
  recording_r2_key TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed','cancelled')),
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_live_classes_inst ON live_classes(institution_id);
CREATE INDEX idx_live_classes_course ON live_classes(course_id);
CREATE INDEX idx_live_classes_teacher ON live_classes(teacher_id);
CREATE INDEX idx_live_classes_scheduled ON live_classes(scheduled_at);

-- ============= TIMETABLE ENTRIES =============
-- Recurring weekly schedule for a course (separate from one-off live_classes).
CREATE TABLE timetable_entries (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TEXT NOT NULL, -- HH:MM
  end_time TEXT NOT NULL,
  room TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_timetable_teacher ON timetable_entries(teacher_id, day_of_week);
CREATE INDEX idx_timetable_course ON timetable_entries(course_id);

-- ============= ANNOUNCEMENTS =============
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT, -- NULL = global to institution
  title TEXT DEFAULT 'Announcement',
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_announcements_inst ON announcements(institution_id, created_at DESC);
CREATE INDEX idx_announcements_course ON announcements(course_id);
CREATE INDEX idx_announcements_priority ON announcements(institution_id, priority);

-- ============= DISCUSSIONS (per-course threads) =============
CREATE TABLE discussions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT DEFAULT '',
  status TEXT DEFAULT 'open' CHECK (status IN ('open','locked','archived')),
  pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_discussions_course ON discussions(course_id, created_at DESC);
CREATE INDEX idx_discussions_status ON discussions(course_id, status, pinned);

-- ============= DISCUSSION POSTS =============
CREATE TABLE discussion_posts (
  id TEXT PRIMARY KEY,
  discussion_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_discussion_posts_discussion ON discussion_posts(discussion_id, created_at);

-- ============= CONVERSATIONS =============
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  participant_a_user_id TEXT NOT NULL,
  participant_b_user_id TEXT NOT NULL,
  last_message_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_a_user_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  FOREIGN KEY (participant_b_user_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  UNIQUE(institution_id, participant_a_user_id, participant_b_user_id)
);
CREATE INDEX idx_conversations_institution ON conversations(institution_id, updated_at DESC);
CREATE INDEX idx_conversations_participant_a ON conversations(participant_a_user_id, updated_at DESC);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b_user_id, updated_at DESC);

-- ============= DIRECT MESSAGES =============
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  conversation_id TEXT,
  from_user_id TEXT NOT NULL,
  from_user_name TEXT DEFAULT '',
  to_user_id TEXT NOT NULL,
  to_user_name TEXT DEFAULT '',
  content TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (from_user_id) REFERENCES platform_users(uid),
  FOREIGN KEY (to_user_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_messages_to ON messages(to_user_id, created_at DESC);
CREATE INDEX idx_messages_from ON messages(from_user_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(to_user_id, read_at, created_at DESC);

-- ============= NOTIFICATIONS =============
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'announcement', 'assignment', 'grade', 'message', 'invite', etc
  title TEXT NOT NULL,
  body TEXT,
  link TEXT, -- in-app deep link
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES platform_users(uid) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ============= PAYMENTS =============
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_id TEXT,
  amount_paid REAL NOT NULL,
  total_fee REAL NOT NULL,
  balance REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT, -- 'stripe', 'paystack', 'cash', 'bank_transfer'
  reference_number TEXT,
  gateway_transaction_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('paid','partial','unpaid','refunded','failed')),
  payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES platform_users(uid),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
CREATE INDEX idx_payments_inst ON payments(institution_id, payment_date DESC);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============= INVOICES =============
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_id TEXT,
  invoice_number TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  due_date TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','paid','overdue','void','partial')),
  pdf_r2_key TEXT,
  issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES platform_users(uid),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE(institution_id, invoice_number)
);
CREATE INDEX idx_invoices_inst ON invoices(institution_id, status);
CREATE INDEX idx_invoices_student ON invoices(student_id);

-- ============= REFUNDS =============
CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','processed')),
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (student_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_refunds_inst ON refunds(institution_id, status);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);

-- ============= CERTIFICATES =============
CREATE TABLE certificates (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  certificate_r2_key TEXT, -- PDF in R2
  verification_code TEXT UNIQUE NOT NULL,
  issued_date TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'issued' CHECK (status IN ('issued','revoked','pending')),
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES platform_users(uid),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE(student_id, course_id)
);
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_verification ON certificates(verification_code);

-- ============= CONTENT LIBRARY =============
CREATE TABLE content_library (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  r2_key TEXT,
  download_url TEXT,
  file_type TEXT NOT NULL, -- 'pdf', 'video', 'slides', 'doc', 'image'
  file_size INTEGER,
  category TEXT,
  download_count INTEGER DEFAULT 0,
  uploader_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (uploader_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_content_inst ON content_library(institution_id, file_type);
CREATE INDEX idx_content_category ON content_library(institution_id, category);

-- ============= CMS PAGES =============
CREATE TABLE cms_pages (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(institution_id, slug)
);

-- ============= FAQS =============
CREATE TABLE faqs (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- ============= BANNERS =============
CREATE TABLE banners (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  image_r2_key TEXT,
  link_url TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- ============= PERMISSIONS =============
-- Permissions matrix per role per institution. Custom overrides on top of defaults.
CREATE TABLE role_permissions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL, -- e.g. 'courses.create', 'finance.refund', 'students.suspend'
  allowed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(institution_id, role, permission_key)
);

-- ============= AUDIT LOG =============
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  institution_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL, -- 'create.course', 'update.student.status', etc
  target_table TEXT,
  target_id TEXT,
  metadata TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_inst ON audit_log(institution_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- ============= LOGIN HISTORY =============
CREATE TABLE login_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  institution_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES platform_users(uid)
);
CREATE INDEX idx_login_history_user ON login_history(user_id, created_at DESC);

-- ============= PASSWORD RESET TOKENS =============
-- Stored here for record/audit. Real reset is via Firebase Auth — we just track requests.
CREATE TABLE password_reset_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  institution_id TEXT,
  token TEXT NOT NULL UNIQUE,
  requested_by_user_id TEXT,
  ip_address TEXT,
  expires_at TEXT,
  used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_password_reset_email ON password_reset_requests(email, created_at DESC);
CREATE INDEX idx_password_reset_token ON password_reset_requests(token);
