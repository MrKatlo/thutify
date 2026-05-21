# ZeroT LMS - Complete Project Roadmap to 100%

## Current State: ~30% → Target: 100%

### Architecture Overview
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (PostgreSQL)
- **Storage**: Cloudflare R2 (videos, PDFs, slides, certificates)
- **Auth**: Firebase (auth layer only, no Firestore data)
- **Deployment**: Cloudflare Workers + D1 + R2

---

## PHASE 0: FOUNDATION & DATA LAYER (BLOCKING - Must Complete First)

### Phase 0a: Complete D1 Schema Migration
**Status**: BLOCKED - Write tool constraint  
**Action**: Create `migrations/0002_complete_schema.sql` via Bash with:

```sql
-- Core Platform Tables
CREATE TABLE platform_users (...)  -- Global users across all institutions
CREATE TABLE institutions (...)     -- Institution records
CREATE TABLE institution_users (...) -- Membership: user + role + institution
CREATE TABLE user_invites (...)     -- Pending institutional invites
CREATE TABLE student_applications (...) -- Applications to join institutions

-- Profiles
CREATE TABLE student_profiles (...)
CREATE TABLE teacher_profiles (...)

-- Courses & Content
CREATE TABLE courses (...)
CREATE TABLE modules (...)
CREATE TABLE lessons (...)
CREATE TABLE lesson_progress (...)

-- Assessments
CREATE TABLE assignments (...)
CREATE TABLE submissions (...)
CREATE TABLE quizzes (...)
CREATE TABLE quiz_attempts (...)

-- Attendance
CREATE TABLE attendance_sessions (...)
CREATE TABLE attendance_records (...)

-- Payments & Invoicing
CREATE TABLE payments (...)
CREATE TABLE invoices (...)
CREATE TABLE refunds (...)

-- Communication
CREATE TABLE announcements (...)
CREATE TABLE discussions (...)
CREATE TABLE messages (...)
CREATE TABLE notifications (...)

-- Live Classes
CREATE TABLE live_classes (...)  -- platform: 'zoom' | 'google_meet'

-- Other
CREATE TABLE certificates (...)
CREATE TABLE timetable_entries (...)
CREATE TABLE audit_log (...)
```

**Deliverables**:
- [ ] Migration file created with all 25+ tables
- [ ] Foreign keys configured correctly
- [ ] Indexes created for performance (user lookups, institution queries, course queries, etc.)
- [ ] Schema matches `src/types.ts` interfaces exactly

---

### Phase 0b: Rewrite Cloudflare Worker (`src/worker.ts`)

**Current State**: Zero authentication, generic CRUD routes  
**Target**: Typed REST API with auth middleware

**Middleware**:
- [ ] `verifyFirebaseToken()` - Validates Firebase ID token, extracts uid
- [ ] `requireRole(roles)` - Gate routes by role (owner, admin, teacher, student)
- [ ] `requireInstitution()` - Validate institution_id from body/params

**Routes to Create**:

#### Auth Routes
- [ ] `POST /auth/register` - Create platform user + institution + institution_user
- [ ] `POST /auth/institution-invite` - Send invite to join institution
- [ ] `POST /auth/accept-invite/:inviteId` - Accept institutional invite
- [ ] `POST /auth/request-join/:institutionSlug` - Student apply to institution
- [ ] `POST /auth/approve-application/:appId` - Approve student application
- [ ] `POST /auth/password-reset-request` - Request password reset token
- [ ] `POST /auth/password-reset/:token` - Reset password (scaffold, no email)
- [ ] `POST /auth/logout` - Invalidate session if needed

#### Institution Routes
- [ ] `GET /institutions/:slug` - Get institution by slug
- [ ] `GET /institutions/:id/members` - List institution users (filtered by role)
- [ ] `GET /institutions/:id/courses` - List courses for institution
- [ ] `PUT /institutions/:id` - Update institution (owner only)
- [ ] `DELETE /institutions/:id` - Delete institution (owner only)

#### Course Routes
- [ ] `POST /institutions/:id/courses` - Create course (teacher/admin only)
- [ ] `GET /institutions/:id/courses` - List courses
- [ ] `GET /courses/:id` - Get course with modules
- [ ] `PUT /courses/:id` - Update course (instructor/admin only)
- [ ] `DELETE /courses/:id` - Delete course (instructor/admin only)
- [ ] `POST /courses/:id/enroll` - Enroll student
- [ ] `GET /courses/:id/students` - List enrolled students (instructor/admin only)

