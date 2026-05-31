export type TimestampLike = string | number | Date | null;

export type UserRole = 'owner' | 'admin' | 'teacher' | 'student';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type StudentLifecycleStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type TeacherApprovalStatus = 'pending' | 'approved' | 'suspended';
export type InstitutionType = 'school' | 'college' | 'training_center' | 'company';
export type CourseStatus = 'active' | 'archived' | 'draft';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'refunded' | 'failed';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type NotificationType = 'assignment' | 'grade' | 'announcement' | 'message' | 'invite' | 'system';

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  results: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdBy?: string;
  createdAt: TimestampLike;
  lastLogin?: TimestampLike;
  photoURL?: string;
  phone?: string;
  institutionId?: string;
  institution_id?: string;
}

export interface PlatformUser {
  uid: string;
  fullName: string;
  full_name?: string;
  email: string;
  phone: string;
  photoUrl?: string;
  photo_url?: string;
  isPlatformAdmin?: boolean;
  is_platform_admin?: boolean | number;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
  updatedAt: TimestampLike;
  updated_at?: TimestampLike;
  completedLessons?: string[];
  completed_lessons?: string[];
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  logo_url?: string;
  primaryColor: string;
  primary_color?: string;
  country: string;
  institutionType: InstitutionType;
  institution_type?: InstitutionType;
  ownerUserId: string;
  owner_user_id?: string;
  status: 'active' | 'pending' | 'suspended';
  timezone?: string;
  currency?: string;
  locale?: string;
  language?: string;
  emailSender?: string;
  email_sender?: string;
  paymentGateway?: string;
  payment_gateway?: string;
  emailNotifications?: boolean;
  email_notifications?: boolean;
  smsNotifications?: boolean;
  sms_notifications?: boolean;
  customDomain?: string;
  custom_domain?: string;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
  updatedAt: TimestampLike;
  updated_at?: TimestampLike;
}

export interface InstitutionUser {
  id: string;
  institutionId: string;
  institution_id?: string;
  userId: string;
  user_id?: string;
  uid?: string;
  fullName?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
  updatedAt: TimestampLike;
  updated_at?: TimestampLike;
}

export interface StudentProfile {
  userId: string;
  user_id?: string;
  institutionId?: string;
  institution_id?: string;
  studentNumber: string;
  student_number?: string;
  phone: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  payment_status?: 'paid' | 'partial' | 'unpaid';
  totalFee: number;
  total_fee?: number;
  amountPaid: number;
  amount_paid?: number;
  balance: number;
  parentGuardianName?: string;
  parent_guardian_name?: string;
  parentGuardianEmail?: string;
  parent_guardian_email?: string;
  parentGuardianPhone?: string;
  parent_guardian_phone?: string;
  notes?: string;
  registrationIp?: string;
  registration_ip?: string;
  applicationSubmittedAt?: TimestampLike;
  application_submitted_at?: TimestampLike;
  approvedAt?: TimestampLike;
  approved_at?: TimestampLike;
  approvedBy?: string | null;
  approved_by?: string | null;
  rejectedAt?: TimestampLike;
  rejected_at?: TimestampLike;
  rejectedBy?: string | null;
  rejected_by?: string | null;
  suspendedAt?: TimestampLike;
  suspended_at?: TimestampLike;
  suspendedBy?: string | null;
  suspended_by?: string | null;
  suspensionReason?: string | null;
  suspension_reason?: string | null;
  reactivatedAt?: TimestampLike;
  reactivated_at?: TimestampLike;
  lastLoginAt?: TimestampLike;
  last_login_at?: TimestampLike;
  isActive?: boolean | number;
  is_active?: boolean | number;
  academicStatus: 'active' | 'probation' | 'graduated' | 'withdrawn';
  academic_status?: 'active' | 'probation' | 'graduated' | 'withdrawn';
}

