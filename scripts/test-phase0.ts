import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { createApp, type Env } from '../src/worker';

type JsonRecord = Record<string, unknown>;

interface SqlStatement {
  bind(params: unknown[]): void;
  step(): boolean;
  getAsObject(): JsonRecord;
  free(): void;
}

interface SqlDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqlStatement;
  getRowsModified(): number;
}

interface SqlModule {
  Database: new () => SqlDatabase;
}

class FakeD1PreparedStatement {
  private params: unknown[] = [];

  constructor(private readonly db: SqlDatabase, private readonly sql: string) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async all<T = JsonRecord>() {
    const statement = this.db.prepare(this.sql);
    statement.bind(this.params);
    const results: T[] = [];
    while (statement.step()) {
      results.push(statement.getAsObject() as T);
    }
    statement.free();
    return { results };
  }

  async first<T = JsonRecord>() {
    const result = await this.all<T>();
    return result.results[0] ?? null;
  }

  async run() {
    const statement = this.db.prepare(this.sql);
    statement.bind(this.params);
    statement.step();
    statement.free();
    return {
      success: true,
      meta: {
        changes: this.db.getRowsModified(),
      },
    };
  }
}

class FakeD1Database {
  constructor(private readonly db: SqlDatabase) {}

  prepare(sql: string) {
    return new FakeD1PreparedStatement(this.db, sql);
  }
}

interface StoredObject {
  bytes: Uint8Array;
  httpMetadata: {
    contentType?: string;
  };
}

class FakeR2ObjectBody {
  readonly body: ReadableStream<Uint8Array>;
  readonly etag: string;
  readonly httpMetadata: StoredObject['httpMetadata'];

  constructor(private readonly storedObject: StoredObject) {
    this.body = new Blob([storedObject.bytes]).stream() as ReadableStream<Uint8Array>;
    this.etag = `etag-${storedObject.bytes.length}`;
    this.httpMetadata = storedObject.httpMetadata;
  }
}

class FakeR2Bucket {
  private readonly objects = new Map<string, StoredObject>();

  async put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string,
    options?: { httpMetadata?: { contentType?: string } },
  ) {
    const bytes =
      typeof value === 'string'
        ? new TextEncoder().encode(value)
        : value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));

    this.objects.set(key, {
      bytes,
      httpMetadata: options?.httpMetadata || {},
    });
  }

  async get(key: string) {
    const storedObject = this.objects.get(key);
    return storedObject ? new FakeR2ObjectBody(storedObject) : null;
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}

interface TestResponse {
  response: Response;
  json: unknown;
  text: string;
}

const verificationMap = {
  'owner-token': {
    uid: 'owner-user',
    email: 'owner@zerot.test',
    emailVerified: true,
    name: 'Owner Zero',
  },
  'student-token': {
    uid: 'student-user',
    email: 'student@zerot.test',
    emailVerified: true,
    name: 'Student Zero',
  },
  'manual-student-token': {
    uid: 'manual-student-user',
    email: 'manual.student@zerot.test',
    emailVerified: true,
    name: 'Manual Student',
  },
  'teacher-token': {
    uid: 'teacher-user',
    email: 'teacher@zerot.test',
    emailVerified: true,
    name: 'Teacher Zero',
  },
};

async function loadMigrationSql() {
  const migrationPaths = [
    fileURLToPath(new URL('../migrations/0002_complete_schema.sql', import.meta.url)),
    fileURLToPath(new URL('../migrations/0003_student_module.sql', import.meta.url)),
    fileURLToPath(new URL('../migrations/0004_teacher_module.sql', import.meta.url)),
  ];
  const migrations = await Promise.all(migrationPaths.map((path) => readFile(path, 'utf8')));
  return migrations.join('\n\n');
}