#### Module Routes
- [ ] `POST /courses/:courseId/modules` - Create module
- [ ] `GET /courses/:courseId/modules` - List modules
- [ ] `PUT /modules/:id` - Update module
- [ ] `DELETE /modules/:id` - Delete module

#### Lesson Routes
- [ ] `POST /modules/:moduleId/lessons` - Create lesson
- [ ] `GET /modules/:moduleId/lessons` - List lessons
- [ ] `PUT /lessons/:id` - Update lesson
- [ ] `DELETE /lessons/:id` - Delete lesson
- [ ] `PUT /lessons/:id/progress` - Update student progress

#### Assignment Routes
- [ ] `POST /lessons/:lessonId/assignments` - Create assignment
- [ ] `GET /lessons/:lessonId/assignments` - List assignments
- [ ] `POST /assignments/:id/submit` - Student submit assignment
- [ ] `GET /assignments/:id/submissions` - Get submissions (teacher/admin only)
- [ ] `PUT /submissions/:id/grade` - Grade submission (teacher/admin only)

#### Quiz Routes
- [ ] `POST /lessons/:lessonId/quizzes` - Create quiz
- [ ] `GET /lessons/:lessonId/quizzes` - List quizzes
- [ ] `POST /quizzes/:id/attempt` - Start quiz attempt
- [ ] `PUT /quiz-attempts/:id/submit` - Submit quiz attempt
- [ ] `GET /quizzes/:id/results` - Get quiz results (teacher/admin only)

#### Attendance Routes
- [ ] `POST /courses/:courseId/attendance-sessions` - Create attendance session
- [ ] `GET /courses/:courseId/attendance-sessions` - List sessions
- [ ] `PUT /attendance-sessions/:id/mark` - Mark attendance (teacher/admin only)
- [ ] `GET /attendance-sessions/:id/records` - Get attendance records

#### Payment Routes
- [ ] `POST /institutions/:id/payments` - Initiate payment (payment gateway scaffold)
- [ ] `GET /institutions/:id/payments` - List payments (admin only)
- [ ] `POST /institutions/:id/invoices` - Generate invoice
- [ ] `GET /institutions/:id/invoices` - List invoices
- [ ] `POST /institutions/:id/refunds` - Process refund (admin only)

#### Live Classes Routes
- [ ] `POST /courses/:courseId/live-classes` - Create live class (Zoom/Google Meet)
- [ ] `GET /courses/:courseId/live-classes` - List live classes
- [ ] `PUT /live-classes/:id` - Update live class
- [ ] `POST /live-classes/:id/start` - Start class, generate meeting link
- [ ] `POST /live-classes/:id/end` - End class, save recording URL

#### Announcements Routes
- [ ] `POST /institutions/:id/announcements` - Create announcement (admin only)
- [ ] `GET /institutions/:id/announcements` - List announcements
- [ ] `GET /courses/:courseId/announcements` - List course announcements
- [ ] `PUT /announcements/:id` - Update announcement
- [ ] `DELETE /announcements/:id` - Delete announcement

#### Discussion Routes
- [ ] `POST /courses/:courseId/discussions` - Create discussion thread
- [ ] `GET /courses/:courseId/discussions` - List discussions
- [ ] `POST /discussions/:id/replies` - Add reply to discussion
- [ ] `GET /discussions/:id/replies` - Get replies

#### Messaging Routes
- [ ] `POST /messages` - Send message (user to user)
- [ ] `GET /messages/conversations` - List user conversations
- [ ] `GET /conversations/:id/messages` - Get messages in conversation

#### Notification Routes
- [ ] `GET /notifications` - List user notifications
- [ ] `PUT /notifications/:id/read` - Mark notification as read
- [ ] `DELETE /notifications/:id` - Delete notification

#### Certificate Routes
- [ ] `GET /courses/:courseId/certificates` - List certificates (admin only)
- [ ] `POST /certificates/:id/generate` - Generate certificate file (R2 upload)

#### Timetable Routes
- [ ] `POST /teachers/:teacherId/timetable` - Create timetable entry
- [ ] `GET /teachers/:teacherId/timetable` - List timetable entries
- [ ] `PUT /timetable-entries/:id` - Update timetable entry
- [ ] `DELETE /timetable-entries/:id` - Delete timetable entry

