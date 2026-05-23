ALTER TABLE teacher_profiles ADD COLUMN gender TEXT;
ALTER TABLE teacher_profiles ADD COLUMN address TEXT;
ALTER TABLE teacher_profiles ADD COLUMN qualification TEXT;
ALTER TABLE teacher_profiles ADD COLUMN profile_image_url TEXT;
ALTER TABLE teacher_profiles ADD COLUMN notes TEXT;
ALTER TABLE teacher_profiles ADD COLUMN approved_at TEXT;
ALTER TABLE teacher_profiles ADD COLUMN approved_by TEXT;
ALTER TABLE teacher_profiles ADD COLUMN suspended_at TEXT;
ALTER TABLE teacher_profiles ADD COLUMN suspended_by TEXT;
ALTER TABLE teacher_profiles ADD COLUMN reactivated_at TEXT;
ALTER TABLE teacher_profiles ADD COLUMN invite_sent_at TEXT;
ALTER TABLE teacher_profiles ADD COLUMN invited_by TEXT;
ALTER TABLE teacher_profiles ADD COLUMN last_login_at TEXT;
ALTER TABLE teacher_profiles ADD COLUMN is_active INTEGER DEFAULT 0;

UPDATE teacher_profiles
SET is_active = COALESCE(is_active, 0)
WHERE is_active IS NULL;

CREATE INDEX idx_teacher_profiles_employee ON teacher_profiles(institution_id, employee_number);
CREATE INDEX idx_teacher_profiles_active ON teacher_profiles(institution_id, is_active);
CREATE INDEX idx_teacher_profiles_login ON teacher_profiles(institution_id, last_login_at DESC);

CREATE TABLE teacher_attendance_records (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  attendance_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES platform_users(uid) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES platform_users(uid) ON DELETE SET NULL,
  UNIQUE(institution_id, teacher_id, attendance_date)
);

CREATE INDEX idx_teacher_attendance_teacher ON teacher_attendance_records(institution_id, teacher_id, attendance_date DESC);
CREATE INDEX idx_teacher_attendance_date ON teacher_attendance_records(institution_id, attendance_date DESC);
