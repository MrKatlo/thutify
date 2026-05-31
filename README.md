Thutify 

Thutify LMS is a multi-tenant learning management system built with React, Vite, Tailwind CSS, Cloudflare Workers, D1, R2, and Firebase Authentication.

This repository is now aligned around the completed Phase 0 foundation:

- `0a` complete D1 schema migration in [migrations/0002_complete_schema.sql](./migrations/0002_complete_schema.sql)
- student lifecycle schema extension in [migrations/0003_student_module.sql](./migrations/0003_student_module.sql)
- teacher lifecycle schema extension in [migrations/0004_teacher_module.sql](./migrations/0004_teacher_module.sql)
- `0b` typed Cloudflare Worker API in [src/worker.ts](./src/worker.ts)
- `0c` typed frontend API client in [src/services/cfApi.ts](./src/services/cfApi.ts)
- `0d` auth-only Firebase utilities in [src/lib/firebase.ts](./src/lib/firebase.ts)
- `0e` D1-backed auth hook in [src/hooks/useAuth.ts](./src/hooks/useAuth.ts)
- `0f` institution resolution through the API in [src/App.tsx](./src/App.tsx)

## Stack

- Frontend: React 19, Vite, Tailwind CSS
- Backend: Cloudflare Workers with Hono
- Database: Cloudflare D1
- Object Storage: Cloudflare R2
- Authentication: Firebase Auth

Note: Cloudflare D1 is SQLite-compatible, not PostgreSQL.

## Phase 0 Summary

### Data Layer

The Phase 0 schema includes platform users, institutions, memberships, invites, student applications, profiles, courses, modules, lessons, enrollments, assignments, submissions, quizzes, quiz attempts, attendance, payments, invoices, refunds, announcements, discussions, messages, notifications, live classes, certificates, timetable entries, content library records, password reset requests, and audit logging.

The student module extension adds:

- application lifecycle timestamps and actors
- guardian and notes fields on student applications and student profiles
- registration IP capture
- last-login tracking
- activation, rejection, and suspension metadata
- indexes for student application and profile lookups

The teacher module extension adds:

- invitation-ready teacher account creation
- approval, suspension, reactivation, and invite metadata on teacher profiles
- dedicated teacher attendance records
- employee, qualification, address, and profile metadata
- indexes for teacher lookup and attendance analytics

### Worker API

The Worker now provides:

- Firebase bearer-token verification
- institution membership and role checks
- student lifecycle routes for application review, student list/detail, manual student creation, and suspend/activate flows
- teacher lifecycle routes for account creation, approval, assignment, attendance, and performance
- public institution lookup by slug
- institution, course, module, lesson, assignment, quiz, attendance, payment, live-class, announcement, discussion, messaging, notification, certificate, timetable, and upload routes
- compatibility routes used by older admin dashboard components

### Frontend API and Auth

The frontend now uses `import.meta.env.VITE_API_URL`, injects Firebase ID tokens automatically, and resolves institution/user state from the Worker and D1 instead of Firestore.

The Students workspace in [src/components/StudentManagement.tsx](./src/components/StudentManagement.tsx) now powers:

- `All Students`
- `Add Student`
- `Student Profiles`
- `Student Progress`
- `Enrollment Management`
- `Student Attendance`
- `Student Performance`
- `Suspend / Activate Students`
- `Export Students`

The Teachers workspace in [src/components/TeacherManagement.tsx](./src/components/TeacherManagement.tsx) now powers:

- `All Teachers`
- `Add Teacher`
- `Teacher Profiles`
- `Assign Courses`
- `Teacher Performance`
- `Teacher Approval`
- `Teacher Attendance`

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- Cloudflare account and Wrangler configuration
- Firebase project config in `firebase-applet-config.json`

### Install

```bash
npm install
```

### Environment

Set the API base URL for the frontend:

```bash
VITE_API_URL=/api
```

Configure your Cloudflare and Firebase values through the existing Wrangler and local env files used by this repo.

## Database Migration

Apply the Phase 0 schema to D1:

```bash
wrangler d1 migrations apply lms
```

Important:

- [migrations/0002_complete_schema.sql](./migrations/0002_complete_schema.sql) is destructive for legacy `0001` tables
- use it on a clean database or after planning a data migration
- [migrations/0003_student_module.sql](./migrations/0003_student_module.sql) must be applied anywhere you deploy the new student workflow
- [migrations/0004_teacher_module.sql](./migrations/0004_teacher_module.sql) must be applied anywhere you deploy the new teacher workflow

For local development specifically:

```bash
npx wrangler d1 migrations apply lms --local
```

## Development Commands

```bash
npm run dev
npm run dev:worker
npm run dev:full
npm run lint
npm run build
npm run test:phase0
```