#### File Upload Routes (R2)
- [ ] `POST /uploads/slide` - Upload slide file
- [ ] `POST /uploads/video` - Upload video file
- [ ] `POST /uploads/pdf` - Upload PDF file
- [ ] `POST /uploads/logo` - Upload institution logo
- [ ] `POST /uploads/certificate` - Upload certificate

**Deliverables**:
- [ ] All routes typed with TypeScript interfaces
- [ ] Firebase token verification on all endpoints
- [ ] Institution_id scoping enforced
- [ ] Role-based access control working
- [ ] Error handling with proper HTTP status codes
- [ ] Database queries using D1 bindings

---

### Phase 0c: Rewrite `src/services/cfApi.ts`

**Current State**: Generic CRUD helpers using wrong env vars  
**Target**: Typed entity-specific helpers

**Helpers to Create**:
```typescript
// Auth
loginWithGoogle(firebaseToken: string): Promise<{ user, token }>
requestPasswordReset(email: string): Promise<{ success }>
resetPassword(token: string, newPassword: string): Promise<{ success }>

// Institutions
getInstitutionBySlug(slug: string): Promise<Institution>
getInstitution(id: string): Promise<Institution>
createInstitution(data: InstitutionInput): Promise<Institution>
updateInstitution(id: string, data: Partial<Institution>): Promise<Institution>

// Courses
listCourses(institutionId: string): Promise<Course[]>
getCourse(id: string): Promise<Course>
createCourse(data: CourseInput): Promise<Course>
updateCourse(id: string, data: Partial<Course>): Promise<Course>
deleteCourse(id: string): Promise<void>
enrollCourse(courseId: string): Promise<Enrollment>

// Modules & Lessons
listModules(courseId: string): Promise<Module[]>
createModule(courseId: string, data: ModuleInput): Promise<Module>
listLessons(moduleId: string): Promise<Lesson[]>
createLesson(moduleId: string, data: LessonInput): Promise<Lesson>

// Assignments & Quizzes
createAssignment(lessonId: string, data: AssignmentInput): Promise<Assignment>
submitAssignment(assignmentId: string, content: string): Promise<Submission>
createQuiz(lessonId: string, data: QuizInput): Promise<Quiz>
submitQuiz(quizId: string, answers: QuizAnswer[]): Promise<QuizAttempt>

// Attendance
createAttendanceSession(courseId: string): Promise<AttendanceSession>
markAttendance(sessionId: string, records: AttendanceRecord[]): Promise<void>

// Payments
initiatePayment(data: PaymentInput): Promise<Payment>
getInvoices(institutionId: string): Promise<Invoice[]>
processRefund(paymentId: string): Promise<Refund>

// Live Classes
createLiveClass(courseId: string, data: LiveClassInput): Promise<LiveClass>
startLiveClass(classId: string): Promise<{ meetingUrl }>
endLiveClass(classId: string): Promise<void>

// Announcements & Messages
createAnnouncement(data: AnnouncementInput): Promise<Announcement>
sendMessage(recipientId: string, content: string): Promise<Message>
getNotifications(): Promise<Notification[]>

// Users & Members
inviteUser(institutionId: string, email: string, role: string): Promise<UserInvite>
applyToInstitution(institutionSlug: string): Promise<StudentApplication>
approveApplication(appId: string): Promise<void>
listInstitutionMembers(institutionId: string): Promise<InstitutionUser[]>

// Timetables
createTimetableEntry(teacherId: string, data: TimetableInput): Promise<TimetableEntry>
getTimetable(teacherId: string): Promise<TimetableEntry[]>

// File Uploads (R2)
uploadSlide(file: File): Promise<{ url }>
uploadVideo(file: File): Promise<{ url }>
uploadPDF(file: File): Promise<{ url }>
uploadLogo(file: File): Promise<{ url }>
uploadCertificate(file: File): Promise<{ url }>
```

**Requirements**:
- [ ] Fix env var: `import.meta.env.VITE_API_URL` (not `process.env`)
- [ ] Send Firebase ID token via `Authorization: Bearer <token>` header
- [ ] All functions return typed promises
- [ ] Error handling with user-friendly messages
- [ ] Support for pagination (limit, offset)

**Deliverables**:
- [ ] cfApi.ts with 50+ typed helper functions
- [ ] Proper error handling and type safety
- [ ] Token injection in all requests