async function createTestEnv() {
  const SQL = (await initSqlJs()) as unknown as SqlModule;
  const sqlDatabase = new SQL.Database();
  sqlDatabase.exec(await loadMigrationSql());

  return {
    env: {
      DB: new FakeD1Database(sqlDatabase),
      BUCKET: new FakeR2Bucket(),
    } as unknown as Env,
    sqlDatabase,
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return { response, text, json: null } satisfies TestResponse;
  }

  try {
    return { response, text, json: JSON.parse(text) } satisfies TestResponse;
  } catch {
    return { response, text, json: text } satisfies TestResponse;
  }
}

async function request(
  app: ReturnType<typeof createApp>,
  env: Env,
  method: string,
  path: string,
  options: {
    body?: BodyInit | JsonRecord;
    token?: keyof typeof verificationMap;
    headers?: Record<string, string>;
  } = {},
) {
  const headers = new Headers();
  let body: BodyInit | null | undefined = undefined;

  Object.entries(options.headers || {}).forEach(([key, value]) => {
    headers.set(key, value);
  });

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const response = await app.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body,
    }),
    env,
    {
      waitUntil() {},
      passThroughOnException() {},
      props: {},
    },
  );

  return parseResponse(response);
}

function assertOk(response: TestResponse, label: string, expectedStatus: number) {
  assert.equal(
    response.response.status,
    expectedStatus,
    `${label} failed with ${response.response.status}: ${response.text}`,
  );
}