export interface TeacherProfile {
  userId: string;
  user_id?: string;
  institutionId?: string;
  institution_id?: string;
  employeeNumber: string;
  employee_number?: string;
  phone: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | string;
  address?: string;
  qualification?: string;
  profileImageUrl?: string | null;
  profile_image_url?: string | null;
  assignedCourses: string[];
  assigned_courses?: string[];
  department: string;
  notes?: string | null;
  approvedAt?: TimestampLike;
  approved_at?: TimestampLike;
  approvedBy?: string | null;
  approved_by?: string | null;
  suspendedAt?: TimestampLike;
  suspended_at?: TimestampLike;
  suspendedBy?: string | null;
  suspended_by?: string | null;
  reactivatedAt?: TimestampLike;
  reactivated_at?: TimestampLike;
  inviteSentAt?: TimestampLike;
  invite_sent_at?: TimestampLike;
  invitedBy?: string | null;
  invited_by?: string | null;
  lastLoginAt?: TimestampLike;
  last_login_at?: TimestampLike;
  isActive?: boolean | number;
  is_active?: boolean | number;
}

export interface TeacherAttendanceRecord {
  id: string;
  institutionId: string;
  institution_id?: string;
  teacherId: string;
  teacher_id?: string;
  attendanceDate: TimestampLike;
  attendance_date?: TimestampLike;
  status: 'present' | 'absent' | 'late';
  markedBy?: string | null;
  marked_by?: string | null;
  notes?: string | null;
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
}

export interface InvitationDeliveryPreview {
  provider: 'mock';
  delivered: boolean;
  inviteUrl: string;
  email: string;
  subject: string;
  body: string;
  temporaryPassword?: string;
  expiresAt?: TimestampLike;
}

export interface TeacherSummary {
  id: string;
  userId: string;
  user_id?: string;
  institutionId: string;
  institution_id?: string;
  inviteId?: string | null;
  invite_id?: string | null;
  inviteToken?: string | null;
  invite_token?: string | null;
  inviteStatus?: 'pending' | 'used' | 'expired' | null;
  invite_status?: 'pending' | 'used' | 'expired' | null;
  fullName: string;
  full_name?: string;
  email: string;
  phone?: string;
  gender?: string | null;
  address?: string | null;
  qualification?: string | null;
  profileImageUrl?: string | null;
  profile_image_url?: string | null;
  employeeNumber?: string | null;
  employee_number?: string | null;
  assignedCourses?: Course[];
  assigned_courses?: Course[];
  assignedCourseIds?: string[];
  assigned_course_ids?: string[];
  assignedCourseNames?: string[];
  assigned_course_names?: string[];
  assignedCoursesCount?: number;
  assigned_courses_count?: number;
  assignedStudentsCount?: number;
  assigned_students_count?: number;
  attendancePercentage?: number;
  attendance_percentage?: number;
  latestAttendanceStatus?: 'present' | 'absent' | 'late' | null;
  latest_attendance_status?: 'present' | 'absent' | 'late' | null;
  attendanceHistory?: TeacherAttendanceRecord[];
  attendance_history?: TeacherAttendanceRecord[];
  approvalStatus: TeacherApprovalStatus;
  approval_status?: TeacherApprovalStatus;
  activeStatus?: 'active' | 'inactive';
  active_status?: 'active' | 'inactive';
  averageStudentScore?: number | null;
  average_student_score?: number | null;
  averageQuizScore?: number | null;
  average_quiz_score?: number | null;
  averageAssignmentGrade?: number | null;
  average_assignment_grade?: number | null;
  courseCompletionRate?: number;
  course_completion_rate?: number;
  lastLoginAt?: TimestampLike;
  last_login_at?: TimestampLike;
  approvedAt?: TimestampLike;
  approved_at?: TimestampLike;
  approvedBy?: string | null;
  approved_by?: string | null;
  suspendedAt?: TimestampLike;
  suspended_at?: TimestampLike;
  suspendedBy?: string | null;
  suspended_by?: string | null;
  reactivatedAt?: TimestampLike;
  reactivated_at?: TimestampLike;
  inviteSentAt?: TimestampLike;
  invite_sent_at?: TimestampLike;
  invitedBy?: string | null;
  invited_by?: string | null;
  notes?: string | null;
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
  invitationPreview?: InvitationDeliveryPreview | null;
  invitation_preview?: InvitationDeliveryPreview | null;
}