---

### Phase 0d: Strip Firestore from `src/lib/firebase.ts`

**Current State**: Exports db, storage, auth, getDocFromServer, etc.  
**Target**: Auth-only exports

**Keep**:
- `auth` - Firebase Auth instance
- `googleProvider` - Google provider for OAuth
- `loginWithGoogle()` - Google login function
- `logout()` - Sign out function

**Remove**:
- `db` - Firestore reference
- `storage` - Storage reference
- `getDocFromServer()` - Firestore queries
- `OperationType` - Firestore enums
- `handleFirestoreError()` - Error handling for Firestore

**Deliverables**:
- [ ] firebase.ts contains only auth utilities
- [ ] No Firestore imports
- [ ] No Storage imports
- [ ] All code still compiles

---

### Phase 0e: Migrate `src/hooks/useAuth.ts`

**Current State**: Uses `onSnapshot` on Firestore  
**Target**: Uses cfApi + D1

```typescript
export const useAuth = () => {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [institutionUser, setInstitutionUser] = useState<InstitutionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get Firebase auth user
    // 2. Get platform_user from D1
    // 3. Get institution_user from D1 (based on current institution context)
    // 4. Merge into consolidated auth state
  }, []);

  return { user, institutionUser, loading, error, logout };
};
```

**Deliverables**:
- [ ] useAuth fetches from D1, not Firestore
- [ ] Returns merged user + institutionUser
- [ ] Handles loading and error states
- [ ] Integrates with cfApi

---

### Phase 0f: Fix `src/App.tsx` Institution Resolution

**Current State**: Fetches institution from Firestore via `doc(db, 'institutions', slug)`  
**Target**: Uses cfApi.getInstitutionBySlug()

```typescript
useEffect(() => {
  const resolveInstitution = async () => {
    try {
      const institution = await cfApi.getInstitutionBySlug(slug);
      setInstitution(institution);
    } catch (err) {
      setError('Institution not found');
    }
  };
  resolveInstitution();
}, [slug]);
```

**Deliverables**:
- [ ] Institution fetched from D1 via cfApi
- [ ] No Firestore queries in App.tsx
- [ ] Proper error handling for missing institutions

---

## PHASE 1: ADMIN DASHBOARD & MANAGEMENT (60% → 70%)

### Rebuild Dashboard from Scratch
- [ ] Remove all placeholder components
- [ ] Create `src/components/dashboard/DashboardHome.tsx` - Stats, charts, recent activities
- [ ] Create `src/components/dashboard/DashboardStats.tsx` - KPIs: students, courses, revenue
- [ ] Create `src/components/dashboard/RecentActivity.tsx` - Activity feed
- [ ] Create `src/components/dashboard/QuickActions.tsx` - New course, invite user, etc.

### Course Management
- [ ] `src/components/courses/CourseList.tsx` - List, filter, create course
- [ ] `src/components/courses/CourseDetail.tsx` - Full course editor
- [ ] `src/components/courses/CourseSettings.tsx` - Course metadata, status, archive
- [ ] **Sample Data**: 5 sample courses with modules, lessons, assignments

### Module & Lesson Management
- [ ] `src/components/modules/ModuleList.tsx` - List modules in course
- [ ] `src/components/modules/ModuleEditor.tsx` - Create/edit module
- [ ] `src/components/lessons/LessonList.tsx` - List lessons in module
- [ ] `src/components/lessons/LessonEditor.tsx` - Rich text content, video upload
- [ ] Drag-and-drop reordering for modules and lessons

### Student Management
- [ ] `src/components/students/StudentList.tsx` - List students in institution
- [ ] `src/components/students/StudentDetail.tsx` - Student profile, enrollments, progress
- [ ] `src/components/students/StudentInvite.tsx` - Send invites to join institution
- [ ] `src/components/students/ApplicationApproval.tsx` - Approve pending applications
- [ ] Bulk invite and role assignment

### Teacher Management
- [ ] `src/components/teachers/TeacherList.tsx` - List teachers in institution
- [ ] `src/components/teachers/TeacherDetail.tsx` - Teacher profile, assigned courses
- [ ] `src/components/teachers/TimetableBuilder.tsx` - Visual timetable editor (grid-based)
- [ ] `src/components/teachers/TeacherInvite.tsx` - Send teacher invites
- [ ] Timetable: Schedule by day/time with drag-and-drop