async function main() {
  const { env, sqlDatabase } = await createTestEnv();
  const app = createApp({
    verifyToken: async (token) => verificationMap[token as keyof typeof verificationMap] ?? null,
    provisionAuthUser: async (email) => {
      if (email === 'teacher@zerot.test') {
        return { uid: 'teacher-user' };
      }
      return { uid: `uid-${email.replace(/[^a-z0-9]/gi, '-').toLowerCase()}` };
    },
    deliverInvitationEmail: async (payload) => ({
      provider: 'mock',
      delivered: false,
      inviteUrl: `/${payload.institutionSlug}/login?invite=${payload.inviteToken}`,
      email: payload.email,
      subject: `Invitation to teach at ${payload.institutionName}`,
      body: `Hello ${payload.fullName}`,
      temporaryPassword: payload.temporaryPassword,
      expiresAt: payload.expiresAt,
    }),
  });

  const registerResponse = await request(app, env, 'POST', '/api/auth/register', {
    token: 'owner-token',
    body: {
      fullName: 'Owner Zero',
      phone: '+27-11-000-0000',
      institution: {
        name: 'ZeroT Academy',
        slug: 'zerot-academy',
        primaryColor: '#111111',
        country: 'South Africa',
        institutionType: 'school',
      },
    },
  });
  assertOk(registerResponse, 'owner registration', 200);

  const registerJson = registerResponse.json as {
    institution: { id: string; slug: string };
  };
  const institutionId = registerJson.institution.id;
  assert.equal(registerJson.institution.slug, 'zerot-academy');

  const publicInstitution = await request(
    app,
    env,
    'GET',
    `/api/public/institutions/by-slug/${registerJson.institution.slug}`,
  );
  assertOk(publicInstitution, 'public institution lookup', 200);

  const passwordResetRequest = await request(app, env, 'POST', '/api/auth/password-reset-request', {
    body: {
      email: 'owner@zerot.test',
      institutionId,
    },
  });
  assertOk(passwordResetRequest, 'password reset request', 200);
  const resetToken = (passwordResetRequest.json as { token: string }).token;
  assert.ok(resetToken, 'password reset token should be returned');

  const passwordResetConfirm = await request(app, env, 'POST', `/api/auth/password-reset/${resetToken}`, {
    body: { newPassword: 'not-used-by-firebase' },
  });
  assertOk(passwordResetConfirm, 'password reset confirm', 200);

  const studentApplication = await request(
    app,
    env,
    'POST',
    `/api/auth/request-join/${registerJson.institution.slug}`,
    {
      token: 'student-token',
      headers: {
        'x-forwarded-for': '10.0.0.5',
      },
      body: {
        fullName: 'Student Zero',
        email: 'student@zerot.test',
        phone: '+27-82-000-0000',
        parentGuardianName: 'Guardian Zero',
        parentGuardianEmail: 'guardian@zerot.test',
        parentGuardianPhone: '+27-82-100-0000',
        notes: 'Prefers evening classes',
      },
    },
  );
  assertOk(studentApplication, 'student application create', 200);
  const studentApplicationJson = studentApplication.json as {
    id: string;
    status: string;
    parentGuardianName: string;
    registrationIp: string;
  };
  assert.equal(studentApplicationJson.status, 'pending');
  assert.equal(studentApplicationJson.parentGuardianName, 'Guardian Zero');
  assert.equal(studentApplicationJson.registrationIp, '10.0.0.5');

  const pendingStudents = await request(
    app,
    env,
    'GET',
    `/api/institutions/${institutionId}/students?status=pending&limit=10&offset=0`,
    {
      token: 'owner-token',
    },
  );
  assertOk(pendingStudents, 'pending students list', 200);
  const pendingStudentsJson = pendingStudents.json as {
    results: Array<{ userId: string; status: string }>;
    total: number;
  };
  assert.equal(pendingStudentsJson.total, 1);
  assert.equal(pendingStudentsJson.results[0]?.userId, 'student-user');
  assert.equal(pendingStudentsJson.results[0]?.status, 'pending');

  const approveApplication = await request(
    app,
    env,
    'PATCH',
    `/api/institutions/${institutionId}/applications/${studentApplicationJson.id}`,
    {
      token: 'owner-token',
      body: { status: 'approved' },
    },
  );
  assertOk(approveApplication, 'application approval', 200);

  const approvedMembership = await request(app, env, 'GET', `/api/institutions/${institutionId}/membership`, {
    token: 'student-token',
  });
  assertOk(approvedMembership, 'student membership after approval', 200);
  const approvedMembershipJson = approvedMembership.json as { status: string; role: string };
  assert.equal(approvedMembershipJson.status, 'active');
  assert.equal(approvedMembershipJson.role, 'student');

  const suspendStudent = await request(
    app,
    env,
    'PATCH',
    `/api/institutions/${institutionId}/students/student-user/status`,
    {
      token: 'owner-token',
      body: {
        status: 'suspended',
        reason: 'Billing review',
      },
    },
  );
  assertOk(suspendStudent, 'student suspension', 200);
  const suspendedStudentJson = suspendStudent.json as { status: string; suspensionReason: string };
  assert.equal(suspendedStudentJson.status, 'suspended');
  assert.equal(suspendedStudentJson.suspensionReason, 'Billing review');

  const reactivateStudent = await request(
    app,
    env,
    'PATCH',
    `/api/institutions/${institutionId}/students/student-user/status`,
    {
      token: 'owner-token',
      body: {
        status: 'approved',
      },
    },
  );
  assertOk(reactivateStudent, 'student reactivation', 200);
  const reactivatedStudentJson = reactivateStudent.json as { status: string };
  assert.equal(reactivatedStudentJson.status, 'approved');

  const createManualStudentPlatformUser = await request(app, env, 'GET', '/api/me', {
    token: 'manual-student-token',
  });
  assertOk(createManualStudentPlatformUser, 'manual student platform user bootstrap', 200);

  const createManualStudent = await request(app, env, 'POST', `/api/institutions/${institutionId}/students`, {
    token: 'owner-token',
    body: {
      fullName: 'Manual Student',
      email: 'manual.student@zerot.test',
      phone: '+27-71-000-0000',
      status: 'pending',
      notes: 'Created by owner for onboarding',
    },
  });
  assertOk(createManualStudent, 'manual student create', 201);
  const manualStudentJson = createManualStudent.json as { status: string; fullName: string };
  assert.equal(manualStudentJson.status, 'pending');
  assert.equal(manualStudentJson.fullName, 'Manual Student');

  const listUsers = await request(app, env, 'GET', `/api/institutions/${institutionId}/users`, {
    token: 'owner-token',
  });
  assertOk(listUsers, 'list institution users', 200);
  const usersJson = listUsers.json as Array<{ user_id?: string; role?: string }>;
  assert.ok(usersJson.some((user) => user.user_id === 'student-user' && user.role === 'student'));
  assert.ok(usersJson.some((user) => user.user_id === 'manual-student-user' && user.role === 'student'));

  const studentDetail = await request(
    app,
    env,
    'GET',
    `/api/institutions/${institutionId}/students/student-user`,
    {
      token: 'owner-token',
    },
  );
  assertOk(studentDetail, 'student detail lookup', 200);
  const studentDetailJson = studentDetail.json as {
    status: string;
    recentActivity: Array<{ type: string }>;
    parentGuardianName: string;
  };
  assert.equal(studentDetailJson.status, 'approved');
  assert.equal(studentDetailJson.parentGuardianName, 'Guardian Zero');
  assert.ok(studentDetailJson.recentActivity.some((activity) => activity.type === 'login'));

  const createCourse = await request(app, env, 'POST', `/api/institutions/${institutionId}/courses`, {
    token: 'owner-token',
    body: {
      title: 'Cloudflare Foundations',
      description: 'Intro course',
      status: 'active',
      fee: 499,
    },
  });
  assertOk(createCourse, 'course create', 201);
  const courseId = (createCourse.json as { id: string }).id;

  const createTeacher = await request(app, env, 'POST', `/api/institutions/${institutionId}/teachers`, {
    token: 'owner-token',
    body: {
      fullName: 'Teacher Zero',
      email: 'teacher@zerot.test',
      phone: '+27-83-000-0000',
      gender: 'female',
      address: '12 Academy Street',
      qualification: 'B.Ed Mathematics',
      employeeNumber: 'TZ-001',
      notes: 'Senior mathematics faculty',
      status: 'pending',
    },
  });
  assertOk(createTeacher, 'teacher create', 201);
  const createdTeacherJson = createTeacher.json as {
    userId: string;
    approvalStatus: string;
    invitationPreview?: { temporaryPassword?: string };
    invitation_preview?: { temporaryPassword?: string };
  };
  assert.equal(createdTeacherJson.userId, 'teacher-user');
  assert.equal(createdTeacherJson.approvalStatus, 'pending');
  assert.ok(
    createdTeacherJson.invitationPreview?.temporaryPassword ||
      createdTeacherJson.invitation_preview?.temporaryPassword,
    'teacher invitation preview should include a temporary password',
  );

  const listTeachers = await request(app, env, 'GET', `/api/institutions/${institutionId}/teachers?status=pending`, {
    token: 'owner-token',
  });
  assertOk(listTeachers, 'teacher list pending view', 200);
  const listTeachersJson = listTeachers.json as {
    total: number;
    results: Array<{ userId: string; assignedCoursesCount?: number }>;
  };
  assert.equal(listTeachersJson.total, 1);
  assert.equal(listTeachersJson.results[0]?.userId, 'teacher-user');
  assert.equal(listTeachersJson.results[0]?.assignedCoursesCount || 0, 0);

  const assignTeacherCourse = await request(
    app,
    env,
    'PUT',
    `/api/institutions/${institutionId}/teachers/teacher-user/courses`,
    {
      token: 'owner-token',
      body: {
        courseIds: [courseId],
      },
    },
  );
  assertOk(assignTeacherCourse, 'teacher course assignment', 200);
  const assignedTeacherJson = assignTeacherCourse.json as {
    assignedCoursesCount?: number;
    assignedCourseNames?: string[];
  };
  assert.equal(assignedTeacherJson.assignedCoursesCount, 1);
  assert.ok((assignedTeacherJson.assignedCourseNames || []).includes('Cloudflare Foundations'));

  const approveTeacher = await request(
    app,
    env,
    'PATCH',
    `/api/institutions/${institutionId}/teachers/teacher-user`,
    {
      token: 'owner-token',
      body: {
        status: 'approved',
      },
    },
  );
  assertOk(approveTeacher, 'teacher approval', 200);
  const approvedTeacherJson = approveTeacher.json as { approvalStatus: string };
  assert.equal(approvedTeacherJson.approvalStatus, 'approved');

  const teacherMembership = await request(app, env, 'GET', `/api/institutions/${institutionId}/membership`, {
    token: 'teacher-token',
  });
  assertOk(teacherMembership, 'teacher membership after approval', 200);
  const teacherMembershipJson = teacherMembership.json as { role: string; status: string };
  assert.equal(teacherMembershipJson.role, 'teacher');
  assert.equal(teacherMembershipJson.status, 'active');

  const createModule = await request(app, env, 'POST', `/api/courses/${courseId}/modules`, {
    token: 'owner-token',
    body: {
      title: 'Week 1',
      description: 'Getting started',
    },
  });
  assertOk(createModule, 'module create', 201);
  const moduleId = ((createModule.json as Array<{ id: string }>)[0] || {}).id;
  assert.ok(moduleId, 'module id should exist');

  const createLesson = await request(app, env, 'POST', `/api/modules/${moduleId}/lessons`, {
    token: 'owner-token',
    body: {
      title: 'Worker Basics',
      content: 'Lesson content',
      durationMinutes: 15,
    },
  });
  assertOk(createLesson, 'lesson create', 201);
  const lessonId = (createLesson.json as { id: string }).id;

  const enrollStudent = await request(app, env, 'POST', `/api/courses/${courseId}/enroll`, {
    token: 'owner-token',
    body: { studentId: 'student-user' },
  });
  assertOk(enrollStudent, 'student enrollment', 201);

  const markTeacherAttendance = await request(
    app,
    env,
    'POST',
    `/api/institutions/${institutionId}/teachers/teacher-user/attendance`,
    {
      token: 'owner-token',
      body: {
        attendanceDate: new Date().toISOString().slice(0, 10),
        status: 'present',
        notes: 'On time for scheduled class',
      },
    },
  );
  assertOk(markTeacherAttendance, 'teacher attendance mark', 201);

  const teacherAttendanceHistory = await request(
    app,
    env,
    'GET',
    `/api/institutions/${institutionId}/teachers/teacher-user/attendance?month=${new Date()
      .toISOString()
      .slice(0, 7)}`,
    {
      token: 'owner-token',
    },
  );
  assertOk(teacherAttendanceHistory, 'teacher attendance history', 200);
  const teacherAttendanceJson = teacherAttendanceHistory.json as Array<{ status: string }>;
  assert.equal(teacherAttendanceJson[0]?.status, 'present');

  const updateProgress = await request(app, env, 'PUT', `/api/lessons/${lessonId}/progress`, {
    token: 'student-token',
    body: { completed: true, resumeSeconds: 120 },
  });
  assertOk(updateProgress, 'lesson progress update', 200);

  const createQuiz = await request(app, env, 'POST', `/api/lessons/${lessonId}/quizzes`, {
    token: 'owner-token',
    body: {
      title: 'Quick Check',
      questions: [
        {
          question: 'What powers ZeroT?',
          options: ['Cloudflare', 'Notion'],
          answer: 'Cloudflare',
        },
      ],
    },
  });
  assertOk(createQuiz, 'quiz create', 201);
  const quizId = (createQuiz.json as { id: string }).id;

  const submitQuiz = await request(app, env, 'POST', `/api/quizzes/${quizId}/attempt`, {
    token: 'student-token',
    body: {
      answers: { 0: 'Cloudflare' },
      score: 100,
      questions: [
        {
          question: 'What powers ZeroT?',
          options: ['Cloudflare', 'Notion'],
          answer: 'Cloudflare',
        },
      ],
    },
  });
  assertOk(submitQuiz, 'quiz attempt submit', 201);

  const teacherPerformance = await request(
    app,
    env,
    'GET',
    `/api/institutions/${institutionId}/teachers/teacher-user/performance`,
    {
      token: 'owner-token',
    },
  );
  assertOk(teacherPerformance, 'teacher performance summary', 200);
  const teacherPerformanceJson = teacherPerformance.json as {
    assignedStudentsCount?: number;
    assignedCoursesCount?: number;
    attendancePercentage?: number;
    averageQuizScore?: number | null;
  };
  assert.equal(teacherPerformanceJson.assignedCoursesCount, 1);
  assert.equal(teacherPerformanceJson.assignedStudentsCount, 1);
  assert.equal(teacherPerformanceJson.attendancePercentage, 100);
  assert.equal(teacherPerformanceJson.averageQuizScore, 100);

  const suspendTeacher = await request(
    app,
    env,
    'PATCH',
    `/api/institutions/${institutionId}/teachers/teacher-user`,
    {
      token: 'owner-token',
      body: {
        status: 'suspended',
      },
    },
  );
  assertOk(suspendTeacher, 'teacher suspension', 200);
  const suspendedTeacherJson = suspendTeacher.json as { approvalStatus: string };
  assert.equal(suspendedTeacherJson.approvalStatus, 'suspended');

  const reactivateTeacher = await request(
    app,
    env,
    'PATCH',
    `/api/institutions/${institutionId}/teachers/teacher-user`,
    {
      token: 'owner-token',
      body: {
        status: 'approved',
      },
    },
  );
  assertOk(reactivateTeacher, 'teacher reactivation', 200);
  const reactivatedTeacherJson = reactivateTeacher.json as {
    approvalStatus: string;
    lastLoginAt?: string | null;
  };
  assert.equal(reactivatedTeacherJson.approvalStatus, 'approved');
  assert.ok(reactivatedTeacherJson.lastLoginAt, 'teacher login activity should be captured');

  const uploadPdfForm = new FormData();
  uploadPdfForm.append(
    'file',
    new File([new TextEncoder().encode('phase-0-test')], 'phase0.pdf', {
      type: 'application/pdf',
    }),
  );
  const uploadPdf = await request(app, env, 'POST', '/api/uploads/pdf', {
    token: 'owner-token',
    body: uploadPdfForm,
  });
  assertOk(uploadPdf, 'pdf upload', 201);
  const uploadJson = uploadPdf.json as { url: string; key: string };
  assert.ok(uploadJson.key.startsWith('pdf/'));

  const fetchStoredPdf = await request(app, env, 'GET', uploadJson.url);
  assertOk(fetchStoredPdf, 'stored pdf fetch', 200);
  assert.equal(fetchStoredPdf.response.headers.get('content-type'), 'application/pdf');

  const currentUser = await request(app, env, 'GET', '/api/me', { token: 'owner-token' });
  assertOk(currentUser, 'current user lookup', 200);
  const currentUserJson = currentUser.json as { uid: string; email: string };
  assert.equal(currentUserJson.uid, 'owner-user');
  assert.equal(currentUserJson.email, 'owner@zerot.test');

  const tableCount = (
    await new FakeD1PreparedStatement(
      sqlDatabase,
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
      .bind()
      .first<{ count: number }>()
  )?.count;
  assert.ok((tableCount || 0) >= 25, `expected at least 25 tables, found ${tableCount || 0}`);

  console.log('Phase 0 + student + teacher module smoke tests passed.');
  console.log(`Institution: ${institutionId}`);
  console.log(`Course: ${courseId}`);
  console.log(`Lesson: ${lessonId}`);
  console.log(`Quiz: ${quizId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
