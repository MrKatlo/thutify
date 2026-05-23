-- D1 Migration 0003: Student lifecycle and admin workflow support

ALTER TABLE student_applications ADD COLUMN application_submitted_at TEXT;
ALTER TABLE student_applications ADD COLUMN approved_at TEXT;
ALTER TABLE student_applications ADD COLUMN approved_by TEXT;
ALTER TABLE student_applications ADD COLUMN rejected_at TEXT;
ALTER TABLE student_applications ADD COLUMN rejected_by TEXT;
ALTER TABLE student_applications ADD COLUMN registration_ip TEXT;
ALTER TABLE student_applications ADD COLUMN parent_guardian_name TEXT;
ALTER TABLE student_applications ADD COLUMN parent_guardian_email TEXT;
ALTER TABLE student_applications ADD COLUMN parent_guardian_phone TEXT;
ALTER TABLE student_applications ADD COLUMN notes TEXT;

UPDATE student_applications
SET application_submitted_at = COALESCE(application_submitted_at, created_at)
WHERE application_submitted_at IS NULL;

CREATE INDEX idx_student_applications_status ON student_applications(institution_id, status);
CREATE INDEX idx_student_applications_submitted_at ON student_applications(institution_id, application_submitted_at DESC);

ALTER TABLE student_profiles ADD COLUMN parent_guardian_name TEXT;
ALTER TABLE student_profiles ADD COLUMN parent_guardian_email TEXT;
ALTER TABLE student_profiles ADD COLUMN parent_guardian_phone TEXT;
ALTER TABLE student_profiles ADD COLUMN notes TEXT;
ALTER TABLE student_profiles ADD COLUMN registration_ip TEXT;
ALTER TABLE student_profiles ADD COLUMN application_submitted_at TEXT;
ALTER TABLE student_profiles ADD COLUMN approved_at TEXT;
ALTER TABLE student_profiles ADD COLUMN approved_by TEXT;
ALTER TABLE student_profiles ADD COLUMN rejected_at TEXT;
ALTER TABLE student_profiles ADD COLUMN rejected_by TEXT;
ALTER TABLE student_profiles ADD COLUMN suspended_at TEXT;
ALTER TABLE student_profiles ADD COLUMN suspended_by TEXT;
ALTER TABLE student_profiles ADD COLUMN suspension_reason TEXT;
ALTER TABLE student_profiles ADD COLUMN reactivated_at TEXT;
ALTER TABLE student_profiles ADD COLUMN last_login_at TEXT;
ALTER TABLE student_profiles ADD COLUMN is_active INTEGER DEFAULT 0;

UPDATE student_profiles
SET is_active = COALESCE(is_active, 0)
WHERE is_active IS NULL;

CREATE INDEX idx_student_profiles_active ON student_profiles(institution_id, is_active);
CREATE INDEX idx_student_profiles_login ON student_profiles(institution_id, last_login_at DESC);