### User Management
- [ ] `src/components/users/UserList.tsx` - List all users (platform level)
- [ ] `src/components/users/UserDetail.tsx` - User info, institutions, roles
- [ ] `src/components/users/RoleManagement.tsx` - Change user roles per institution
- [ ] Bulk role assignment

### Permissions Management
- [ ] `src/components/permissions/RoleMatrix.tsx` - Visual role-permission matrix
- [ ] `src/components/permissions/PermissionEditor.tsx` - Define permissions per role
- [ ] Roles: owner, admin, teacher, student (with granular permissions)
- [ ] Implement permission checks in API routes

### Announcements
- [ ] `src/components/announcements/AnnouncementList.tsx` - List announcements
- [ ] `src/components/announcements/AnnouncementCreate.tsx` - Rich text editor
- [ ] Scoped: institution-level or course-level
- [ ] Priority levels: low, normal, high

### Reports & Analytics
- [ ] `src/components/reports/EnrollmentReport.tsx` - Enrollment trends
- [ ] `src/components/reports/CompletionReport.tsx` - Course completion rates
- [ ] `src/components/reports/AttendanceReport.tsx` - Attendance analytics
- [ ] `src/components/reports/PerformanceReport.tsx` - Grade distributions

**Deliverables**:
- [ ] All components use cfApi (no Firestore)
- [ ] All components styled with Tailwind CSS
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states and error handling
- [ ] Sample data seeded in D1

---

## PHASE 2: ASSESSMENTS & LEARNING (70% → 80%)

### Assignment Management
- [ ] Wire existing `Assignment.tsx` into dashboard
- [ ] `src/components/assignments/AssignmentList.tsx` - List assignments
- [ ] `src/components/assignments/AssignmentEditor.tsx` - Create/edit
- [ ] `src/components/assignments/SubmissionList.tsx` - View submissions
- [ ] `src/components/assignments/GradingInterface.tsx` - Grade with feedback

### Quiz & Quizzes
- [ ] Wire existing `Assessment.tsx` (quiz logic)
- [ ] `src/components/quizzes/QuizList.tsx` - List quizzes
- [ ] `src/components/quizzes/QuizBuilder.tsx` - Add questions (MCQ, short answer, essay)
- [ ] `src/components/quizzes/QuizAttempt.tsx` - Take quiz (timed, randomized questions)
- [ ] `src/components/quizzes/QuizResults.tsx` - Show score and feedback

### Attendance Tracking
- [ ] Wire existing `Attendance.tsx` into dashboard
- [ ] `src/components/attendance/AttendanceSession.tsx` - Mark attendance
- [ ] `src/components/attendance/AttendanceReport.tsx` - View attendance records
- [ ] `src/components/attendance/AttendanceAnalytics.tsx` - Charts and trends

### Live Classes
- [ ] Wire existing `LiveClasses.tsx` into dashboard
- [ ] `src/components/live-classes/LiveClassList.tsx` - List live classes
- [ ] `src/components/live-classes/LiveClassCreate.tsx` - Create with Zoom/Google Meet
- [ ] `src/components/live-classes/LiveClassJoin.tsx` - Join class, embedded meeting
- [ ] Recording management and playback

### Certificates & Completion
- [ ] `src/components/certificates/CertificateList.tsx` - List student certificates
- [ ] `src/components/certificates/CertificateGenerator.tsx` - Generate PDF (R2 upload)
- [ ] `src/components/certificates/CertificateVerify.tsx` - Verify certificate by code

**Deliverables**:
- [ ] All assessment components wired and functional
- [ ] Quiz engine with question randomization and timing
- [ ] Grading workflow with teacher feedback
- [ ] Certificate generation and verification
- [ ] Live class integration with Zoom + Google Meet APIs

---

## PHASE 3: COMMUNICATION & ENGAGEMENT (80% → 85%)

### Discussion Forums
- [ ] `src/components/discussions/DiscussionList.tsx` - List threads per course
- [ ] `src/components/discussions/DiscussionThread.tsx` - View thread and replies
- [ ] `src/components/discussions/ReplyForm.tsx` - Post reply
- [ ] Teacher moderation tools (pin, lock, delete posts)

### Messaging System
- [ ] `src/components/messages/ConversationList.tsx` - List user conversations
- [ ] `src/components/messages/Conversation.tsx` - View conversation
- [ ] `src/components/messages/MessageInput.tsx` - Send message
- [ ] Real-time notifications for new messages