export interface Course {
  id: string;
  institutionId?: string;
  institution_id?: string;
  title: string;
  course_name?: string;
  description: string;
  teacherId?: string;
  teacher_id?: string;
  teacherName?: string;
  teacher_name?: string;
  status: CourseStatus;
  fee: number;
  category?: string;
  syllabus?: string;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
  modules?: Module[];
  studentCount?: number;
  student_count?: number;
}

export interface Module {
  id: string;
  courseId?: string;
  course_id?: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  orderIndex?: number;
  order_index?: number;
}

export interface Lesson {
  id: string;
  moduleId?: string;
  module_id?: string;
  courseId?: string;
  course_id?: string;
  title: string;
  content: string;
  materials?: string[];
  completedBy?: string[];
  videoUrl?: string;
  video_url?: string;
  video_r2_key?: string;
  published?: boolean | number;
  durationMinutes?: number;
  duration_minutes?: number;
  orderIndex?: number;
  order_index?: number;
  completed?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  authorName?: string;
  author_name?: string;
}

export interface Enrollment {
  id: string;
  institutionId?: string;
  institution_id?: string;
  studentId: string;
  student_id?: string;
  studentName?: string;
  student_name?: string;
  studentEmail?: string;
  student_email?: string;
  courseId: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: TimestampLike;
  enrolled_at?: TimestampLike;
  completionDate?: TimestampLike;
  completion_date?: TimestampLike;
  progressPercentage?: number;
  progress_percentage?: number;
}

export interface UserInvite {
  id: string;
  email: string;
  fullName?: string;
  full_name?: string;
  role: UserRole;
  assignedCourses?: string[];
  assigned_courses?: string[];
  token: string;
  status: 'pending' | 'used' | 'expired';
  expiresAt: TimestampLike;
  expires_at?: TimestampLike;
  createdBy: string;
  created_by?: string;
  pendingUserId?: string;
  pending_user_id?: string;
  institutionId?: string;
  institution_id: string;
}

export interface StudentApplication {
  id: string;
  institutionId: string;
  institution_id?: string;
  userId: string;
  user_id?: string;
  fullName: string;
  full_name?: string;
  email: string;
  phone: string;
  status: StudentLifecycleStatus | 'approved';
  applicationSubmittedAt?: TimestampLike;
  application_submitted_at?: TimestampLike;
  approvedAt?: TimestampLike;
  approved_at?: TimestampLike;
  approvedBy?: string | null;
  approved_by?: string | null;
  rejectedAt?: TimestampLike;
  rejected_at?: TimestampLike;
  rejectedBy?: string | null;
  rejected_by?: string | null;
  registrationIp?: string | null;
  registration_ip?: string | null;
  parentGuardianName?: string | null;
  parent_guardian_name?: string | null;
  parentGuardianEmail?: string | null;
  parent_guardian_email?: string | null;
  parentGuardianPhone?: string | null;
  parent_guardian_phone?: string | null;
  notes?: string | null;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
  updatedAt: TimestampLike;
  updated_at?: TimestampLike;
}