## Testing and Verification

The Phase 0 verification flow currently includes:

- TypeScript compile check with `npm run lint`
- production build with `npm run build`
- in-memory D1/R2 smoke tests with `npm run test:phase0`

The smoke test in [scripts/test-phase0.ts](./scripts/test-phase0.ts) validates:

- migration execution against SQLite-compatible D1 SQL for `0002`, `0003`, and `0004`
- owner registration and institution bootstrap
- public institution lookup by slug
- password reset request and reset scaffold
- student application submission
- pending application visibility
- approval-first enrollment flow
- suspend and reactivate lifecycle controls
- manual student creation without initial course assignment
- student detail retrieval and login activity capture
- teacher account creation with invite preview
- teacher course assignment
- teacher approval, suspension, and reactivation
- teacher membership activation and login activity capture
- teacher attendance and performance analytics
- course, module, and lesson creation
- student enrollment
- lesson progress updates
- quiz creation and submission
- R2-backed PDF upload and retrieval
- current-user lookup

## Student Workflow

The current student model is approval-first and course-agnostic:

1. A learner applies to an institution.
2. The application is visible immediately in the Students area with `pending` status.
3. An owner or admin can approve, reject, suspend, or reactivate the student.
4. Student access is created independently of course enrollment.
5. Courses can be assigned later through the enrollment flow.

This is implemented through:

- `student_applications` for application lifecycle
- `institution_users` for institutional access
- `student_profiles` for persistent student metadata
- `enrollments` for the many-to-many student-to-course relationship

## Teacher Workflow

The teacher model is admin-created and invitation-driven:

1. An owner or admin creates a teacher from the dashboard.
2. The system provisions the teacher account and stores a mock invite preview for now.
3. Teachers do not use a public signup or a separate teacher login route.
4. Teachers sign in through the normal institution login page.
5. Owners and admins can approve, suspend, reactivate, and assign courses later.

This is implemented through:

- `institution_users` for institutional role and access status
- `teacher_profiles` for teacher metadata and lifecycle state
- `user_invites` for invitation token and onboarding preview
- `teacher_attendance_records` for monthly attendance tracking
- `courses.teacher_id` for current subject assignment

## UI Testing

Recommended manual QA flow:

1. Start the app with `npm run dev:full`
2. Apply local migrations with `npx wrangler d1 migrations apply lms --local`
3. Register a school at `/signup-institution`
4. Log in at `/<slug>/login`
5. Open the `Students` sidebar group
6. Verify `All Students` shows pending applications immediately
7. Use `Add Student` to create a manual student without choosing a course
8. Approve a pending student from `All Students` or `Enrollment Management`
9. Suspend and reactivate a student from `Suspend / Activate Students`
10. Open `Student Profiles`, `Student Progress`, `Student Attendance`, and `Student Performance` to confirm live data loads
11. Use `Export Students` to download CSV and Excel-compatible exports
12. Open `Teachers > Add Teacher` and create a teacher with or without immediate course assignment
13. Copy the temporary password from the invite preview card
14. Open `Teachers > All Teachers`, `Teacher Profiles`, `Assign Courses`, `Teacher Approval`, and `Teacher Attendance`
15. Approve the teacher, assign courses, mark attendance, then sign in through `/<slug>/login` using the same institution login page

Expected behavior:

- initial student approval does not require course selection
- approved students can exist with zero enrolled subjects
- pending, approved, rejected, and suspended states are visible throughout the student views
- course enrollment remains a later, separate action
- teachers never use a public signup flow
- teachers never use a separate teacher login page
- invite preview exposes temporary credentials until a real email provider is added

## Key Files

- [migrations/0002_complete_schema.sql](./migrations/0002_complete_schema.sql)
- [migrations/0003_student_module.sql](./migrations/0003_student_module.sql)
- [migrations/0004_teacher_module.sql](./migrations/0004_teacher_module.sql)
- [src/worker.ts](./src/worker.ts)
- [src/services/cfApi.ts](./src/services/cfApi.ts)
- [src/components/StudentManagement.tsx](./src/components/StudentManagement.tsx)
- [src/components/TeacherManagement.tsx](./src/components/TeacherManagement.tsx)
- [src/hooks/useAuth.ts](./src/hooks/useAuth.ts)
- [src/lib/firebase.ts](./src/lib/firebase.ts)
- [src/App.tsx](./src/App.tsx)
- [scripts/test-phase0.ts](./scripts/test-phase0.ts)

## Known Follow-ups

- the frontend production bundle is still large and should be code-split in later phases
- password reset is scaffolded and does not send email yet
- the new schema is ready for seed data, but Phase 7 seed generation is still separate work
- Phase 1+ dashboard, learning, communication, payments, and student portal work remains after this foundation layer