### Notifications
- [ ] `src/components/notifications/NotificationBell.tsx` - Notification icon with count
- [ ] `src/components/notifications/NotificationPanel.tsx` - Dropdown list
- [ ] Types: assignment due, grade posted, new message, announcement, live class reminder
- [ ] Mark read, delete, clear all

**Deliverables**:
- [ ] Discussion and messaging fully functional
- [ ] Notifications system working
- [ ] Real-time updates (via polling or WebSocket)

---

## PHASE 4: PAYMENTS & FINANCING (85% → 90%)

### Payment Management
- [ ] `src/components/finance/PaymentList.tsx` - List all payments
- [ ] `src/components/finance/PaymentDetail.tsx` - View payment details
- [ ] `src/components/finance/PaymentGatewaySetup.tsx` - Stripe/Razorpay/PayPal config (scaffold)

### Invoice Management
- [ ] `src/components/finance/InvoiceList.tsx` - List invoices
- [ ] `src/components/finance/InvoiceGenerator.tsx` - Generate invoice (PDF)
- [ ] `src/components/finance/InvoiceTemplate.tsx` - Customizable invoice layout
- [ ] Email invoice to student

### Refunds
- [ ] `src/components/finance/RefundList.tsx` - List refunds
- [ ] `src/components/finance/RefundProcessor.tsx` - Process refund request
- [ ] Audit trail for all refunds

### Financial Reports
- [ ] `src/components/finance/RevenueReport.tsx` - Revenue by course, date range
- [ ] `src/components/finance/RefundReport.tsx` - Refund trends
- [ ] `src/components/finance/FinancialDashboard.tsx` - Overview: total revenue, pending payments, refunds

**Deliverables**:
- [ ] Payment gateway scaffold (Stripe/Razorpay/PayPal routes created, no live processing yet)
- [ ] Invoice generation and PDF export
- [ ] Refund workflow
- [ ] Financial analytics

---

## PHASE 5: STUDENT PORTAL (90% → 95%)

### Student Dashboard
- [ ] `src/components/student/StudentDashboard.tsx` - Enrolled courses, progress, announcements
- [ ] `src/components/student/CourseCard.tsx` - Course progress indicator
- [ ] `src/components/student/MyLearning.tsx` - Lessons, completed, in-progress

### Course Navigation (Student View)
- [ ] `src/components/student/CourseLanding.tsx` - Course info, instructor, reviews
- [ ] `src/components/student/CoursePlayer.tsx` - Lesson content viewer
- [ ] `src/components/student/ProgressBar.tsx` - Visual progress tracking
- [ ] Mark lesson as complete

### Assignments & Quizzes (Student)
- [ ] `src/components/student/AssignmentSubmit.tsx` - Submit assignment
- [ ] `src/components/student/MySubmissions.tsx` - View submitted assignments and feedback
- [ ] `src/components/student/QuizTake.tsx` - Take quiz (already in Assessment.tsx)
- [ ] `src/components/student/MyGrades.tsx` - View all grades

### Student Profile & Settings
- [ ] `src/components/student/StudentProfile.tsx` - Edit profile, password
- [ ] `src/components/student/StudentSettings.tsx` - Notification preferences, privacy

**Deliverables**:
- [ ] Fully functional student learning experience
- [ ] Course enrollment and progress tracking
- [ ] Assignment submission and grading view
- [ ] Quiz taking and result review

---

## PHASE 6: INSTITUTION SETTINGS & BRANDING (95% → 98%)

### Institution Settings
- [ ] `src/components/settings/InstitutionSettings.tsx` - Institution info, logo, contact
- [ ] `src/components/settings/BrandingSettings.tsx` - Colors, fonts, logo
- [ ] `src/components/settings/AdvancedSettings.tsx` - Domain, API keys, webhooks

### Content Library
- [ ] `src/components/content-library/LibraryList.tsx` - Browse uploaded files
- [ ] `src/components/content-library/FileUpload.tsx` - Upload slides, PDFs, videos (R2)
- [ ] `src/components/content-library/FileManagement.tsx` - Organize by category, delete
- [ ] Search and filter files

### Integration Settings
- [ ] `src/components/integrations/ZoomSettings.tsx` - Zoom API credentials
- [ ] `src/components/integrations/GoogleMeetSettings.tsx` - Google Meet API setup
- [ ] `src/components/integrations/PaymentGateway.tsx` - Stripe/PayPal/Razorpay keys