export interface StudentActivity {
  id: string;
  type: 'application' | 'status' | 'attendance' | 'assessment' | 'enrollment' | 'login' | 'note' | 'system';
  title: string;
  description?: string;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
  actorId?: string | null;
  actor_id?: string | null;
  actorName?: string | null;
  actor_name?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface StudentSummary {
  id: string;
  userId: string;
  user_id?: string;
  institutionId: string;
  institution_id?: string;
  applicationId?: string | null;
  application_id?: string | null;
  studentNumber?: string;
  student_number?: string;
  fullName: string;
  full_name?: string;
  email: string;
  phone?: string;
  photoUrl?: string | null;
  photo_url?: string | null;
  status: StudentLifecycleStatus;
  applicationStatus?: StudentLifecycleStatus | 'approved';
  application_status?: StudentLifecycleStatus | 'approved';
  membershipStatus?: UserStatus;
  membership_status?: UserStatus;
  registrationIp?: string | null;
  registration_ip?: string | null;
  applicationSubmittedAt?: TimestampLike;
  application_submitted_at?: TimestampLike;
  approvedAt?: TimestampLike;
  approved_at?: TimestampLike;
  approvedBy?: string | null;
  approved_by?: string | null;
  rejectedAt?: TimestampLike;
  rejected_at?: TimestampLike;
  rejectedBy?: string | null;
  rejected_by?: string | null;
  suspendedAt?: TimestampLike;
  suspended_at?: TimestampLike;
  suspendedBy?: string | null;
  suspended_by?: string | null;
  suspensionReason?: string | null;
  suspension_reason?: string | null;
  reactivatedAt?: TimestampLike;
  reactivated_at?: TimestampLike;
  lastLoginAt?: TimestampLike;
  last_login_at?: TimestampLike;
  isActive?: boolean | number;
  is_active?: boolean | number;
  parentGuardianName?: string | null;
  parent_guardian_name?: string | null;
  parentGuardianEmail?: string | null;
  parent_guardian_email?: string | null;
  parentGuardianPhone?: string | null;
  parent_guardian_phone?: string | null;
  notes?: string | null;
  enrolledCourses?: Enrollment[];
  enrolled_courses?: Enrollment[];
  subjectNames?: string[];
  subject_names?: string[];
  enrollmentHistory?: Enrollment[];
  enrollment_history?: Enrollment[];
  progressPercentage?: number;
  progress_percentage?: number;
  completedLessons?: number;
  completed_lessons?: number;
  totalLessons?: number;
  total_lessons?: number;
  attendancePercentage?: number;
  attendance_percentage?: number;
  attendancePresent?: number;
  attendance_present?: number;
  attendanceAbsent?: number;
  attendance_absent?: number;
  attendanceLate?: number;
  attendance_late?: number;
  averageQuizScore?: number | null;
  average_quiz_score?: number | null;
  averageAssignmentGrade?: number | null;
  average_assignment_grade?: number | null;
  assessmentAverage?: number | null;
  assessment_average?: number | null;
  paymentStatus?: 'paid' | 'partial' | 'unpaid';
  payment_status?: 'paid' | 'partial' | 'unpaid';
  totalFee?: number;
  total_fee?: number;
  amountPaid?: number;
  amount_paid?: number;
  balance?: number;
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
  recentActivity?: StudentActivity[];
  recent_activity?: StudentActivity[];
}

export interface PaymentRecord {
  id: string;
  institutionId?: string;
  institution_id?: string;
  studentId: string;
  student_id?: string;
  studentName?: string;
  student_name?: string;
  courseId: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  amountPaid: number;
  amount_paid?: number;
  totalFee: number;
  total_fee?: number;
  balance: number;
  paymentDate: TimestampLike;
  payment_date?: TimestampLike;
  paymentMethod: string;
  payment_method?: string;
  referenceNumber: string;
  reference_number?: string;
  status: PaymentStatus;
}

export interface Announcement {
  id?: string;
  institutionId?: string;
  institution_id?: string;
  courseId?: string | null;
  course_id?: string | null;
  courseName?: string;
  course_name?: string;
  title?: string;
  content: string;
  message?: string;
  authorId: string;
  author_id?: string;
  authorName: string;
  author_name?: string;
  priority?: 'low' | 'normal' | 'high';
  createdAt: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
}

export interface Discussion {
  id: string;
  institutionId: string;
  institution_id?: string;
  courseId: string;
  course_id?: string;
  title: string;
  authorId: string;
  author_id?: string;
  authorName?: string;
  author_name?: string;
  status?: 'open' | 'locked' | 'archived';
  pinned?: boolean | number;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
  postCount?: number;
}

export interface DiscussionPost {
  id: string;
  discussionId: string;
  discussion_id?: string;
  authorId: string;
  author_id?: string;
  authorName: string;
  author_name?: string;
  content: string;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
}

export interface Message {
  id: string;
  institutionId: string;
  institution_id?: string;
  conversationId?: string;
  conversation_id?: string;
  fromUserId: string;
  from_user_id?: string;
  fromUserName?: string;
  from_user_name?: string;
  toUserId: string;
  to_user_id?: string;
  toUserName?: string;
  to_user_name?: string;
  content: string;
  readAt: TimestampLike;
  read_at?: TimestampLike;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
}

export interface Notification {
  id: string;
  institutionId: string;
  institution_id?: string;
  userId: string;
  user_id?: string;
  title: string;
  body: string;
  type: NotificationType;
  link?: string;
  readAt: TimestampLike;
  read_at?: TimestampLike;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
}

export interface Material {
  id: string;
  institutionId: string;
  institution_id?: string;
  name: string;
  title?: string;
  type: 'PDF' | 'Video' | 'Document' | 'Image' | 'Slides';
  file_type?: string;
  size: string;
  file_size?: number;
  category: string;
  downloadUrl: string;
  download_url?: string;
  uploadedBy: string;
  uploader_id?: string;
  downloads?: number;
  download_count?: number;
  createdAt: TimestampLike;
  created_at?: TimestampLike;
}

export interface Assignment {
  id: string;
  institutionId?: string;
  institution_id?: string;
  courseId?: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  lessonId?: string | null;
  lesson_id?: string | null;
  title: string;
  description: string;
  teacherId: string;
  teacher_id?: string;
  teacherName?: string;
  teacher_name?: string;
  fileUrl?: string;
  file_url?: string;
  dueDate?: TimestampLike;
  due_date?: TimestampLike;
  totalPoints?: number;
  total_points?: number;
  status?: 'draft' | 'published' | 'archived';
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignment_id?: string;
  assignmentTitle?: string;
  assignment_title?: string;
  studentId: string;
  student_id?: string;
  studentName?: string;
  student_name?: string;
  institutionId?: string;
  institution_id?: string;
  submissionContent?: string;
  submission_content?: string;
  fileUrl?: string;
  file_url?: string;
  notes?: string;
  status: 'pending' | 'graded' | 'returned';
  grade?: number | null;
  feedback?: string | null;
  submittedAt?: TimestampLike;
  submitted_at?: TimestampLike;
  gradedAt?: TimestampLike;
  graded_at?: TimestampLike;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer?: string;
}

export interface Quiz {
  id: string;
  institutionId?: string;
  institution_id?: string;
  courseId?: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  lessonId?: string | null;
  lesson_id?: string | null;
  teacherId: string;
  teacher_id?: string;
  title: string;
  timeLimitMinutes?: number;
  time_limit_minutes?: number;
  time_limit?: number;
  questions: QuizQuestion[];
  status: 'draft' | 'published' | 'archived';
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quiz_id?: string;
  quizTitle?: string;
  quiz_title?: string;
  studentId: string;
  student_id?: string;
  studentName?: string;
  student_name?: string;
  institutionId?: string;
  institution_id?: string;
  courseName?: string;
  course_name?: string;
  answers: Record<number, string>;
  score: number;
  questions?: QuizQuestion[];
  questions_snapshot?: QuizQuestion[];
  status?: string;
  submittedAt?: TimestampLike;
  submitted_at?: TimestampLike;
}

export interface AttendanceSession {
  id: string;
  institutionId?: string;
  institution_id?: string;
  courseId: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  teacherId?: string;
  teacher_id?: string;
  sessionDate: TimestampLike;
  session_date?: TimestampLike;
  topic?: string;
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
}

export interface AttendanceRecord {
  id: string;
  sessionId?: string;
  session_id?: string;
  institutionId?: string;
  institution_id?: string;
  courseId?: string;
  course_id?: string;
  studentId: string;
  student_id?: string;
  studentName?: string;
  student_name?: string;
  status: AttendanceStatus;
  markedBy?: string;
  marked_by?: string;
  markedAt?: TimestampLike;
  marked_at?: TimestampLike;
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  notes?: string;
}

export interface Invoice {
  id: string;
  institutionId?: string;
  institution_id?: string;
  studentId: string;
  student_id?: string;
  studentName?: string;
  student_name?: string;
  courseId?: string | null;
  course_id?: string | null;
  courseName?: string;
  course_name?: string;
  invoiceNumber: string;
  invoice_number?: string;
  amount: number;
  currency?: string;
  dueDate?: TimestampLike;
  due_date?: TimestampLike;
  status: 'open' | 'paid' | 'overdue' | 'void' | 'partial';
  pdfKey?: string;
  pdf_r2_key?: string;
  issuedAt?: TimestampLike;
  issued_at?: TimestampLike;
}

export interface Refund {
  id: string;
  institutionId?: string;
  institution_id?: string;
  paymentId: string;
  payment_id?: string;
  studentId: string;
  student_id?: string;
  amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedBy?: string;
  requested_by?: string;
  approvedBy?: string | null;
  approved_by?: string | null;
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  processedAt?: TimestampLike;
  processed_at?: TimestampLike;
}

export interface Certificate {
  id: string;
  institutionId?: string;
  institution_id?: string;
  studentId: string;
  student_id?: string;
  studentName?: string;
  student_name?: string;
  courseId: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  certificateKey?: string;
  certificate_r2_key?: string;
  verificationCode: string;
  verification_code?: string;
  issuedDate?: TimestampLike;
  issued_date?: TimestampLike;
  status?: 'issued' | 'revoked' | 'pending';
}

export interface TimetableEntry {
  id: string;
  institutionId?: string;
  institution_id?: string;
  courseId: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  teacherId: string;
  teacher_id?: string;
  dayOfWeek: number;
  day_of_week?: number;
  startTime: string;
  start_time?: string;
  endTime: string;
  end_time?: string;
  room?: string | null;
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
}

export interface LiveClass {
  id: string;
  institutionId?: string;
  institution_id?: string;
  courseId: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  teacherId: string;
  teacher_id?: string;
  title: string;
  scheduledAt?: TimestampLike;
  scheduled_at?: TimestampLike;
  dateTime?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  platform: 'zoom' | 'google_meet' | 'custom' | string;
  meetingUrl?: string;
  meeting_url?: string;
  meetingLink?: string;
  recordingKey?: string;
  recording_r2_key?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}

export interface InstitutionInput {
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  country?: string;
  institutionType: InstitutionType;
}

export interface CourseInput {
  title: string;
  description?: string;
  teacherId?: string;
  teacher_id?: string;
  fee?: number;
  status?: CourseStatus;
  category?: string;
  syllabus?: string;
}

export interface ModuleInput {
  title: string;
  description?: string;
  orderIndex?: number;
  order_index?: number;
}

export interface LessonInput {
  moduleId?: string;
  module_id?: string;
  courseId?: string;
  course_id?: string;
  title: string;
  content?: string;
  videoUrl?: string;
  video_url?: string;
  published?: boolean | number;
  durationMinutes?: number;
  duration_minutes?: number;
  orderIndex?: number;
  order_index?: number;
}

export interface AssignmentInput {
  title: string;
  description?: string;
  courseId?: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  lessonId?: string;
  lesson_id?: string;
  teacherId?: string;
  teacher_id?: string;
  fileUrl?: string;
  file_url?: string;
  dueDate?: string;
  due_date?: string;
  totalPoints?: number;
  total_points?: number;
  status?: 'draft' | 'published' | 'archived';
}

export interface QuizInput {
  title: string;
  courseId?: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  lessonId?: string;
  lesson_id?: string;
  teacherId?: string;
  teacher_id?: string;
  timeLimitMinutes?: number;
  time_limit_minutes?: number;
  time_limit?: number;
  questions: QuizQuestion[];
  status?: 'draft' | 'published' | 'archived';
}

export interface PaymentInput {
  studentId?: string;
  student_id?: string;
  courseId?: string;
  course_id?: string;
  amountPaid?: number;
  amount_paid?: number;
  totalFee?: number;
  total_fee?: number;
  paymentMethod?: string;
  payment_method?: string;
  referenceNumber?: string;
  reference_number?: string;
  status?: PaymentStatus;
}

export interface LiveClassInput {
  title: string;
  courseId?: string;
  course_id?: string;
  courseName?: string;
  course_name?: string;
  teacherId?: string;
  teacher_id?: string;
  dateTime?: string;
  scheduledAt?: string;
  scheduled_at?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  platform: string;
  meetingLink?: string;
  meetingUrl?: string;
  meeting_url?: string;
}

export interface AnnouncementInput {
  title?: string;
  content: string;
  courseId?: string;
  course_id?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface TimetableInput {
  courseId?: string;
  course_id?: string;
  dayOfWeek: number;
  day_of_week?: number;
  startTime: string;
  start_time?: string;
  endTime: string;
  end_time?: string;
  room?: string;
}