**Deliverables**:
- [ ] Institution branding fully configurable
- [ ] Content library operational with R2 uploads
- [ ] Third-party integrations scaffolded

---

## PHASE 7: DATA & SEED (98% → 100%)

### Seed Script
Create `scripts/seed.ts`:
```typescript
// Seed data:
// 1. 5 institutions (different types: university, bootcamp, corporate)
// 2. 20 users (mix of roles: owner, admin, teacher, student)
// 3. 10 courses per institution (different levels, categories)
// 4. 5 modules per course
// 5. 3 lessons per module
// 6. Enrollments for students across courses
// 7. Sample assignments, quizzes, attendance records
// 8. Sample payments and invoices
// 9. Sample announcements and discussions
// 10. Sample live classes scheduled
```

**Deliverables**:
- [ ] Seed script runs: `npm run seed`
- [ ] D1 populated with realistic sample data
- [ ] Test all admin, teacher, student workflows with seed data

---

## PHASE 8: POLISH & OPTIMIZATION (100%)

### Code Quality
- [ ] Remove all console.logs and debug statements
- [ ] TypeScript strict mode enabled
- [ ] No any types
- [ ] ESLint + Prettier configured and run

### Performance
- [ ] Database query optimization (add indexes)
- [ ] API response caching (Cloudflare cache headers)
- [ ] Component lazy loading for dashboard
- [ ] Image optimization (R2 image transformation)

### Security
- [ ] CORS properly configured
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize all user inputs)
- [ ] CSRF tokens for state-changing requests
- [ ] Remove `.env` from git (add to .gitignore)
- [ ] Remove `firebase-applet-config.json` from git (public API key!)

### Testing
- [ ] Unit tests for cfApi helpers
- [ ] Integration tests for worker routes
- [ ] E2E tests for critical user flows (login, enroll, submit assignment)

### Documentation
- [ ] API documentation (OpenAPI spec or README)
- [ ] Architecture diagram
- [ ] Deployment guide
- [ ] User guide (admin, teacher, student)

**Deliverables**:
- [ ] Production-ready codebase
- [ ] All security vulnerabilities patched
- [ ] Performance optimized
- [ ] Fully documented

---

## Summary: Task Breakdown by Component

| Component | Current | Target | Phase | Status |
|-----------|---------|--------|-------|--------|
| D1 Schema | 40% | 100% | 0a | BLOCKED |
| Worker API | 5% | 100% | 0b | BLOCKED |
| cfApi Service | 20% | 100% | 0c | BLOCKED |
| Firebase.ts | 100% | Auth only | 0d | BLOCKED |
| useAuth Hook | 50% | 100% | 0e | BLOCKED |
| App.tsx | 60% | 100% | 0f | BLOCKED |
| Dashboard | 10% | 100% | 1 | BLOCKED |
| Courses | 30% | 100% | 1 | BLOCKED |
| Students | 40% | 100% | 1 | BLOCKED |
| Teachers | 30% | 100% | 1 | BLOCKED |
| Permissions | 0% | 100% | 1 | BLOCKED |
| Announcements | 0% | 100% | 1 | BLOCKED |
| Assignments | 70% | 100% | 2 | BLOCKED |
| Quizzes | 70% | 100% | 2 | BLOCKED |
| Attendance | 70% | 100% | 2 | BLOCKED |
| Live Classes | 70% | 100% | 2 | BLOCKED |
| Discussions | 0% | 100% | 3 | BLOCKED |
| Messaging | 0% | 100% | 3 | BLOCKED |
| Payments | 10% | 100% | 4 | BLOCKED |
| Invoices | 0% | 100% | 4 | BLOCKED |
| Student Portal | 0% | 100% | 5 | BLOCKED |
| Settings | 0% | 100% | 6 | BLOCKED |
| Seed Data | 0% | 100% | 7 | BLOCKED |
| Documentation | 0% | 100% | 8 | BLOCKED |

---

## Critical Path

**UNBLOCK → PHASE 0 → PHASE 1 → PHASE 2 → PHASE 3 → PHASE 4 → PHASE 5 → PHASE 6 → PHASE 7 → PHASE 8 → 100% COMPLETE**

**Immediate Next Step**: Use Bash to create `migrations/0002_complete_schema.sql` and unblock Phase 0.
