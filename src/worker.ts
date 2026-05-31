import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  AnnouncementInput,
  AssignmentInput,
  CourseInput,
  InstitutionInput,
  LessonInput,
  LiveClassInput,
  ModuleInput,
  PaymentInput,
  QuizInput,
  TimetableInput,
  UserRole,
  UserStatus,
} from './types';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  EMAIL_PUPLIC_KEY?: string;
  EMAIL_PRIVATE_KEY?: string;
  EMAIL?: string;
  APP_URL?: string;
  SENDGRID_API_KEY?: string;
  MJ_APIKEY_PUBLIC?: string;
  MJ_APIKEY_PRIVATE?: string;
  MAILJET_APIKEY_PUBLIC?: string;
  MAILJET_APIKEY_PRIVATE?: string;
}

interface VerifiedToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

interface AppBindings {
  Bindings: Env;
  Variables: {
    user: VerifiedToken;
    platformUser: Record<string, unknown>;
  };
}

type TokenVerifier = (token: string, env: Env) => Promise<VerifiedToken | null>;

type AuthUserProvisioner = (
  email: string,
  password: string,
  displayName?: string,
) => Promise<{ uid: string }>;

interface InvitationDeliveryResult {
  provider: 'mock';
  delivered: boolean;
  inviteUrl: string;
  email: string;
  subject: string;
  body: string;
  temporaryPassword?: string;
  expiresAt?: string;
}

type InvitationDeliveryHandler = (payload: {
  institutionName: string;
  institutionSlug: string;
  email: string;
  fullName: string;
  inviteToken: string;
  temporaryPassword: string;
  expiresAt: string;
}) => Promise<InvitationDeliveryResult>;

interface CreateAppOptions {
  verifyToken?: TokenVerifier;
  provisionAuthUser?: AuthUserProvisioner;
  deliverInvitationEmail?: InvitationDeliveryHandler;
}

type Row = Record<string, unknown>;

const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
const FIREBASE_WEB_API_KEY = firebaseConfig.apiKey;
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, CryptoKey> | null = null;
let cachedCertsExpiresAt = 0;

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRole(value: unknown): UserRole {
  return value === 'owner' || value === 'admin' || value === 'teacher' ? value : 'student';
}

function normalizeUserStatus(value: unknown): UserStatus {
  return value === 'pending' || value === 'suspended' || value === 'rejected' ? value : 'active';
}

function normalizeStudentLifecycleStatus(value: unknown) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'approved' || raw === 'active') return 'approved';
  if (raw === 'rejected') return 'rejected';
  if (raw === 'suspended') return 'suspended';
  return 'pending';
}

function normalizePlatform(value: unknown) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'google meet' || raw === 'google-meet' || raw === 'google_meet') return 'google_meet';
  if (raw === 'zoom') return 'zoom';
  return 'custom';
}

function normalizeFileType(value: unknown) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('video')) return 'video';
  if (raw.includes('pdf')) return 'pdf';
  if (raw.includes('slide')) return 'slides';
  if (raw.includes('image')) return 'image';
  return raw || 'document';
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === '1';
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function publicObjectUrl(key: string) {
  return `/api/storage/object?key=${encodeURIComponent(key)}`;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || null;
}

function getUserAgent(request: Request) {
  return request.headers.get('user-agent') || null;
}

function formatStoredFileSize(bytes: unknown) {
  const amount = Number(bytes);
  if (!Number.isFinite(amount) || amount <= 0) return 'Unknown size';
  if (amount < 1024) return `${amount} B`;
  if (amount < 1024 * 1024) return `${(amount / 1024).toFixed(1)} KB`;
  if (amount < 1024 * 1024 * 1024) return `${(amount / (1024 * 1024)).toFixed(1)} MB`;
  return `${(amount / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function roleAllowed(role: UserRole, allowed: UserRole[]) {
  return allowed.includes(role);
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function parseRequestBody<T>(request: Request): Promise<Partial<T>> {
  if (request.method === 'GET' || request.method === 'HEAD') return {};
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await request.json().catch(() => ({}))) as Partial<T>;
  }
  return {};
}

async function dbAll<T = Row>(db: D1Database, sql: string, params: unknown[] = []) {
  const result = await db.prepare(sql).bind(...params).all();
  return ((result.results || []) as T[]) ?? [];
}

async function dbFirst<T = Row>(db: D1Database, sql: string, params: unknown[] = []) {
  return (await db.prepare(sql).bind(...params).first()) as T | null;
}

async function dbRun(db: D1Database, sql: string, params: unknown[] = []) {
  return db.prepare(sql).bind(...params).run();
}

async function loadGoogleCerts() {
  const now = Date.now();
  if (cachedCerts && now < cachedCertsExpiresAt) return cachedCerts;

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch Firebase public certificates');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = /max-age=(\d+)/.exec(cacheControl);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;

  const certificates = (await response.json()) as Record<string, string>;
  const imported: Record<string, CryptoKey> = {};
  for (const [kid, pem] of Object.entries(certificates)) {
    imported[kid] = await importX509Pem(pem);
  }

  cachedCerts = imported;
  cachedCertsExpiresAt = now + ttlMs;
  return imported;
}

async function importX509Pem(pem: string) {
  const base64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const spki = extractSpkiFromCert(der);
  return crypto.subtle.importKey(
    'spki',
    spki.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

function extractSpkiFromCert(der: Uint8Array) {
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error('Invalid certificate');
  offset += readLength(der, offset).headerLen;
  if (der[offset++] !== 0x30) throw new Error('Invalid certificate');
  const tbsLength = readLength(der, offset);
  offset += tbsLength.headerLen;
  if (der[offset] === 0xa0) {
    offset += 1;
    const versionLength = readLength(der, offset);
    offset += versionLength.headerLen + versionLength.len;
  }
  offset = skipTlv(der, offset);
  offset = skipTlv(der, offset);
  offset = skipTlv(der, offset);
  offset = skipTlv(der, offset);
  offset = skipTlv(der, offset);
  const start = offset;
  offset = skipTlv(der, offset);
  return der.slice(start, offset);
}

function readLength(buffer: Uint8Array, offset: number) {
  const first = buffer[offset];
  if ((first & 0x80) === 0) {
    return { headerLen: 1, len: first };
  }

  const bytes = first & 0x7f;
  let len = 0;
  for (let index = 1; index <= bytes; index += 1) {
    len = (len << 8) | buffer[offset + index];
  }

  return { headerLen: 1 + bytes, len };
}

function skipTlv(buffer: Uint8Array, offset: number) {
  offset += 1;
  const length = readLength(buffer, offset);
  return offset + length.headerLen + length.len;
}

async function verifyFirebaseIdToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
    const header = JSON.parse(atob(headerEncoded.replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(payloadEncoded.replace(/-/g, '+').replace(/_/g, '/')));

    if (header.alg !== 'RS256') return null;
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || payload.exp <= now || payload.iat > now + 60) {
      return null;
    }

    const certificates = await loadGoogleCerts();
    const key = certificates[header.kid];
    if (!key) return null;

    const signedContent = new TextEncoder().encode(`${headerEncoded}.${payloadEncoded}`);
    const signature = Uint8Array.from(
      atob(signatureEncoded.replace(/-/g, '+').replace(/_/g, '/')),
      (char) => char.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signature.buffer as ArrayBuffer,
      signedContent.buffer as ArrayBuffer,
    );

    if (!valid) return null;

    return {
      uid: payload.sub as string,
      email: (payload.email || '') as string,
      emailVerified: Boolean(payload.email_verified),
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
    } satisfies VerifiedToken;
  } catch {
    return null;
  }
}

async function getCompletedLessonIds(db: D1Database, userId: string) {
  const rows = await dbAll<{ lesson_id: string }>(
    db,
    'SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND completed = 1',
    [userId],
  );
  return rows.map((row) => row.lesson_id);
}

async function ensurePlatformUser(db: D1Database, verified: VerifiedToken) {
  const timestamp = nowIso();

  await dbRun(
    db,
    `INSERT OR IGNORE INTO platform_users
     (uid, full_name, email, phone, photo_url, is_platform_admin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [verified.uid, verified.name || '', verified.email, '', verified.picture || null, timestamp, timestamp],
  );

  await dbRun(
    db,
    `UPDATE platform_users
     SET full_name = CASE WHEN ? <> '' THEN ? ELSE full_name END,
         email = CASE WHEN ? <> '' THEN ? ELSE email END,
         photo_url = CASE WHEN ? IS NOT NULL THEN ? ELSE photo_url END,
         updated_at = ?
     WHERE uid = ?`,
    [
      verified.name || '',
      verified.name || '',
      verified.email || '',
      verified.email || '',
      verified.picture || null,
      verified.picture || null,
      timestamp,
      verified.uid,
    ],
  );

  const row = await dbFirst<Row>(db, 'SELECT * FROM platform_users WHERE uid = ?', [verified.uid]);
  const completedLessons = await getCompletedLessonIds(db, verified.uid);
  return mapPlatformUser(row || {}, completedLessons);
}

function mapPlatformUser(row: Row, completedLessons: string[]) {
  return {
    uid: String(row.uid || ''),
    full_name: String(row.full_name || ''),
    fullName: String(row.full_name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    photo_url: (row.photo_url as string | null) || null,
    photoUrl: (row.photo_url as string | null) || null,
    is_platform_admin: toBoolean(row.is_platform_admin) ? 1 : 0,
    isPlatformAdmin: toBoolean(row.is_platform_admin),
    created_at: row.created_at || null,
    createdAt: row.created_at || null,
    updated_at: row.updated_at || null,
    updatedAt: row.updated_at || null,
    completed_lessons: completedLessons,
    completedLessons,
  };
}

function mapInstitution(row: Row) {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    slug: String(row.slug || ''),
    logo_url: (row.logo_url as string | null) || null,
    logoUrl: (row.logo_url as string | null) || null,
    primary_color: String(row.primary_color || '#000000'),
    primaryColor: String(row.primary_color || '#000000'),
    country: String(row.country || ''),
    institution_type: String(row.institution_type || 'school'),
    institutionType: String(row.institution_type || 'school'),
    owner_user_id: String(row.owner_user_id || ''),
    ownerUserId: String(row.owner_user_id || ''),
    status: String(row.status || 'active'),
    timezone: String(row.timezone || 'UTC'),
    currency: String(row.currency || 'USD'),
    locale: String(row.locale || 'en'),
    custom_domain: (row.custom_domain as string | null) || null,
    customDomain: (row.custom_domain as string | null) || null,
    created_at: row.created_at || null,
    createdAt: row.created_at || null,
    updated_at: row.updated_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function getInstitutionById(db: D1Database, institutionId: string) {
  const row = await dbFirst<Row>(
    db,
    'SELECT * FROM institutions WHERE id = ? LIMIT 1',
    [institutionId],
  );
  return row ? mapInstitution(row) : null;
}

async function getInstitutionBySlug(db: D1Database, slug: string) {
  const row = await dbFirst<Row>(
    db,
    'SELECT * FROM institutions WHERE slug = ? LIMIT 1',
    [slug],
  );
  return row ? mapInstitution(row) : null;
}

async function getMembership(db: D1Database, institutionId: string, userId: string) {
  const row = await dbFirst<Row>(
    db,
    `SELECT iu.*, pu.full_name, pu.email, pu.phone, sa.status AS application_status
     FROM institution_users iu
     JOIN platform_users pu ON pu.uid = iu.user_id
     LEFT JOIN student_applications sa
       ON sa.institution_id = iu.institution_id
      AND sa.user_id = iu.user_id
     WHERE iu.institution_id = ? AND iu.user_id = ?
     LIMIT 1`,
    [institutionId, userId],
  );

  if (!row) return null;

  const role = normalizeRole(row.role);
  const membershipStatus = normalizeUserStatus(row.status);
  const applicationStatus = normalizeStudentLifecycleStatus(row.application_status);
  const derivedStatus =
    role === 'student' && membershipStatus !== 'suspended' && applicationStatus === 'rejected'
      ? 'rejected'
      : membershipStatus;

  return {
    id: String(row.id || ''),
    institution_id: String(row.institution_id || institutionId),
    institutionId: String(row.institution_id || institutionId),
    user_id: String(row.user_id || userId),
    userId: String(row.user_id || userId),
    uid: String(row.user_id || userId),
    full_name: String(row.full_name || ''),
    fullName: String(row.full_name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    role,
    status: derivedStatus,
    created_at: row.created_at || null,
    createdAt: row.created_at || null,
    updated_at: row.updated_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function requireMembership(
  db: D1Database,
  platformUser: Record<string, unknown>,
  verified: VerifiedToken,
  institutionId: string,
  allowedRoles?: UserRole[],
) {
  const isPlatformAdmin = Boolean(platformUser.isPlatformAdmin);
  const membership = await getMembership(db, institutionId, verified.uid);

  if (!membership && !isPlatformAdmin) {
    return { error: jsonError('Institution membership not found', 403) };
  }

  if (membership && membership.status !== 'active' && !isPlatformAdmin) {
    return { error: jsonError('Institution membership is not active', 403) };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = (membership?.role as UserRole | undefined) || 'owner';
    if (!isPlatformAdmin && !roleAllowed(role, allowedRoles)) {
      return { error: jsonError('Forbidden', 403) };
    }
  }

  return { membership };
}

async function getCourseRow(db: D1Database, courseId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM courses WHERE id = ? LIMIT 1', [courseId]);
}

async function getModuleRow(db: D1Database, moduleId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM modules WHERE id = ? LIMIT 1', [moduleId]);
}

async function getLessonRow(db: D1Database, lessonId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM lessons WHERE id = ? LIMIT 1', [lessonId]);
}

async function getAssignmentRow(db: D1Database, assignmentId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM assignments WHERE id = ? LIMIT 1', [assignmentId]);
}

async function getQuizRow(db: D1Database, quizId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM quizzes WHERE id = ? LIMIT 1', [quizId]);
}

async function getAttendanceSessionRow(db: D1Database, sessionId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM attendance_sessions WHERE id = ? LIMIT 1', [sessionId]);
}

async function getDiscussionRow(db: D1Database, discussionId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM discussions WHERE id = ? LIMIT 1', [discussionId]);
}

async function getPaymentRow(db: D1Database, paymentId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM payments WHERE id = ? LIMIT 1', [paymentId]);
}

async function getLiveClassRow(db: D1Database, liveClassId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM live_classes WHERE id = ? LIMIT 1', [liveClassId]);
}

async function getCertificateRow(db: D1Database, certificateId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM certificates WHERE id = ? LIMIT 1', [certificateId]);
}

async function getTimetableRow(db: D1Database, timetableId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM timetable_entries WHERE id = ? LIMIT 1', [timetableId]);
}

async function getConversationRow(db: D1Database, conversationId: string) {
  return dbFirst<Row>(db, 'SELECT * FROM conversations WHERE id = ? LIMIT 1', [conversationId]);
}

async function resolveCourseId(db: D1Database, institutionId: string, body: Row) {
  const directId = String(
    body.courseId || body.course_id || body.course || body.courseID || '',
  ).trim();
  if (directId) return directId;

  const courseName = String(body.courseName || body.course_name || '').trim();
  if (!courseName) return null;

  const row = await dbFirst<Row>(
    db,
    'SELECT id FROM courses WHERE institution_id = ? AND LOWER(title) = LOWER(?) LIMIT 1',
    [institutionId, courseName],
  );

  return row ? String(row.id || '') : null;
}

async function resolveInstitutionIdFromPath(db: D1Database, pathId: string, kind: string) {
  if (kind === 'course') {
    const row = await getCourseRow(db, pathId);
    return row ? String(row.institution_id || '') : null;
  }
  if (kind === 'module') {
    const moduleRow = await getModuleRow(db, pathId);
    if (!moduleRow) return null;
    const course = await getCourseRow(db, String(moduleRow.course_id || ''));
    return course ? String(course.institution_id || '') : null;
  }
  if (kind === 'lesson') {
    const lessonRow = await getLessonRow(db, pathId);
    return lessonRow ? String(lessonRow.institution_id || lessonRow.course_id || '') : null;
  }
  return null;
}

async function ensureStudentProfile(db: D1Database, institutionId: string, userId: string, seed?: Partial<Row>) {
  const existing = await dbFirst<Row>(
    db,
    'SELECT user_id FROM student_profiles WHERE institution_id = ? AND user_id = ? LIMIT 1',
    [institutionId, userId],
  );
  if (existing) return;

  const countRow = await dbFirst<Row>(
    db,
    'SELECT COUNT(*) AS total FROM student_profiles WHERE institution_id = ?',
    [institutionId],
  );
  const sequence = toNumber(countRow?.total, 0) + 1;
  const studentNumber = String(seed?.student_number || `STD-${String(sequence).padStart(4, '0')}`);
  await dbRun(
    db,
    `INSERT INTO student_profiles
     (user_id, institution_id, student_number, phone, payment_status, total_fee, amount_paid, balance, academic_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'unpaid', 0, 0, 0, 'active', ?, ?)`,
    [userId, institutionId, studentNumber, String(seed?.phone || ''), nowIso(), nowIso()],
  );
}

async function ensureTeacherProfile(db: D1Database, institutionId: string, userId: string, seed?: Partial<Row>) {
  const existing = await dbFirst<Row>(
    db,
    'SELECT user_id FROM teacher_profiles WHERE institution_id = ? AND user_id = ? LIMIT 1',
    [institutionId, userId],
  );
  if (existing) return;

  const countRow = await dbFirst<Row>(
    db,
    'SELECT COUNT(*) AS total FROM teacher_profiles WHERE institution_id = ?',
    [institutionId],
  );
  const sequence = toNumber(countRow?.total, 0) + 1;
  const employeeNumber = String(seed?.employee_number || `TCH-${String(sequence).padStart(4, '0')}`);
  await dbRun(
    db,
    `INSERT INTO teacher_profiles
     (user_id, institution_id, employee_number, phone, gender, address, qualification, profile_image_url, assigned_courses, department, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)`,
    [
      userId,
      institutionId,
      employeeNumber,
      String(seed?.phone || ''),
      seed?.gender || null,
      seed?.address || null,
      seed?.qualification || null,
      seed?.profile_image_url || null,
      String(seed?.department || ''),
      seed?.notes || null,
      nowIso(),
      nowIso(),
    ],
  );
}

async function createNotification(
  db: D1Database,
  institutionId: string,
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  await dbRun(
    db,
    `INSERT INTO notifications (id, institution_id, user_id, type, title, body, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId(), institutionId, userId, type, title, body, link || null, nowIso()],
  );
}

async function logAuditAction(
  db: D1Database,
  request: Request,
  options: {
    institutionId?: string | null;
    userId?: string | null;
    action: string;
    targetTable?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  await dbRun(
    db,
    `INSERT INTO audit_log
     (id, institution_id, user_id, action, target_table, target_id, metadata, ip_address, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      options.institutionId || null,
      options.userId || null,
      options.action,
      options.targetTable || null,
      options.targetId || null,
      options.metadata ? JSON.stringify(options.metadata) : null,
      getClientIp(request),
      getUserAgent(request),
      nowIso(),
    ],
  );
}

async function recordStudentLogin(db: D1Database, institutionId: string, userId: string, request: Request) {
  await dbRun(
    db,
    `INSERT INTO login_history (id, user_id, institution_id, ip_address, user_agent, success, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [newId(), userId, institutionId, getClientIp(request), getUserAgent(request), nowIso()],
  );

  await dbRun(
    db,
    `UPDATE student_profiles
     SET last_login_at = ?, is_active = 1, updated_at = ?
     WHERE institution_id = ? AND user_id = ?`,
    [nowIso(), nowIso(), institutionId, userId],
  );
}

function mapStudentApplication(row: Row | null) {
  if (!row) return null;

  return {
    ...row,
    institutionId: row.institution_id,
    userId: row.user_id,
    fullName: row.full_name,
    applicationSubmittedAt: row.application_submitted_at || row.created_at || null,
    approvedAt: row.approved_at || null,
    approvedBy: row.approved_by || null,
    rejectedAt: row.rejected_at || null,
    rejectedBy: row.rejected_by || null,
    registrationIp: row.registration_ip || null,
    parentGuardianName: row.parent_guardian_name || null,
    parentGuardianEmail: row.parent_guardian_email || null,
    parentGuardianPhone: row.parent_guardian_phone || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function updateStudentProfileFields(
  db: D1Database,
  institutionId: string,
  userId: string,
  fields: Row,
) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
  await dbRun(
    db,
    `UPDATE student_profiles SET ${setClause} WHERE institution_id = ? AND user_id = ?`,
    [...entries.map(([, value]) => value), institutionId, userId],
  );
}

async function updateInstitutionUserFields(
  db: D1Database,
  institutionId: string,
  userId: string,
  fields: Row,
) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
  await dbRun(
    db,
    `UPDATE institution_users SET ${setClause} WHERE institution_id = ? AND user_id = ?`,
    [...entries.map(([, value]) => value), institutionId, userId],
  );
}

async function updateTeacherProfileFields(
  db: D1Database,
  institutionId: string,
  userId: string,
  fields: Row,
) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
  await dbRun(
    db,
    `UPDATE teacher_profiles SET ${setClause} WHERE institution_id = ? AND user_id = ?`,
    [...entries.map(([, value]) => value), institutionId, userId],
  );
}

async function recordTeacherLogin(db: D1Database, institutionId: string, userId: string, request: Request) {
  await dbRun(
    db,
    `INSERT INTO login_history (id, user_id, institution_id, ip_address, user_agent, success, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [newId(), userId, institutionId, getClientIp(request), getUserAgent(request), nowIso()],
  );

  await dbRun(
    db,
    `UPDATE teacher_profiles
     SET last_login_at = ?, is_active = 1, updated_at = ?
     WHERE institution_id = ? AND user_id = ?`,
    [nowIso(), nowIso(), institutionId, userId],
  );
}

async function syncTeacherProfileCourseAssignments(db: D1Database, institutionId: string) {
  const teacherProfiles = await dbAll<Row>(
    db,
    'SELECT user_id FROM teacher_profiles WHERE institution_id = ?',
    [institutionId],
  );
  const courseRows = await dbAll<Row>(
    db,
    'SELECT id, teacher_id FROM courses WHERE institution_id = ?',
    [institutionId],
  );

  const assignmentMap = new Map<string, string[]>();
  teacherProfiles.forEach((row) => assignmentMap.set(String(row.user_id || ''), []));
  courseRows.forEach((row) => {
    const teacherId = String(row.teacher_id || '').trim();
    if (!teacherId) return;
    const assigned = assignmentMap.get(teacherId) || [];
    assigned.push(String(row.id || ''));
    assignmentMap.set(teacherId, assigned);
  });

  await Promise.all(
    [...assignmentMap.entries()].map(([teacherId, courseIds]) =>
      dbRun(
        db,
        `UPDATE teacher_profiles
         SET assigned_courses = ?, updated_at = ?
         WHERE institution_id = ? AND user_id = ?`,
        [JSON.stringify(courseIds), nowIso(), institutionId, teacherId],
      ),
    ),
  );
}

function buildMockInvitationPreview(payload: {
  institutionName: string;
  institutionSlug: string;
  email: string;
  fullName: string;
  inviteToken: string;
  temporaryPassword: string;
  expiresAt: string;
}) {
  const inviteUrl = `/${payload.institutionSlug}/login?invite=${payload.inviteToken}`;
  return {
    provider: 'mock' as const,
    delivered: false,
    inviteUrl,
    email: payload.email,
    subject: `Invitation to teach at ${payload.institutionName}`,
    body: `Hello ${payload.fullName}, you have been added as a teacher at ${payload.institutionName}. Use the normal institution login page, your temporary password "${payload.temporaryPassword}", and reset it after first sign-in.`,
    temporaryPassword: payload.temporaryPassword,
    expiresAt: payload.expiresAt,
  };
}

async function sendMockInvitationEmail(payload: {
  institutionName: string;
  institutionSlug: string;
  email: string;
  fullName: string;
  inviteToken: string;
  temporaryPassword: string;
  expiresAt: string;
}) {
  return buildMockInvitationPreview(payload);
}

function generateTemporaryPassword() {
  const seed = Math.random().toString(36).slice(2, 8);
  return `Teach-${seed}A1!`;
}

function normalizeBaseUrl(value: string | undefined) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  return normalized || 'http://localhost:8787';
}

async function sendTransactionalEmail(
  env: Env,
  payload: {
    to: string;
    toName?: string;
    subject: string;
    text: string;
    html: string;
    fromName?: string;
  },
) {
  const sendgridKey = String(env.SENDGRID_API_KEY || '').trim();
  const senderEmail = String(env.EMAIL || '').trim();

  if (sendgridKey && senderEmail) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [
                {
                  email: payload.to,
                  name: payload.toName || payload.to,
                },
              ],
            },
          ],
          from: {
            email: senderEmail,
            name: payload.fromName || 'Thutify',
          },
          subject: payload.subject,
          content: [
            {
              type: 'text/plain',
              value: payload.text,
            },
            {
              type: 'text/html',
              value: payload.html,
            },
          ],
        }),
      });

      const bodyText = await response.text();
      if (!response.ok) {
        console.error('SendGrid send failed', response.status, bodyText);
        return null;
      }
      return { status: response.status, body: bodyText };
    } catch (error) {
      console.error('SendGrid send error', error);
      return null;
    }
  }

  const publicKey =
    env.MJ_APIKEY_PUBLIC ||
    env.MAILJET_APIKEY_PUBLIC ||
    env.EMAIL_PUPLIC_KEY ||
    '';
  const privateKey =
    env.MJ_APIKEY_PRIVATE ||
    env.MAILJET_APIKEY_PRIVATE ||
    env.EMAIL_PRIVATE_KEY ||
    '';
  const mailjetSender = senderEmail;

  if (!publicKey || !privateKey || !mailjetSender) {
    console.warn('Email skipped: missing SendGrid/Mailjet API keys or sender email');
    return null;
  }

  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${publicKey}:${privateKey}`)}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: mailjetSender,
              Name: payload.fromName || 'Thutify',
            },
            To: [
              {
                Email: payload.to,
                Name: payload.toName || payload.to,
              },
            ],
            Subject: payload.subject,
            TextPart: payload.text,
            HTMLPart: payload.html,
          },
        ],
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      console.error('Mailjet send failed', response.status, bodyText);
      return null;
    }

    try {
      return JSON.parse(bodyText);
    } catch {
      return bodyText;
    }
  } catch (error) {
    console.error('Mailjet send error', error);
    return null;
  }
}

async function createFirebaseEmailPasswordUser(email: string, password: string, displayName?: string) {
  const signUpResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  const payload = (await signUpResponse.json().catch(() => ({}))) as Row;
  if (!signUpResponse.ok) {
    const message = String((payload.error as Row | undefined)?.message || 'Failed to create Firebase user');
    if (message.includes('EMAIL_EXISTS')) {
      throw new Error('A Firebase account with this email already exists');
    }
    throw new Error(message);
  }

  const localId = String(payload.localId || '');
  const idToken = String(payload.idToken || '');

  if (displayName && idToken) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_WEB_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        displayName,
        returnSecureToken: false,
      }),
    }).catch(() => undefined);
  }

  return { uid: localId };
}

async function listInstitutionMembers(db: D1Database, institutionId: string, role?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT iu.*, pu.full_name, pu.email, pu.phone
    FROM institution_users iu
    JOIN platform_users pu ON pu.uid = iu.user_id
    WHERE iu.institution_id = ?
  `;
  if (role) {
    sql += ' AND iu.role = ?';
    params.push(role);
  }
  sql += ' ORDER BY pu.full_name ASC';

  const rows = await dbAll<Row>(db, sql, params);
  return rows.map((row) => ({
    id: String(row.id || ''),
    institution_id: String(row.institution_id || institutionId),
    institutionId: String(row.institution_id || institutionId),
    user_id: String(row.user_id || ''),
    userId: String(row.user_id || ''),
    uid: String(row.user_id || ''),
    full_name: String(row.full_name || ''),
    fullName: String(row.full_name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    role: normalizeRole(row.role),
    status: normalizeUserStatus(row.status),
    created_at: row.created_at || null,
    createdAt: row.created_at || null,
    updated_at: row.updated_at || null,
    updatedAt: row.updated_at || null,
  }));
}

async function listCoursesForInstitution(db: D1Database, institutionId: string) {
  return dbAll<Row>(
    db,
    `SELECT c.*,
            c.title AS course_name,
            pu.full_name AS teacher_name
     FROM courses c
     LEFT JOIN platform_users pu ON pu.uid = c.teacher_id
     WHERE c.institution_id = ?
     ORDER BY c.created_at DESC`,
    [institutionId],
  );
}

async function listModulesForCourse(db: D1Database, courseId: string) {
  return dbAll<Row>(
    db,
    `SELECT id, course_id, title, description, order_index
     FROM modules
     WHERE course_id = ?
     ORDER BY order_index ASC, created_at ASC`,
    [courseId],
  );
}

async function listLessonsForModule(db: D1Database, moduleId: string, userId?: string) {
  const rows = await dbAll<Row>(
    db,
    `SELECT l.*,
            CASE WHEN lp.completed = 1 THEN 1 ELSE 0 END AS completed
     FROM lessons l
     LEFT JOIN lesson_progress lp
       ON lp.lesson_id = l.id
      AND lp.student_id = ?
     WHERE l.module_id = ?
     ORDER BY l.order_index ASC, l.created_at ASC`,
    [userId || '', moduleId],
  );

  return rows.map((row): Row => ({
    ...row,
    videoUrl: (row.video_r2_key as string | null) || null,
    video_url: (row.video_r2_key as string | null) || null,
    completed: toBoolean(row.completed),
  }));
}

async function getCourseWithModules(db: D1Database, courseId: string, userId?: string) {
  const row = await dbFirst<Row>(
    db,
    `SELECT c.*, c.title AS course_name, pu.full_name AS teacher_name
     FROM courses c
     LEFT JOIN platform_users pu ON pu.uid = c.teacher_id
     WHERE c.id = ?
     LIMIT 1`,
    [courseId],
  );
  if (!row) return null;

  const modules = await listModulesForCourse(db, courseId);
  const modulesWithLessons = await Promise.all(
    modules.map(async (moduleRow) => ({
      ...moduleRow,
      lessons: await listLessonsForModule(db, String(moduleRow.id || ''), userId),
    })),
  );

  return {
    ...row,
    modules: modulesWithLessons,
  };
}

async function listEnrollmentsForInstitution(
  db: D1Database,
  institutionId: string,
  courseId?: string,
  studentId?: string,
) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT e.*,
           pu.full_name AS student_name,
           pu.email AS student_email,
           c.title AS course_name
    FROM enrollments e
    JOIN platform_users pu ON pu.uid = e.student_id
    JOIN courses c ON c.id = e.course_id
    WHERE e.institution_id = ?
  `;

  if (courseId) {
    sql += ' AND e.course_id = ?';
    params.push(courseId);
  }
  if (studentId) {
    sql += ' AND e.student_id = ?';
    params.push(studentId);
  }

  sql += ' ORDER BY e.created_at DESC';
  return dbAll<Row>(db, sql, params);
}

function deriveStudentStatus(membershipStatus: unknown, applicationStatus: unknown) {
  const member = normalizeUserStatus(membershipStatus);
  const application = normalizeStudentLifecycleStatus(applicationStatus);
  if (member === 'suspended') return 'suspended';
  if (application === 'rejected') return 'rejected';
  if (member === 'active' || application === 'approved') return 'approved';
  return 'pending';
}

async function getStudentSummaryRows(db: D1Database, institutionId: string) {
  const [
    rows,
    enrollments,
    attendanceRecords,
    submissions,
    quizAttempts,
    lessonProgressRows,
    payments,
    lessonCountsRows,
  ] = await Promise.all([
    dbAll<Row>(
      db,
      `SELECT iu.*,
              pu.full_name,
              pu.email,
              pu.phone,
              pu.photo_url,
              pu.created_at AS user_created_at,
              sp.student_number,
              sp.payment_status,
              sp.total_fee,
              sp.amount_paid,
              sp.balance,
              sp.academic_status,
              sp.parent_guardian_name,
              sp.parent_guardian_email,
              sp.parent_guardian_phone,
              sp.notes,
              sp.registration_ip AS profile_registration_ip,
              sp.application_submitted_at AS profile_application_submitted_at,
              sp.approved_at AS profile_approved_at,
              sp.approved_by AS profile_approved_by,
              sp.rejected_at AS profile_rejected_at,
              sp.rejected_by AS profile_rejected_by,
              sp.suspended_at,
              sp.suspended_by,
              sp.suspension_reason,
              sp.reactivated_at,
              sp.last_login_at,
              sp.is_active,
              sa.id AS application_id,
              sa.status AS application_status,
              sa.application_submitted_at,
              sa.created_at AS application_created_at,
              sa.updated_at AS application_updated_at,
              sa.approved_at,
              sa.approved_by,
              sa.rejected_at,
              sa.rejected_by,
              sa.registration_ip,
              sa.parent_guardian_name AS application_parent_guardian_name,
              sa.parent_guardian_email AS application_parent_guardian_email,
              sa.parent_guardian_phone AS application_parent_guardian_phone,
              sa.notes AS application_notes
       FROM institution_users iu
       JOIN platform_users pu ON pu.uid = iu.user_id
       LEFT JOIN student_profiles sp
         ON sp.institution_id = iu.institution_id
        AND sp.user_id = iu.user_id
       LEFT JOIN student_applications sa
         ON sa.institution_id = iu.institution_id
        AND sa.user_id = iu.user_id
       WHERE iu.institution_id = ?
         AND iu.role = 'student'
       ORDER BY COALESCE(sa.application_submitted_at, sa.created_at, iu.created_at) DESC`,
      [institutionId],
    ),
    listEnrollmentsForInstitution(db, institutionId),
    listAttendanceRecords(db, institutionId),
    listSubmissionsForInstitution(db, institutionId),
    listQuizAttemptsForInstitution(db, institutionId),
    dbAll<Row>(db, 'SELECT * FROM lesson_progress WHERE institution_id = ?', [institutionId]),
    listPaymentsForInstitution(db, institutionId),
    dbAll<Row>(
      db,
      `SELECT c.id AS course_id, COUNT(l.id) AS total_lessons
       FROM courses c
       LEFT JOIN lessons l ON l.course_id = c.id AND l.published = 1
       WHERE c.institution_id = ?
       GROUP BY c.id`,
      [institutionId],
    ),
  ]);

  const lessonCountMap = new Map<string, number>();
  lessonCountsRows.forEach((row) => {
    lessonCountMap.set(String(row.course_id || ''), toNumber(row.total_lessons, 0));
  });

  const actorIds = new Set<string>();
  rows.forEach((row) => {
    [row.approved_by, row.rejected_by, row.profile_approved_by, row.profile_rejected_by, row.suspended_by].forEach((value) => {
      if (value) actorIds.add(String(value));
    });
  });

  const actorMap = new Map<string, string>();
  if (actorIds.size > 0) {
    const placeholders = [...actorIds].map(() => '?').join(', ');
    const actorRows = await dbAll<Row>(
      db,
      `SELECT uid, full_name FROM platform_users WHERE uid IN (${placeholders})`,
      [...actorIds],
    );
    actorRows.forEach((row) => actorMap.set(String(row.uid || ''), String(row.full_name || '')));
  }

  return rows.map((row) => {
    const studentId = String(row.user_id || '');
    const studentEnrollments = enrollments.filter((enrollment) => String(enrollment.student_id || '') === studentId);
    const activeEnrollments = studentEnrollments.filter((enrollment) => String(enrollment.status || '') !== 'dropped');
    const subjectNames = activeEnrollments.map((enrollment) => String(enrollment.course_name || '')).filter(Boolean);
    const totalLessons = activeEnrollments.reduce(
      (sum, enrollment) => sum + (lessonCountMap.get(String(enrollment.course_id || '')) || 0),
      0,
    );

    const completedLessons = lessonProgressRows.filter(
      (progress) => String(progress.student_id || '') === studentId && toBoolean(progress.completed),
    ).length;

    const studentAttendance = attendanceRecords.filter((record) => String(record.student_id || '') === studentId);
    const presentCount = studentAttendance.filter((record) => String(record.status || '') === 'present').length;
    const absentCount = studentAttendance.filter((record) => String(record.status || '') === 'absent').length;
    const lateCount = studentAttendance.filter((record) => String(record.status || '') === 'late').length;
    const attendancePercentage = studentAttendance.length
      ? Math.round((presentCount / studentAttendance.length) * 100)
      : 0;

    const studentSubmissions = submissions.filter((submission) => String(submission.student_id || '') === studentId);
    const gradedSubmissions = studentSubmissions.filter((submission) => submission.grade !== null && submission.grade !== undefined);
    const averageAssignmentGrade = gradedSubmissions.length
      ? Math.round(
          gradedSubmissions.reduce((sum, submission) => sum + toNumber(submission.grade, 0), 0) / gradedSubmissions.length,
        )
      : null;

    const studentQuizAttempts = quizAttempts.filter((attempt) => String(attempt.student_id || '') === studentId);
    const averageQuizScore = studentQuizAttempts.length
      ? Math.round(studentQuizAttempts.reduce((sum, attempt) => sum + toNumber(attempt.score, 0), 0) / studentQuizAttempts.length)
      : null;

    const paymentRows = payments.filter((payment) => String(payment.student_id || '') === studentId);
    const totalPaid = paymentRows.reduce((sum, payment) => sum + toNumber(payment.amount_paid, 0), 0);
    const totalFee = toNumber(row.total_fee, 0);
    const balance = row.balance !== undefined && row.balance !== null ? toNumber(row.balance, 0) : Math.max(totalFee - totalPaid, 0);
    const status = deriveStudentStatus(row.status, row.application_status);
    const createdAt = row.application_submitted_at || row.profile_application_submitted_at || row.application_created_at || row.user_created_at || row.created_at || null;
    const progressPercentage = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const assessmentAverage =
      averageQuizScore !== null && averageAssignmentGrade !== null
        ? Math.round((averageQuizScore + averageAssignmentGrade) / 2)
        : averageQuizScore ?? averageAssignmentGrade ?? null;

    const approvedById = String(row.approved_by || row.profile_approved_by || '') || null;
    const rejectedById = String(row.rejected_by || row.profile_rejected_by || '') || null;
    const suspendedById = String(row.suspended_by || '') || null;

    return {
      id: studentId,
      user_id: studentId,
      userId: studentId,
      institution_id: institutionId,
      institutionId: institutionId,
      application_id: row.application_id || null,
      applicationId: row.application_id || null,
      student_number: row.student_number || null,
      studentNumber: row.student_number || null,
      full_name: String(row.full_name || ''),
      fullName: String(row.full_name || ''),
      email: String(row.email || ''),
      phone: String(row.phone || ''),
      photo_url: (row.photo_url as string | null) || null,
      photoUrl: (row.photo_url as string | null) || null,
      status,
      application_status: normalizeStudentLifecycleStatus(row.application_status),
      applicationStatus: normalizeStudentLifecycleStatus(row.application_status),
      membership_status: normalizeUserStatus(row.status),
      membershipStatus: normalizeUserStatus(row.status),
      registration_ip: (row.registration_ip as string | null) || (row.profile_registration_ip as string | null) || null,
      registrationIp: (row.registration_ip as string | null) || (row.profile_registration_ip as string | null) || null,
      application_submitted_at: createdAt,
      applicationSubmittedAt: createdAt,
      approved_at: row.approved_at || row.profile_approved_at || null,
      approvedAt: row.approved_at || row.profile_approved_at || null,
      approved_by: approvedById,
      approvedBy: approvedById ? actorMap.get(approvedById) || approvedById : null,
      rejected_at: row.rejected_at || row.profile_rejected_at || null,
      rejectedAt: row.rejected_at || row.profile_rejected_at || null,
      rejected_by: rejectedById,
      rejectedBy: rejectedById ? actorMap.get(rejectedById) || rejectedById : null,
      suspended_at: row.suspended_at || null,
      suspendedAt: row.suspended_at || null,
      suspended_by: suspendedById,
      suspendedBy: suspendedById ? actorMap.get(suspendedById) || suspendedById : null,
      suspension_reason: row.suspension_reason || null,
      suspensionReason: row.suspension_reason || null,
      reactivated_at: row.reactivated_at || null,
      reactivatedAt: row.reactivated_at || null,
      last_login_at: row.last_login_at || null,
      lastLoginAt: row.last_login_at || null,
      is_active: status === 'approved' ? 1 : 0,
      isActive: status === 'approved',
      parent_guardian_name: row.parent_guardian_name || row.application_parent_guardian_name || null,
      parentGuardianName: row.parent_guardian_name || row.application_parent_guardian_name || null,
      parent_guardian_email: row.parent_guardian_email || row.application_parent_guardian_email || null,
      parentGuardianEmail: row.parent_guardian_email || row.application_parent_guardian_email || null,
      parent_guardian_phone: row.parent_guardian_phone || row.application_parent_guardian_phone || null,
      parentGuardianPhone: row.parent_guardian_phone || row.application_parent_guardian_phone || null,
      notes: row.notes || row.application_notes || null,
      enrolled_courses: activeEnrollments,
      enrolledCourses: activeEnrollments,
      enrollment_history: studentEnrollments,
      enrollmentHistory: studentEnrollments,
      subject_names: subjectNames,
      subjectNames,
      progress_percentage: progressPercentage,
      progressPercentage,
      completed_lessons: completedLessons,
      completedLessons,
      total_lessons: totalLessons,
      totalLessons,
      attendance_percentage: attendancePercentage,
      attendancePercentage,
      attendance_present: presentCount,
      attendancePresent: presentCount,
      attendance_absent: absentCount,
      attendanceAbsent: absentCount,
      attendance_late: lateCount,
      attendanceLate: lateCount,
      average_quiz_score: averageQuizScore,
      averageQuizScore,
      average_assignment_grade: averageAssignmentGrade,
      averageAssignmentGrade,
      assessment_average: assessmentAverage,
      assessmentAverage,
      payment_status: totalFee <= 0 ? 'unpaid' : balance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid',
      paymentStatus: totalFee <= 0 ? 'unpaid' : balance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid',
      total_fee: totalFee,
      totalFee,
      amount_paid: totalPaid,
      amountPaid: totalPaid,
      balance,
      created_at: createdAt,
      createdAt: createdAt,
      updated_at: row.updated_at || row.application_updated_at || null,
      updatedAt: row.updated_at || row.application_updated_at || null,
    };
  });
}

async function getStudentDetail(db: D1Database, institutionId: string, studentId: string) {
  const student = (await getStudentSummaryRows(db, institutionId)).find((row) => String(row.user_id || '') === studentId);
  if (!student) return null;

  const [auditRows, loginRows] = await Promise.all([
    dbAll<Row>(
      db,
      `SELECT *
       FROM audit_log
       WHERE institution_id = ? AND (target_id = ? OR user_id = ?)
       ORDER BY created_at DESC
       LIMIT 25`,
      [institutionId, studentId, studentId],
    ),
    dbAll<Row>(
      db,
      `SELECT *
       FROM login_history
       WHERE institution_id = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [institutionId, studentId],
    ),
  ]);

  const recentActivity = [
    ...auditRows.map((row) => ({
      id: String(row.id || ''),
      type: 'system',
      title: String(row.action || 'system.event'),
      description: row.metadata ? JSON.stringify(parseJsonValue(row.metadata, {})) : '',
      created_at: row.created_at || null,
      createdAt: row.created_at || null,
      actor_id: row.user_id || null,
      actorId: row.user_id || null,
      metadata: parseJsonValue(row.metadata, {}),
    })),
    ...loginRows.map((row) => ({
      id: String(row.id || ''),
      type: 'login',
      title: 'Student login',
      description: String(row.ip_address || ''),
      created_at: row.created_at || null,
      createdAt: row.created_at || null,
      actor_id: row.user_id || null,
      actorId: row.user_id || null,
      metadata: {
        ipAddress: row.ip_address || null,
        userAgent: row.user_agent || null,
      },
    })),
  ].sort((left, right) => new Date(String(right.createdAt || 0)).getTime() - new Date(String(left.createdAt || 0)).getTime());

  return {
    ...student,
    recent_activity: recentActivity,
    recentActivity,
  };
}

function deriveTeacherApprovalStatus(status: unknown) {
  const membershipStatus = normalizeUserStatus(status);
  if (membershipStatus === 'suspended') return 'suspended';
  if (membershipStatus === 'pending') return 'pending';
  return 'approved';
}

async function getTeacherSummaryRows(db: D1Database, institutionId: string) {
  const [
    rows,
    courses,
    teacherAttendance,
    submissions,
    quizAttempts,
    enrollments,
    lessonProgressRows,
  ] = await Promise.all([
    dbAll<Row>(
      db,
      `SELECT iu.*,
              pu.full_name,
              pu.email,
              pu.phone AS user_phone,
              pu.photo_url,
              pu.created_at AS user_created_at,
              tp.employee_number,
              tp.phone AS profile_phone,
              tp.gender,
              tp.address,
              tp.qualification,
              tp.profile_image_url,
              tp.assigned_courses,
              tp.department,
              tp.notes,
              tp.approved_at,
              tp.approved_by,
              tp.suspended_at,
              tp.suspended_by,
              tp.reactivated_at,
              tp.invite_sent_at,
              tp.invited_by,
              tp.last_login_at,
              tp.is_active,
              ui.id AS invite_id,
              ui.token AS invite_token,
              ui.status AS invite_status,
              ui.expires_at AS invite_expires_at
       FROM institution_users iu
       JOIN platform_users pu ON pu.uid = iu.user_id
       LEFT JOIN teacher_profiles tp
         ON tp.institution_id = iu.institution_id
        AND tp.user_id = iu.user_id
       LEFT JOIN user_invites ui
         ON ui.institution_id = iu.institution_id
        AND ui.email = pu.email
        AND ui.role = 'teacher'
        AND ui.status = 'pending'
       WHERE iu.institution_id = ?
         AND iu.role = 'teacher'
       ORDER BY pu.full_name ASC`,
      [institutionId],
    ),
    listCoursesForInstitution(db, institutionId),
    listTeacherAttendanceRecords(db, institutionId),
    listSubmissionsForInstitution(db, institutionId),
    listQuizAttemptsForInstitution(db, institutionId),
    listEnrollmentsForInstitution(db, institutionId),
    dbAll<Row>(db, 'SELECT * FROM lesson_progress WHERE institution_id = ?', [institutionId]),
  ]);

  const actorIds = new Set<string>();
  rows.forEach((row) => {
    [row.approved_by, row.suspended_by, row.invited_by].forEach((value) => {
      if (value) actorIds.add(String(value));
    });
  });

  const actorMap = new Map<string, string>();
  if (actorIds.size > 0) {
    const placeholders = [...actorIds].map(() => '?').join(', ');
    const actorRows = await dbAll<Row>(
      db,
      `SELECT uid, full_name FROM platform_users WHERE uid IN (${placeholders})`,
      [...actorIds],
    );
    actorRows.forEach((row) => actorMap.set(String(row.uid || ''), String(row.full_name || '')));
  }

  return rows.map((row) => {
    const teacherId = String(row.user_id || '');
    const assignedCourses = courses.filter((course) => String(course.teacher_id || '') === teacherId);
    const assignedCourseIds = assignedCourses.map((course) => String(course.id || ''));
    const assignedCourseNames = assignedCourses.map((course) => String(course.title || ''));
    const assignedEnrollments = enrollments.filter((enrollment) =>
      assignedCourseIds.includes(String(enrollment.course_id || '')),
    );
    const assignedStudentsCount = new Set(
      assignedEnrollments
        .filter((enrollment) => String(enrollment.status || '') !== 'dropped')
        .map((enrollment) => String(enrollment.student_id || '')),
    ).size;

    const attendanceRows = teacherAttendance.filter((record) => String(record.teacher_id || '') === teacherId);
    const presentCount = attendanceRows.filter((record) => String(record.status || '') === 'present').length;
    const latestAttendance = attendanceRows[0] || null;
    const attendancePercentage = attendanceRows.length
      ? Math.round((presentCount / attendanceRows.length) * 100)
      : 0;

    const teacherSubmissions = submissions.filter((submission) =>
      assignedCourseIds.includes(String(submission.course_id || '')),
    );
    const gradedSubmissions = teacherSubmissions.filter(
      (submission) => submission.grade !== null && submission.grade !== undefined,
    );
    const averageAssignmentGrade = gradedSubmissions.length
      ? Math.round(
          gradedSubmissions.reduce((sum, submission) => sum + toNumber(submission.grade, 0), 0) /
            gradedSubmissions.length,
        )
      : null;

    const teacherQuizAttempts = quizAttempts.filter((attempt) =>
      assignedCourseIds.includes(String(attempt.course_id || '')),
    );
    const averageQuizScore = teacherQuizAttempts.length
      ? Math.round(
          teacherQuizAttempts.reduce((sum, attempt) => sum + toNumber(attempt.score, 0), 0) /
            teacherQuizAttempts.length,
        )
      : null;

    const assignedStudentIds = new Set(
      assignedEnrollments
        .filter((enrollment) => String(enrollment.status || '') !== 'dropped')
        .map((enrollment) => String(enrollment.student_id || '')),
    );
    const completionSamples = [...assignedStudentIds].flatMap((studentId) => {
      const studentCourseIds = assignedCourseIds.filter((courseId) =>
        assignedEnrollments.some(
          (enrollment) =>
            String(enrollment.student_id || '') === studentId &&
            String(enrollment.course_id || '') === courseId &&
            String(enrollment.status || '') !== 'dropped',
        ),
      );
      return studentCourseIds.map((courseId) => {
        const totalLessons = lessonProgressRows.filter(
          (progress) => String(progress.course_id || '') === courseId,
        );
        const studentLessonRows = totalLessons.filter(
          (progress) => String(progress.student_id || '') === studentId,
        );
        const completedLessons = studentLessonRows.filter((progress) => toBoolean(progress.completed)).length;
        return totalLessons.length ? completedLessons / totalLessons.length : 0;
      });
    });
    const courseCompletionRate = completionSamples.length
      ? Math.round(
          (completionSamples.reduce((sum, completion) => sum + completion, 0) / completionSamples.length) * 100,
        )
      : 0;

    const averageStudentScore =
      averageQuizScore !== null && averageAssignmentGrade !== null
        ? Math.round((averageQuizScore + averageAssignmentGrade) / 2)
        : averageQuizScore ?? averageAssignmentGrade ?? null;

    const approvalStatus = deriveTeacherApprovalStatus(row.status);
    const activeStatus = approvalStatus === 'approved' ? 'active' : 'inactive';
    const approvedById = String(row.approved_by || '') || null;
    const suspendedById = String(row.suspended_by || '') || null;
    const invitedById = String(row.invited_by || '') || null;

    return {
      id: teacherId,
      user_id: teacherId,
      userId: teacherId,
      institution_id: institutionId,
      institutionId: institutionId,
      invite_id: row.invite_id || null,
      inviteId: row.invite_id || null,
      invite_token: row.invite_token || null,
      inviteToken: row.invite_token || null,
      invite_status: row.invite_status || null,
      inviteStatus: row.invite_status || null,
      full_name: String(row.full_name || ''),
      fullName: String(row.full_name || ''),
      email: String(row.email || ''),
      phone: String(row.profile_phone || row.user_phone || ''),
      gender: (row.gender as string | null) || null,
      address: (row.address as string | null) || null,
      qualification: (row.qualification as string | null) || null,
      profile_image_url: (row.profile_image_url as string | null) || (row.photo_url as string | null) || null,
      profileImageUrl: (row.profile_image_url as string | null) || (row.photo_url as string | null) || null,
      employee_number: row.employee_number || null,
      employeeNumber: row.employee_number || null,
      assigned_courses: assignedCourses,
      assignedCourses,
      assigned_course_ids: assignedCourseIds,
      assignedCourseIds,
      assigned_course_names: assignedCourseNames,
      assignedCourseNames,
      assigned_courses_count: assignedCourseIds.length,
      assignedCoursesCount: assignedCourseIds.length,
      assigned_students_count: assignedStudentsCount,
      assignedStudentsCount,
      attendance_percentage: attendancePercentage,
      attendancePercentage,
      latest_attendance_status: latestAttendance ? String(latestAttendance.status || '') as 'present' | 'absent' | 'late' : null,
      latestAttendanceStatus: latestAttendance ? String(latestAttendance.status || '') as 'present' | 'absent' | 'late' : null,
      attendance_history: attendanceRows,
      attendanceHistory: attendanceRows,
      approval_status: approvalStatus,
      approvalStatus,
      active_status: activeStatus,
      activeStatus,
      average_student_score: averageStudentScore,
      averageStudentScore,
      average_quiz_score: averageQuizScore,
      averageQuizScore,
      average_assignment_grade: averageAssignmentGrade,
      averageAssignmentGrade,
      course_completion_rate: courseCompletionRate,
      courseCompletionRate,
      last_login_at: row.last_login_at || null,
      lastLoginAt: row.last_login_at || null,
      approved_at: row.approved_at || null,
      approvedAt: row.approved_at || null,
      approved_by: approvedById,
      approvedBy: approvedById ? actorMap.get(approvedById) || approvedById : null,
      suspended_at: row.suspended_at || null,
      suspendedAt: row.suspended_at || null,
      suspended_by: suspendedById,
      suspendedBy: suspendedById ? actorMap.get(suspendedById) || suspendedById : null,
      reactivated_at: row.reactivated_at || null,
      reactivatedAt: row.reactivated_at || null,
      invite_sent_at: row.invite_sent_at || null,
      inviteSentAt: row.invite_sent_at || null,
      invited_by: invitedById,
      invitedBy: invitedById ? actorMap.get(invitedById) || invitedById : null,
      notes: row.notes || null,
      created_at: row.user_created_at || row.created_at || null,
      createdAt: row.user_created_at || row.created_at || null,
      updated_at: row.updated_at || null,
      updatedAt: row.updated_at || null,
    };
  });
}

async function getTeacherDetail(db: D1Database, institutionId: string, teacherId: string) {
  const teacher = (await getTeacherSummaryRows(db, institutionId)).find(
    (row) => String(row.user_id || '') === teacherId,
  );
  if (!teacher) return null;

  return teacher;
}

async function listAssignmentsForInstitution(db: D1Database, institutionId: string, courseId?: string, lessonId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT a.*,
           c.title AS course_name,
           pu.full_name AS teacher_name
    FROM assignments a
    JOIN courses c ON c.id = a.course_id
    JOIN platform_users pu ON pu.uid = a.teacher_id
    WHERE a.institution_id = ?
  `;
  if (courseId) {
    sql += ' AND a.course_id = ?';
    params.push(courseId);
  }
  if (lessonId) {
    sql += ' AND a.lesson_id = ?';
    params.push(lessonId);
  }
  sql += ' ORDER BY a.created_at DESC';
  return dbAll<Row>(db, sql, params);
}

async function listSubmissionsForInstitution(
  db: D1Database,
  institutionId: string,
  assignmentId?: string,
  studentId?: string,
) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT s.*,
           a.title AS assignment_title,
           a.course_id,
           pu.full_name AS student_name
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN platform_users pu ON pu.uid = s.student_id
    WHERE s.institution_id = ?
  `;
  if (assignmentId) {
    sql += ' AND s.assignment_id = ?';
    params.push(assignmentId);
  }
  if (studentId) {
    sql += ' AND s.student_id = ?';
    params.push(studentId);
  }
  sql += ' ORDER BY s.submitted_at DESC';
  return dbAll<Row>(db, sql, params);
}

async function listQuizzesForInstitution(db: D1Database, institutionId: string, courseId?: string, lessonId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT q.*,
           c.title AS course_name,
           pu.full_name AS teacher_name
    FROM quizzes q
    JOIN courses c ON c.id = q.course_id
    JOIN platform_users pu ON pu.uid = q.teacher_id
    WHERE q.institution_id = ?
  `;
  if (courseId) {
    sql += ' AND q.course_id = ?';
    params.push(courseId);
  }
  if (lessonId) {
    sql += ' AND q.lesson_id = ?';
    params.push(lessonId);
  }
  sql += ' ORDER BY q.created_at DESC';

  const rows = await dbAll<Row>(db, sql, params);
  return rows.map((row): Row => ({
    ...row,
    questions: parseJsonValue(row.questions, []),
    time_limit: row.time_limit_minutes,
  }));
}

async function listQuizAttemptsForInstitution(
  db: D1Database,
  institutionId: string,
  quizId?: string,
  studentId?: string,
) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT qa.*,
           q.title AS quiz_title,
           q.course_id,
           c.title AS course_name,
           pu.full_name AS student_name
    FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id
    JOIN courses c ON c.id = q.course_id
    JOIN platform_users pu ON pu.uid = qa.student_id
    WHERE qa.institution_id = ?
  `;
  if (quizId) {
    sql += ' AND qa.quiz_id = ?';
    params.push(quizId);
  }
  if (studentId) {
    sql += ' AND qa.student_id = ?';
    params.push(studentId);
  }
  sql += ' ORDER BY qa.submitted_at DESC';

  const rows = await dbAll<Row>(db, sql, params);
  return rows.map((row): Row => ({
    ...row,
    answers: parseJsonValue(row.answers, {}),
    questions_snapshot: parseJsonValue(row.questions_snapshot, []),
    questions: parseJsonValue(row.questions_snapshot, []),
  }));
}

async function listAttendanceSessions(db: D1Database, courseId: string) {
  return dbAll<Row>(
    db,
    `SELECT s.*, c.title AS course_name
     FROM attendance_sessions s
     JOIN courses c ON c.id = s.course_id
     WHERE s.course_id = ?
     ORDER BY s.session_date DESC`,
    [courseId],
  );
}

async function listAttendanceRecords(db: D1Database, institutionId: string, sessionId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT ar.*,
           asn.course_id,
           asn.session_date AS created_at,
           pu.full_name AS student_name,
           c.title AS course_name
    FROM attendance_records ar
    JOIN attendance_sessions asn ON asn.id = ar.session_id
    JOIN platform_users pu ON pu.uid = ar.student_id
    JOIN courses c ON c.id = asn.course_id
    WHERE ar.institution_id = ?
  `;
  if (sessionId) {
    sql += ' AND ar.session_id = ?';
    params.push(sessionId);
  }
  sql += ' ORDER BY asn.session_date DESC, pu.full_name ASC';
  return dbAll<Row>(db, sql, params);
}

async function listTeacherAttendanceRecords(
  db: D1Database,
  institutionId: string,
  teacherId?: string,
  month?: string,
) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT tar.*,
           pu.full_name AS teacher_name,
           marker.full_name AS marked_by_name
    FROM teacher_attendance_records tar
    JOIN platform_users pu ON pu.uid = tar.teacher_id
    LEFT JOIN platform_users marker ON marker.uid = tar.marked_by
    WHERE tar.institution_id = ?
  `;
  if (teacherId) {
    sql += ' AND tar.teacher_id = ?';
    params.push(teacherId);
  }
  if (month) {
    sql += ' AND substr(tar.attendance_date, 1, 7) = ?';
    params.push(month);
  }
  sql += ' ORDER BY tar.attendance_date DESC, pu.full_name ASC';
  return dbAll<Row>(db, sql, params);
}

async function listPaymentsForInstitution(db: D1Database, institutionId: string, studentId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT p.*,
           pu.full_name AS student_name,
           c.title AS course_name
    FROM payments p
    JOIN platform_users pu ON pu.uid = p.student_id
    LEFT JOIN courses c ON c.id = p.course_id
    WHERE p.institution_id = ?
  `;
  if (studentId) {
    sql += ' AND p.student_id = ?';
    params.push(studentId);
  }
  sql += ' ORDER BY p.payment_date DESC';
  return dbAll<Row>(db, sql, params);
}

async function listInvoicesForInstitution(db: D1Database, institutionId: string) {
  return dbAll<Row>(
    db,
    `SELECT i.*,
            pu.full_name AS student_name,
            c.title AS course_name
     FROM invoices i
     JOIN platform_users pu ON pu.uid = i.student_id
     LEFT JOIN courses c ON c.id = i.course_id
     WHERE i.institution_id = ?
     ORDER BY i.issued_at DESC`,
    [institutionId],
  );
}

async function listRefundsForInstitution(db: D1Database, institutionId: string) {
  return dbAll<Row>(
    db,
    `SELECT r.*,
            pu.full_name AS student_name
     FROM refunds r
     JOIN platform_users pu ON pu.uid = r.student_id
     WHERE r.institution_id = ?
     ORDER BY r.created_at DESC`,
    [institutionId],
  );
}

async function listAnnouncementsForInstitution(db: D1Database, institutionId: string, courseId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT a.*,
           c.title AS course_name
    FROM announcements a
    LEFT JOIN courses c ON c.id = a.course_id
    WHERE a.institution_id = ?
  `;
  if (courseId) {
    sql += ' AND (a.course_id = ? OR a.course_id IS NULL)';
    params.push(courseId);
  }
  sql += ' ORDER BY a.created_at DESC';
  const rows = await dbAll<Row>(db, sql, params);
  return rows.map((row): Row => ({
    ...row,
    message: row.content,
  }));
}

async function listDiscussionsForInstitution(db: D1Database, institutionId: string, courseId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT d.*,
           COALESCE(COUNT(dp.id), 0) AS post_count
    FROM discussions d
    LEFT JOIN discussion_posts dp ON dp.discussion_id = d.id
    WHERE d.institution_id = ?
  `;
  if (courseId) {
    sql += ' AND d.course_id = ?';
    params.push(courseId);
  }
  sql += ' GROUP BY d.id ORDER BY d.pinned DESC, d.updated_at DESC';
  return dbAll<Row>(db, sql, params);
}

async function listDiscussionPosts(db: D1Database, discussionId: string) {
  return dbAll<Row>(
    db,
    `SELECT *
     FROM discussion_posts
     WHERE discussion_id = ?
     ORDER BY created_at ASC`,
    [discussionId],
  );
}

async function listLiveClassesForInstitution(db: D1Database, institutionId: string, courseId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT lc.*,
           c.title AS course_name
    FROM live_classes lc
    JOIN courses c ON c.id = lc.course_id
    WHERE lc.institution_id = ?
  `;
  if (courseId) {
    sql += ' AND lc.course_id = ?';
    params.push(courseId);
  }
  sql += ' ORDER BY lc.scheduled_at DESC';
  const rows = await dbAll<Row>(db, sql, params);
  return rows.map((row): Row => ({
    ...row,
    meetingLink: row.meeting_url,
    meetingUrl: row.meeting_url,
    dateTime: row.scheduled_at,
  }));
}

async function listCertificatesForInstitution(db: D1Database, institutionId: string, courseId?: string, studentId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT cert.*,
           pu.full_name AS student_name,
           c.title AS course_name
    FROM certificates cert
    JOIN platform_users pu ON pu.uid = cert.student_id
    JOIN courses c ON c.id = cert.course_id
    WHERE cert.institution_id = ?
  `;
  if (courseId) {
    sql += ' AND cert.course_id = ?';
    params.push(courseId);
  }
  if (studentId) {
    sql += ' AND cert.student_id = ?';
    params.push(studentId);
  }
  sql += ' ORDER BY cert.issued_date DESC';
  return dbAll<Row>(db, sql, params);
}

async function listTimetableEntries(db: D1Database, institutionId: string, teacherId?: string) {
  const params: unknown[] = [institutionId];
  let sql = `
    SELECT t.*,
           c.title AS course_name
    FROM timetable_entries t
    JOIN courses c ON c.id = t.course_id
    WHERE t.institution_id = ?
  `;
  if (teacherId) {
    sql += ' AND t.teacher_id = ?';
    params.push(teacherId);
  }
  sql += ' ORDER BY t.day_of_week ASC, t.start_time ASC';
  return dbAll<Row>(db, sql, params);
}

async function listMessagesForInstitution(db: D1Database, institutionId: string, currentUserId: string, peerId?: string) {
  const params: unknown[] = [institutionId, currentUserId, currentUserId];
  let sql = `
    SELECT *
    FROM messages
    WHERE institution_id = ?
      AND (from_user_id = ? OR to_user_id = ?)
  `;
  if (peerId) {
    sql += ' AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))';
    params.push(currentUserId, peerId, peerId, currentUserId);
  }
  sql += ' ORDER BY created_at ASC';
  return dbAll<Row>(db, sql, params);
}

async function listNotificationsForUser(db: D1Database, institutionId: string, userId: string) {
  return dbAll<Row>(
    db,
    `SELECT *
     FROM notifications
     WHERE institution_id = ? AND user_id = ?
     ORDER BY created_at DESC`,
    [institutionId, userId],
  );
}

async function listMaterialsForInstitution(db: D1Database, institutionId: string) {
  const rows = await dbAll<Row>(
    db,
    `SELECT *
     FROM content_library
     WHERE institution_id = ?
     ORDER BY created_at DESC`,
    [institutionId],
  );

  return rows.map((row): Row => ({
    ...row,
    name: row.title,
    type:
      row.file_type === 'video'
        ? 'Video'
        : row.file_type === 'pdf'
          ? 'PDF'
          : row.file_type === 'image'
            ? 'Image'
            : row.file_type === 'slides'
              ? 'Slides'
              : 'Document',
    size: formatStoredFileSize(row.file_size),
    download_url:
      (row.download_url as string | null) ||
      ((row.r2_key as string | null) ? publicObjectUrl(String(row.r2_key)) : null),
    downloadUrl:
      (row.download_url as string | null) ||
      ((row.r2_key as string | null) ? publicObjectUrl(String(row.r2_key)) : null),
  }));
}

async function createStorageObject(
  bucket: R2Bucket,
  kind: string,
  request: Request,
) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new Error('File upload is required');
  }

  const key =
    String(form.get('key') || '') ||
    `${kind}/${Date.now()}-${sanitizeFilename(file.name || 'upload.bin')}`;

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
    },
  });

  return {
    key,
    url: publicObjectUrl(key),
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    filename: file.name,
  };
}

function buildUpdateStatement(table: string, fields: Row, idField = 'id') {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  return {
    sql: `UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`,
    values,
  };
}

async function forwardRawRequest(url: string | URL, rawRequest: Request, method: string) {
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: rawRequest.headers,
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await rawRequest.clone().arrayBuffer();
    init.duplex = 'half';
  }

  return new Request(url, init);
}

export function createApp(options: CreateAppOptions = {}) {
  const verifyToken = options.verifyToken || verifyFirebaseIdToken;
  const provisionAuthUser = options.provisionAuthUser || createFirebaseEmailPasswordUser;
  const deliverInvitationEmail = options.deliverInvitationEmail || sendMockInvitationEmail;
  const app = new Hono<AppBindings>();

  app.use('*', async (context, next) => {
    context.header('Access-Control-Allow-Origin', '*');
    context.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    context.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    context.header('Access-Control-Max-Age', '86400');

    if (context.req.method === 'OPTIONS') {
      return context.body(null, 204);
    }

    await next();
  });

  app.use('*', logger());

  app.get('/api/public/institutions/by-slug/:slug', async (context) => {
    const institution = await getInstitutionBySlug(context.env.DB, context.req.param('slug'));
    if (!institution) return context.json({ error: 'Institution not found' }, 404);
    return context.json(institution);
  });

  app.get('/api/public/institutions/search', async (context) => {
    const query = (context.req.query('q') || '').trim().toLowerCase();
    const params: unknown[] = [];
    let sql = `
      SELECT *
      FROM institutions
      WHERE status = 'active'
    `;
    if (query) {
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(slug) LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }
    sql += ' ORDER BY name ASC LIMIT 50';
    const rows = await dbAll<Row>(context.env.DB, sql, params);
    return context.json(rows.map((row) => mapInstitution(row)));
  });

  app.get('/api/public/invites/by-token/:token', async (context) => {
    const row = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM user_invites WHERE token = ? LIMIT 1',
      [context.req.param('token')],
    );
    if (!row) return context.json({ error: 'Invite not found' }, 404);
    return context.json({
      ...row,
      fullName: row.full_name,
      expiresAt: row.expires_at,
      institutionId: row.institution_id,
    });
  });

  app.get('/api/storage/object', async (context) => {
    const header = context.req.header('Authorization') || '';
    const match = /^Bearer\s+(.+)$/.exec(header);
    if (!match) return context.json({ error: 'Missing bearer token' }, 401);

    const verified = await verifyToken(match[1], context.env);
    if (!verified) return context.json({ error: 'Invalid or expired token' }, 401);

    const key = context.req.query('key');
    if (!key) return context.json({ error: 'Missing storage key' }, 400);
    const object = await context.env.BUCKET.get(key);
    if (!object) return context.json({ error: 'Object not found' }, 404);

    const headers = new Headers();
    if (object.httpMetadata?.contentType) headers.set('content-type', object.httpMetadata.contentType);
    if (object.httpMetadata?.contentDisposition) headers.set('content-disposition', object.httpMetadata.contentDisposition);
    if (object.httpMetadata?.contentEncoding) headers.set('content-encoding', object.httpMetadata.contentEncoding);
    if (object.httpMetadata?.contentLanguage) headers.set('content-language', object.httpMetadata.contentLanguage);
    if (object.httpMetadata?.cacheControl) headers.set('cache-control', object.httpMetadata.cacheControl);
    headers.set('etag', object.etag);
    return new Response(object.body, { headers });
  });

  app.post('/api/auth/password-reset-request', async (context) => {
    const body = await parseRequestBody<{ email: string; institutionId?: string }>(context.req.raw);
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return context.json({ error: 'Email is required' }, 400);

    const token = newId();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await dbRun(
      context.env.DB,
      `INSERT INTO password_reset_requests (id, email, institution_id, token, ip_address, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        email,
        body.institutionId || null,
        token,
        context.req.header('CF-Connecting-IP') || null,
        expiresAt,
        nowIso(),
      ],
    );

    const appBaseUrl = normalizeBaseUrl(context.env.APP_URL);
    const resetUrl = new URL(`/?resetToken=${encodeURIComponent(token)}`, appBaseUrl).toString();
    void sendTransactionalEmail(context.env, {
      to: email,
      toName: email,
      subject: 'Reset your Thutify password',
      text: `We received a request to reset the password for ${email}. Use the link below to continue. This link expires in 1 hour. ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827;">
          <h2 style="margin-bottom: 8px;">Reset your password</h2>
          <p>We received a request to reset the password for <strong>${email}</strong>.</p>
          <p>Use the button below to continue. This reset link expires in 1 hour.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset password</a>
          </p>
          <p>If you did not request this reset, you can ignore this email.</p>
        </div>
      `,
    }).catch((error) => {
      console.error('Failed to send reset email', error);
    });

    return context.json({ success: true, token, expiresAt });
  });

  app.post('/api/auth/password-reset/:token', async (context) => {
    const token = context.req.param('token');
    const row = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM password_reset_requests WHERE token = ? LIMIT 1',
      [token],
    );

    if (!row) return context.json({ error: 'Reset token not found' }, 404);
    if (row.used_at) return context.json({ error: 'Reset token already used' }, 409);
    if (row.expires_at && new Date(String(row.expires_at)).getTime() < Date.now()) {
      return context.json({ error: 'Reset token expired' }, 410);
    }

    await dbRun(
      context.env.DB,
      'UPDATE password_reset_requests SET used_at = ? WHERE token = ?',
      [nowIso(), token],
    );

    return context.json({
      success: true,
      message: 'Password reset request recorded. Apply the new password through Firebase Auth in the client.',
    });
  });

  app.use('/api/*', async (context, next) => {
    const header = context.req.header('Authorization') || '';
    const match = /^Bearer\s+(.+)$/.exec(header);
    if (!match) return context.json({ error: 'Missing bearer token' }, 401);

    const verified = await verifyToken(match[1], context.env);
    if (!verified) return context.json({ error: 'Invalid or expired token' }, 401);

    const platformUser = await ensurePlatformUser(context.env.DB, verified);
    context.set('user', verified);
    context.set('platformUser', platformUser);
    await next();
  });

  app.get('/api/me', async (context) => {
    return context.json(context.get('platformUser'));
  });

  app.patch('/api/me', async (context) => {
    const verified = context.get('user');
    const body = await parseRequestBody<{ fullName?: string; phone?: string; photoUrl?: string }>(
      context.req.raw,
    );

    const fields: Row = {
      full_name: body.fullName,
      phone: body.phone,
      photo_url: body.photoUrl,
      updated_at: nowIso(),
    };
    const update = buildUpdateStatement('platform_users', fields, 'uid');
    await dbRun(context.env.DB, update.sql, [...update.values, verified.uid]);

    const row = await dbFirst<Row>(context.env.DB, 'SELECT * FROM platform_users WHERE uid = ?', [verified.uid]);
    const completedLessons = await getCompletedLessonIds(context.env.DB, verified.uid);
    return context.json(mapPlatformUser(row || {}, completedLessons));
  });

  app.post('/api/auth/register', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const body = await parseRequestBody<{ institution?: InstitutionInput; fullName?: string; phone?: string }>(
      context.req.raw,
    );

    if (body.fullName || body.phone) {
      const fields: Row = {
        full_name: body.fullName,
        phone: body.phone,
        updated_at: nowIso(),
      };
      const update = buildUpdateStatement('platform_users', fields, 'uid');
      await dbRun(context.env.DB, update.sql, [...update.values, verified.uid]);
    }

    let institution = null;
    let membership = null;
    if (body.institution) {
      const slug = slugify(body.institution.slug || body.institution.name);
      const existing = await getInstitutionBySlug(context.env.DB, slug);
      if (existing) return context.json({ error: 'Institution slug already exists' }, 409);

      const institutionId = newId();
      await dbRun(
        context.env.DB,
        `INSERT INTO institutions
         (id, name, slug, logo_url, primary_color, country, institution_type, owner_user_id, status, timezone, currency, locale, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'UTC', 'USD', 'en', ?, ?)`,
        [
          institutionId,
          body.institution.name,
          slug,
          body.institution.logoUrl || null,
          body.institution.primaryColor || '#000000',
          body.institution.country || '',
          body.institution.institutionType,
          verified.uid,
          nowIso(),
          nowIso(),
        ],
      );
      await dbRun(
        context.env.DB,
        `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'owner', 'active', ?, ?)`,
        [newId(), institutionId, verified.uid, nowIso(), nowIso()],
      );
      institution = await getInstitutionById(context.env.DB, institutionId);
      membership = await getMembership(context.env.DB, institutionId, verified.uid);

      const appBaseUrl = normalizeBaseUrl(context.env.APP_URL);
      const dashboardUrl = new URL(`/${institution?.slug || slug}/login`, appBaseUrl).toString();
      void sendTransactionalEmail(context.env, {
        to: verified.email,
        toName: body.fullName || verified.name || verified.email,
        subject: `Welcome to ${institution?.name || body.institution.name}`,
        text: `Your institution dashboard is ready. Sign in at ${dashboardUrl} to manage your school or campus.`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111827;">
            <h2 style="margin-bottom: 8px;">Welcome to ${institution?.name || body.institution.name}</h2>
            <p>Your institution dashboard is ready. Sign in at <a href="${dashboardUrl}">${dashboardUrl}</a> to manage classrooms, students, and staff.</p>
          </div>
        `,
      }).catch((error) => {
        console.error('Failed to send institution welcome email', error);
      });
    }

    return context.json({
      user: body.fullName || body.phone ? await ensurePlatformUser(context.env.DB, verified) : platformUser,
      institution,
      membership,
    });
  });

  app.post('/api/auth/institution-invite', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const body = await parseRequestBody<{
      institutionId: string;
      email: string;
      fullName?: string;
      role: UserRole;
      assignedCourses?: string[];
    }>(context.req.raw);

    const institutionId = String(body.institutionId || '').trim();
    if (!institutionId || !body.email || !body.role) {
      return context.json({ error: 'institutionId, email, and role are required' }, 400);
    }

    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const pendingUser = await dbFirst<Row>(
      context.env.DB,
      'SELECT uid FROM platform_users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [String(body.email).trim()],
    );

    const invite = {
      id: newId(),
      token: newId(),
      institution_id: institutionId,
      email: String(body.email).trim().toLowerCase(),
      full_name: body.fullName || '',
      role: normalizeRole(body.role),
      assigned_courses: JSON.stringify(body.assignedCourses || []),
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: verified.uid,
      pending_user_id: pendingUser ? String(pendingUser.uid || '') : null,
      created_at: nowIso(),
    };

    await dbRun(
      context.env.DB,
      `INSERT INTO user_invites
       (id, institution_id, email, full_name, role, assigned_courses, token, status, expires_at, created_by, pending_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invite.id,
        invite.institution_id,
        invite.email,
        invite.full_name,
        invite.role,
        invite.assigned_courses,
        invite.token,
        invite.status,
        invite.expires_at,
        invite.created_by,
        invite.pending_user_id,
        invite.created_at,
      ],
    );

    return context.json({
      ...invite,
      fullName: invite.full_name,
      assignedCourses: parseJsonValue(invite.assigned_courses, []),
      expiresAt: invite.expires_at,
      createdBy: invite.created_by,
      institutionId: invite.institution_id,
    });
  });

  app.post('/api/auth/accept-invite/:inviteId', async (context) => {
    const verified = context.get('user');
    const inviteId = context.req.param('inviteId');
    const invite = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM user_invites WHERE id = ? LIMIT 1',
      [inviteId],
    );

    if (!invite) return context.json({ error: 'Invite not found' }, 404);
    if (String(invite.status || '') !== 'pending') {
      return context.json({ error: 'Invite is no longer active' }, 409);
    }
    if (invite.expires_at && new Date(String(invite.expires_at)).getTime() < Date.now()) {
      return context.json({ error: 'Invite expired' }, 410);
    }

    await dbRun(
      context.env.DB,
      `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET
         role = excluded.role,
         status = 'active',
         updated_at = excluded.updated_at`,
      [
        newId(),
        String(invite.institution_id || ''),
        verified.uid,
        normalizeRole(invite.role),
        nowIso(),
        nowIso(),
      ],
    );

    if (normalizeRole(invite.role) === 'teacher' || normalizeRole(invite.role) === 'admin') {
      await ensureTeacherProfile(context.env.DB, String(invite.institution_id || ''), verified.uid, {});
    } else {
      await ensureStudentProfile(context.env.DB, String(invite.institution_id || ''), verified.uid, {
        phone: '',
      });
    }

    await dbRun(
      context.env.DB,
      'UPDATE user_invites SET status = ?, pending_user_id = ? WHERE id = ?',
      ['used', verified.uid, inviteId],
    );

    const membership = await getMembership(
      context.env.DB,
      String(invite.institution_id || ''),
      verified.uid,
    );
    return context.json(membership);
  });

  app.post('/api/auth/request-join/:institutionSlug', async (context) => {
    const verified = context.get('user');
    const body = await parseRequestBody<{
      fullName?: string;
      email?: string;
      phone?: string;
      parentGuardianName?: string;
      parentGuardianEmail?: string;
      parentGuardianPhone?: string;
      notes?: string;
    }>(context.req.raw);
    const institution = await getInstitutionBySlug(context.env.DB, context.req.param('institutionSlug'));
    if (!institution) return context.json({ error: 'Institution not found' }, 404);
    const submittedAt = nowIso();
    const registrationIp = getClientIp(context.req.raw);

    const platformUserUpdate = buildUpdateStatement(
      'platform_users',
      {
        full_name: body.fullName,
        phone: body.phone,
        updated_at: submittedAt,
      },
      'uid',
    );
    if (platformUserUpdate.values.length > 0) {
      await dbRun(context.env.DB, platformUserUpdate.sql, [...platformUserUpdate.values, verified.uid]);
    }

    await dbRun(
      context.env.DB,
      `INSERT INTO student_applications
       (id, institution_id, user_id, full_name, email, phone, status, application_submitted_at, registration_ip, parent_guardian_name, parent_guardian_email, parent_guardian_phone, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET
         full_name = excluded.full_name,
         email = excluded.email,
         phone = excluded.phone,
         application_submitted_at = excluded.application_submitted_at,
         registration_ip = excluded.registration_ip,
         parent_guardian_name = excluded.parent_guardian_name,
         parent_guardian_email = excluded.parent_guardian_email,
         parent_guardian_phone = excluded.parent_guardian_phone,
         notes = excluded.notes,
         status = 'pending',
         approved_at = NULL,
         approved_by = NULL,
         rejected_at = NULL,
         rejected_by = NULL,
         updated_at = excluded.updated_at`,
      [
        newId(),
        institution.id,
        verified.uid,
        body.fullName || verified.name || '',
        body.email || verified.email || '',
        body.phone || '',
        submittedAt,
        registrationIp,
        body.parentGuardianName || null,
        body.parentGuardianEmail || null,
        body.parentGuardianPhone || null,
        body.notes || null,
        submittedAt,
        submittedAt,
      ],
    );

    await dbRun(
      context.env.DB,
      `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'student', 'pending', ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET
         role = 'student',
         status = 'pending',
         updated_at = excluded.updated_at`,
      [newId(), institution.id, verified.uid, submittedAt, submittedAt],
    );

    await ensureStudentProfile(context.env.DB, institution.id, verified.uid, {
      phone: body.phone || '',
    });
    await updateStudentProfileFields(context.env.DB, institution.id, verified.uid, {
      phone: body.phone || undefined,
      parent_guardian_name: body.parentGuardianName ?? null,
      parent_guardian_email: body.parentGuardianEmail ?? null,
      parent_guardian_phone: body.parentGuardianPhone ?? null,
      notes: body.notes ?? null,
      registration_ip: registrationIp,
      application_submitted_at: submittedAt,
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
      reactivated_at: null,
      is_active: 0,
      updated_at: submittedAt,
    });

    const application = await dbFirst<Row>(
      context.env.DB,
      `SELECT *
       FROM student_applications
       WHERE institution_id = ? AND user_id = ?
      LIMIT 1`,
      [institution.id, verified.uid],
    );
    await logAuditAction(context.env.DB, context.req.raw, {
      institutionId: institution.id,
      userId: verified.uid,
      action: 'student.application.submitted',
      targetTable: 'student_applications',
      targetId: String(application?.id || ''),
      metadata: {
        email: body.email || verified.email || '',
      },
    });

    const applicantEmail = String(body.email || verified.email || '').trim();
    if (applicantEmail) {
      const dashboardUrl = new URL(`/${institution.slug}/login`, normalizeBaseUrl(context.env.APP_URL)).toString();
      void sendTransactionalEmail(context.env, {
        to: applicantEmail,
        toName: body.fullName || verified.name || applicantEmail,
        subject: `Your application to ${institution.name} is pending`,
        text: `Your application to ${institution.name} has been submitted. We will review it and notify you when your access is approved. You can sign in at ${dashboardUrl} to track your status.`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111827;">
            <h2 style="margin-bottom: 8px;">Application received</h2>
            <p>Your application to <strong>${institution.name}</strong> has been submitted and is awaiting review.</p>
            <p>Once approved, you will receive access to the student dashboard. You can visit <a href="${dashboardUrl}">${dashboardUrl}</a>.</p>
          </div>
        `,
      }).catch((error) => {
        console.error('Failed to send student application email', error);
      });
    }

    return context.json(mapStudentApplication(application));
  });

  app.post('/api/auth/approve-application/:appId', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const appId = context.req.param('appId');
    const body = await parseRequestBody<{ status?: 'approved' | 'rejected'; reason?: string }>(context.req.raw);
    const application = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM student_applications WHERE id = ? LIMIT 1',
      [appId],
    );

    if (!application) return context.json({ error: 'Application not found' }, 404);

    const institutionId = String(application.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const nextStatus = body.status === 'rejected' ? 'rejected' : 'approved';
    const actionedAt = nowIso();
    await dbRun(
      context.env.DB,
      `UPDATE student_applications
       SET status = ?,
           approved_at = ?,
           approved_by = ?,
           rejected_at = ?,
           rejected_by = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        nextStatus,
        nextStatus === 'approved' ? actionedAt : null,
        nextStatus === 'approved' ? verified.uid : null,
        nextStatus === 'rejected' ? actionedAt : null,
        nextStatus === 'rejected' ? verified.uid : null,
        actionedAt,
        appId,
      ],
    );

    if (nextStatus === 'approved') {
      await dbRun(
        context.env.DB,
        `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'student', 'active', ?, ?)
         ON CONFLICT(institution_id, user_id) DO UPDATE SET
           role = 'student',
           status = 'active',
           updated_at = excluded.updated_at`,
        [newId(), institutionId, String(application.user_id || ''), actionedAt, actionedAt],
      );
      await ensureStudentProfile(context.env.DB, institutionId, String(application.user_id || ''), {
        phone: application.phone,
      });
      await updateStudentProfileFields(context.env.DB, institutionId, String(application.user_id || ''), {
        phone: application.phone || undefined,
        parent_guardian_name: application.parent_guardian_name || null,
        parent_guardian_email: application.parent_guardian_email || null,
        parent_guardian_phone: application.parent_guardian_phone || null,
        notes: application.notes || null,
        registration_ip: application.registration_ip || null,
        application_submitted_at: application.application_submitted_at || application.created_at || actionedAt,
        approved_at: actionedAt,
        approved_by: verified.uid,
        rejected_at: null,
        rejected_by: null,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
        reactivated_at: actionedAt,
        is_active: 1,
        updated_at: actionedAt,
      });
      await createNotification(
        context.env.DB,
        institutionId,
        String(application.user_id || ''),
        'system',
        'Application approved',
        'Your institution application has been approved.',
      );
      await logAuditAction(context.env.DB, context.req.raw, {
        institutionId,
        userId: verified.uid,
        action: 'student.application.approved',
        targetTable: 'student_applications',
        targetId: appId,
        metadata: {
          studentId: String(application.user_id || ''),
        },
      });
    } else {
      await dbRun(
        context.env.DB,
        `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'student', 'pending', ?, ?)
         ON CONFLICT(institution_id, user_id) DO UPDATE SET
           role = 'student',
           status = 'pending',
           updated_at = excluded.updated_at`,
        [newId(), institutionId, String(application.user_id || ''), actionedAt, actionedAt],
      );
      await ensureStudentProfile(context.env.DB, institutionId, String(application.user_id || ''), {
        phone: application.phone,
      });
      await updateStudentProfileFields(context.env.DB, institutionId, String(application.user_id || ''), {
        phone: application.phone || undefined,
        parent_guardian_name: application.parent_guardian_name || null,
        parent_guardian_email: application.parent_guardian_email || null,
        parent_guardian_phone: application.parent_guardian_phone || null,
        notes: application.notes || null,
        registration_ip: application.registration_ip || null,
        application_submitted_at: application.application_submitted_at || application.created_at || actionedAt,
        approved_at: null,
        approved_by: null,
        rejected_at: actionedAt,
        rejected_by: verified.uid,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: body.reason || null,
        reactivated_at: null,
        is_active: 0,
        updated_at: actionedAt,
      });
      await createNotification(
        context.env.DB,
        institutionId,
        String(application.user_id || ''),
        'system',
        'Application update',
        'Your institution application was not approved at this time.',
      );
      await logAuditAction(context.env.DB, context.req.raw, {
        institutionId,
        userId: verified.uid,
        action: 'student.application.rejected',
        targetTable: 'student_applications',
        targetId: appId,
        metadata: {
          studentId: String(application.user_id || ''),
          reason: body.reason || null,
        },
      });
    }

    const updated = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM student_applications WHERE id = ? LIMIT 1',
      [appId],
    );
    return context.json(mapStudentApplication(updated));
  });

  app.post('/api/auth/logout', async (context) => {
    return context.json({ success: true });
  });

  app.get('/api/institutions', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    let rows: Row[];

    if (platformUser.isPlatformAdmin) {
      rows = await dbAll<Row>(
        context.env.DB,
        'SELECT * FROM institutions ORDER BY created_at DESC',
      );
    } else {
      rows = await dbAll<Row>(
        context.env.DB,
        `SELECT i.*
         FROM institutions i
         JOIN institution_users iu ON iu.institution_id = i.id
         WHERE iu.user_id = ?
         ORDER BY i.created_at DESC`,
        [verified.uid],
      );
    }

    return context.json(rows.map((row) => mapInstitution(row)));
  });

  app.post('/api/institutions', async (context) => {
    const verified = context.get('user');
    const body = await parseRequestBody<InstitutionInput>(context.req.raw);
    const slug = slugify(body.slug || body.name || '');
    if (!body.name || !slug) {
      return context.json({ error: 'Institution name and slug are required' }, 400);
    }

    const existing = await getInstitutionBySlug(context.env.DB, slug);
    if (existing) return context.json({ error: 'Institution slug already exists' }, 409);

    const institutionId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO institutions
       (id, name, slug, logo_url, primary_color, country, institution_type, owner_user_id, status, timezone, currency, locale, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'UTC', 'USD', 'en', ?, ?)`,
      [
        institutionId,
        body.name,
        slug,
        body.logoUrl || null,
        body.primaryColor || '#000000',
        body.country || '',
        body.institutionType,
        verified.uid,
        nowIso(),
        nowIso(),
      ],
    );

    await dbRun(
      context.env.DB,
      `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', 'active', ?, ?)`,
      [newId(), institutionId, verified.uid, nowIso(), nowIso()],
    );

    const institution = await getInstitutionById(context.env.DB, institutionId);
    return context.json(institution, 201);
  });

  app.get('/api/institutions/:id', async (context) => {
    const institution = await getInstitutionById(context.env.DB, context.req.param('id'));
    if (!institution) return context.json({ error: 'Institution not found' }, 404);
    return context.json(institution);
  });

  app.get('/api/institutions/:id/membership', async (context) => {
    const verified = context.get('user');
    const membership = await getMembership(context.env.DB, context.req.param('id'), verified.uid);
    if (!membership) return context.json({ error: 'Membership not found' }, 404);
    if (membership.role === 'student' && membership.status === 'active') {
      await recordStudentLogin(context.env.DB, context.req.param('id'), verified.uid, context.req.raw);
    }
    if (membership.role === 'teacher' && membership.status === 'active') {
      await recordTeacherLogin(context.env.DB, context.req.param('id'), verified.uid, context.req.raw);
    }
    return context.json(membership);
  });

  app.get('/api/institutions/:id/members', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    return context.json(await listInstitutionMembers(context.env.DB, institutionId, context.req.query('role') || undefined));
  });

  app.get('/api/institutions/:id/students', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const q = String(context.req.query('q') || '').trim().toLowerCase();
    const status = String(context.req.query('status') || '').trim().toLowerCase();
    const courseId = String(context.req.query('course_id') || '').trim();
    const limit = Math.max(toNumber(context.req.query('limit'), 25), 1);
    const offset = Math.max(toNumber(context.req.query('offset'), 0), 0);

    let students = await getStudentSummaryRows(context.env.DB, institutionId);
    if (q) {
      students = students.filter((student) =>
        [student.fullName, student.email, student.studentNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      );
    }
    if (status) {
      students = students.filter((student) => String(student.status || '').toLowerCase() === status);
    }
    if (courseId) {
      students = students.filter((student) =>
        (student.enrolledCourses || []).some((enrollment) => String(enrollment.course_id || enrollment.courseId || '') === courseId),
      );
    }

    return context.json({
      results: students.slice(offset, offset + limit),
      total: students.length,
      limit,
      offset,
    });
  });

  app.get('/api/institutions/:id/students/:studentId', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const student = await getStudentDetail(context.env.DB, institutionId, context.req.param('studentId'));
    if (!student) return context.json({ error: 'Student not found' }, 404);
    return context.json(student);
  });

  app.post('/api/institutions/:id/students', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<{
      fullName?: string;
      email?: string;
      phone?: string;
      temporaryPassword?: string;
      status?: 'pending' | 'approved' | 'rejected' | 'suspended';
      notes?: string;
      parentGuardianName?: string;
      parentGuardianEmail?: string;
      parentGuardianPhone?: string;
    }>(context.req.raw);

    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    if (!email || !fullName) {
      return context.json({ error: 'Full name and email are required' }, 400);
    }

    let existingPlatformUser = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM platform_users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email],
    );

    let userId = String(existingPlatformUser?.uid || '');
    if (!userId) {
      const password = String(body.temporaryPassword || '').trim();
      if (password.length < 6) {
        return context.json({ error: 'A temporary password with at least 6 characters is required for new students' }, 400);
      }
      const firebaseUser = await createFirebaseEmailPasswordUser(email, password, fullName);
      userId = firebaseUser.uid;
      const createdAt = nowIso();
      await dbRun(
        context.env.DB,
        `INSERT INTO platform_users
         (uid, email, full_name, phone, photo_url, is_platform_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', 0, ?, ?)`,
        [userId, email, fullName, String(body.phone || ''), createdAt, createdAt],
      );
      existingPlatformUser = await dbFirst<Row>(context.env.DB, 'SELECT * FROM platform_users WHERE uid = ? LIMIT 1', [userId]);
    } else {
      const update = buildUpdateStatement(
        'platform_users',
        {
          full_name: fullName,
          phone: body.phone,
          updated_at: nowIso(),
        },
        'uid',
      );
      if (update.values.length > 0) {
        await dbRun(context.env.DB, update.sql, [...update.values, userId]);
      }
    }

    const lifecycleStatus = normalizeStudentLifecycleStatus(body.status);
    const createdAt = nowIso();
    const membershipStatus =
      lifecycleStatus === 'suspended'
        ? 'suspended'
        : lifecycleStatus === 'approved'
          ? 'active'
          : 'pending';
    const applicationStatus =
      lifecycleStatus === 'suspended' ? 'approved' : lifecycleStatus;

    await dbRun(
      context.env.DB,
      `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'student', ?, ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET
         role = 'student',
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [newId(), institutionId, userId, membershipStatus, createdAt, createdAt],
    );

    await ensureStudentProfile(context.env.DB, institutionId, userId, {
      phone: body.phone || existingPlatformUser?.phone || '',
    });
    await updateStudentProfileFields(context.env.DB, institutionId, userId, {
      phone: body.phone || existingPlatformUser?.phone || '',
      parent_guardian_name: body.parentGuardianName ?? null,
      parent_guardian_email: body.parentGuardianEmail ?? null,
      parent_guardian_phone: body.parentGuardianPhone ?? null,
      notes: body.notes ?? null,
      application_submitted_at: createdAt,
      approved_at: lifecycleStatus === 'approved' || lifecycleStatus === 'suspended' ? createdAt : null,
      approved_by: lifecycleStatus === 'approved' || lifecycleStatus === 'suspended' ? verified.uid : null,
      rejected_at: lifecycleStatus === 'rejected' ? createdAt : null,
      rejected_by: lifecycleStatus === 'rejected' ? verified.uid : null,
      suspended_at: lifecycleStatus === 'suspended' ? createdAt : null,
      suspended_by: lifecycleStatus === 'suspended' ? verified.uid : null,
      suspension_reason: lifecycleStatus === 'suspended' ? body.notes || 'Suspended during account creation' : null,
      reactivated_at: lifecycleStatus === 'approved' ? createdAt : null,
      is_active: lifecycleStatus === 'approved' ? 1 : 0,
      updated_at: createdAt,
    });

    await dbRun(
      context.env.DB,
      `INSERT INTO student_applications
       (id, institution_id, user_id, full_name, email, phone, status, application_submitted_at, approved_at, approved_by, rejected_at, rejected_by, registration_ip, parent_guardian_name, parent_guardian_email, parent_guardian_phone, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET
         full_name = excluded.full_name,
         email = excluded.email,
         phone = excluded.phone,
         status = excluded.status,
         application_submitted_at = excluded.application_submitted_at,
         approved_at = excluded.approved_at,
         approved_by = excluded.approved_by,
         rejected_at = excluded.rejected_at,
         rejected_by = excluded.rejected_by,
         registration_ip = excluded.registration_ip,
         parent_guardian_name = excluded.parent_guardian_name,
         parent_guardian_email = excluded.parent_guardian_email,
         parent_guardian_phone = excluded.parent_guardian_phone,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      [
        newId(),
        institutionId,
        userId,
        fullName,
        email,
        String(body.phone || existingPlatformUser?.phone || ''),
        applicationStatus,
        createdAt,
        lifecycleStatus === 'approved' || lifecycleStatus === 'suspended' ? createdAt : null,
        lifecycleStatus === 'approved' || lifecycleStatus === 'suspended' ? verified.uid : null,
        lifecycleStatus === 'rejected' ? createdAt : null,
        lifecycleStatus === 'rejected' ? verified.uid : null,
        getClientIp(context.req.raw),
        body.parentGuardianName ?? null,
        body.parentGuardianEmail ?? null,
        body.parentGuardianPhone ?? null,
        body.notes ?? null,
        createdAt,
        createdAt,
      ],
    );

    await logAuditAction(context.env.DB, context.req.raw, {
      institutionId,
      userId: verified.uid,
      action: 'student.account.created',
      targetTable: 'institution_users',
      targetId: userId,
      metadata: {
        email,
        status: lifecycleStatus,
      },
    });

    const studentInstitution = await getInstitutionById(context.env.DB, institutionId);
    if (studentInstitution && email) {
      const loginUrl = new URL(`/${studentInstitution.slug}/login`, normalizeBaseUrl(context.env.APP_URL)).toString();
      const temporaryPassword = String(body.temporaryPassword || '').trim();
      void sendTransactionalEmail(context.env, {
        to: email,
        toName: fullName || email,
        subject: `Welcome to ${studentInstitution.name}`,
        text: `Your student account has been created for ${studentInstitution.name}. ${temporaryPassword ? `Your temporary password is ${temporaryPassword}. ` : ''}Sign in at ${loginUrl} to access your dashboard.`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111827;">
            <h2 style="margin-bottom: 8px;">Welcome to ${studentInstitution.name}</h2>
            <p>Your student account has been created.</p>
            ${temporaryPassword ? `<p>Your temporary password is <strong>${temporaryPassword}</strong>.</p>` : ''}
            <p>Sign in at <a href="${loginUrl}">${loginUrl}</a> to access your dashboard.</p>
          </div>
        `,
      }).catch((error) => {
        console.error('Failed to send student onboarding email', error);
      });
    }

    const student = await getStudentDetail(context.env.DB, institutionId, userId);
    return context.json(student, 201);
  });

  app.patch('/api/institutions/:id/students/:studentId/status', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const studentId = context.req.param('studentId');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<{ status?: 'pending' | 'approved' | 'rejected' | 'suspended'; reason?: string }>(context.req.raw);
    const nextStatus = normalizeStudentLifecycleStatus(body.status);
    const application = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM student_applications WHERE institution_id = ? AND user_id = ? LIMIT 1',
      [institutionId, studentId],
    );
    const membership = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM institution_users WHERE institution_id = ? AND user_id = ? LIMIT 1',
      [institutionId, studentId],
    );
    if (!application && !membership) {
      return context.json({ error: 'Student record not found' }, 404);
    }

    const platformRecord = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM platform_users WHERE uid = ? LIMIT 1',
      [studentId],
    );
    if (!platformRecord) return context.json({ error: 'Student user not found' }, 404);

    const actionedAt = nowIso();
    const membershipStatus =
      nextStatus === 'suspended' ? 'suspended' : nextStatus === 'approved' ? 'active' : 'pending';
    const applicationStatus = nextStatus === 'suspended' ? 'approved' : nextStatus;
    const submittedAt =
      application?.application_submitted_at || application?.created_at || membership?.created_at || actionedAt;

    await dbRun(
      context.env.DB,
      `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'student', ?, ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET
         role = 'student',
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [newId(), institutionId, studentId, membershipStatus, actionedAt, actionedAt],
    );

    await ensureStudentProfile(context.env.DB, institutionId, studentId, {
      phone: platformRecord.phone || '',
    });
    await updateStudentProfileFields(context.env.DB, institutionId, studentId, {
      phone: platformRecord.phone || '',
      application_submitted_at: submittedAt,
      approved_at: nextStatus === 'approved' || nextStatus === 'suspended' ? actionedAt : null,
      approved_by: nextStatus === 'approved' || nextStatus === 'suspended' ? verified.uid : null,
      rejected_at: nextStatus === 'rejected' ? actionedAt : null,
      rejected_by: nextStatus === 'rejected' ? verified.uid : null,
      suspended_at: nextStatus === 'suspended' ? actionedAt : null,
      suspended_by: nextStatus === 'suspended' ? verified.uid : null,
      suspension_reason: nextStatus === 'suspended' ? body.reason || 'Suspended by administrator' : null,
      reactivated_at: nextStatus === 'approved' ? actionedAt : null,
      is_active: nextStatus === 'approved' ? 1 : 0,
      updated_at: actionedAt,
    });

    await dbRun(
      context.env.DB,
      `INSERT INTO student_applications
       (id, institution_id, user_id, full_name, email, phone, status, application_submitted_at, approved_at, approved_by, rejected_at, rejected_by, registration_ip, parent_guardian_name, parent_guardian_email, parent_guardian_phone, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET
         full_name = excluded.full_name,
         email = excluded.email,
         phone = excluded.phone,
         status = excluded.status,
         application_submitted_at = excluded.application_submitted_at,
         approved_at = excluded.approved_at,
         approved_by = excluded.approved_by,
         rejected_at = excluded.rejected_at,
         rejected_by = excluded.rejected_by,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      [
        newId(),
        institutionId,
        studentId,
        String(application?.full_name || platformRecord.full_name || ''),
        String(application?.email || platformRecord.email || ''),
        String(application?.phone || platformRecord.phone || ''),
        applicationStatus,
        submittedAt,
        nextStatus === 'approved' || nextStatus === 'suspended' ? actionedAt : null,
        nextStatus === 'approved' || nextStatus === 'suspended' ? verified.uid : null,
        nextStatus === 'rejected' ? actionedAt : null,
        nextStatus === 'rejected' ? verified.uid : null,
        application?.registration_ip || null,
        application?.parent_guardian_name || null,
        application?.parent_guardian_email || null,
        application?.parent_guardian_phone || null,
        nextStatus === 'suspended' ? body.reason || application?.notes || null : application?.notes || null,
        application?.created_at || actionedAt,
        actionedAt,
      ],
    );

    if (nextStatus === 'approved') {
      await createNotification(
        context.env.DB,
        institutionId,
        studentId,
        'system',
        'Student account activated',
        'Your student access is active and you can enter the portal.',
      );
    } else if (nextStatus === 'rejected') {
      await createNotification(
        context.env.DB,
        institutionId,
        studentId,
        'system',
        'Application rejected',
        'Your institution application is currently rejected.',
      );
    } else if (nextStatus === 'suspended') {
      await createNotification(
        context.env.DB,
        institutionId,
        studentId,
        'system',
        'Student account suspended',
        'Your student access has been suspended. Contact the institution for support.',
      );
    }

    await logAuditAction(context.env.DB, context.req.raw, {
      institutionId,
      userId: verified.uid,
      action: `student.status.${nextStatus}`,
      targetTable: 'institution_users',
      targetId: studentId,
      metadata: {
        reason: body.reason || null,
      },
    });

    const student = await getStudentDetail(context.env.DB, institutionId, studentId);
    return context.json(student);
  });

  app.put('/api/institutions/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<Partial<InstitutionInput> & { status?: string }>(context.req.raw);
    const fields: Row = {
      name: body.name,
      logo_url: body.logoUrl,
      primary_color: body.primaryColor,
      country: body.country,
      institution_type: body.institutionType,
      status: body.status,
      updated_at: nowIso(),
    };
    const update = buildUpdateStatement('institutions', fields);
    await dbRun(context.env.DB, update.sql, [...update.values, institutionId]);

    const institution = await getInstitutionById(context.env.DB, institutionId);
    return context.json(institution);
  });

  app.patch('/api/institutions/:id', async (context) => {
    return app.fetch(new Request(context.req.raw, { method: 'PUT' }), context.env, context.executionCtx);
  });

  app.delete('/api/institutions/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['owner']);
    if (access.error && !platformUser.isPlatformAdmin) return access.error;

    await dbRun(context.env.DB, 'DELETE FROM institutions WHERE id = ?', [institutionId]);
    return context.json({ success: true });
  });

  app.get('/api/institutions/:id/users', async (context) => {
    return app.fetch(new Request(context.req.raw.url.replace('/users', '/members'), { headers: context.req.raw.headers }), context.env, context.executionCtx);
  });

  app.post('/api/institutions/:id/users', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<
      Row & {
        id?: string;
        email?: string;
        display_name?: string;
        fullName?: string;
        full_name?: string;
        role?: UserRole;
        status?: UserStatus;
        phone?: string;
        specialization?: string;
      }
    >(context.req.raw);

    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return context.json({ error: 'Email is required' }, 400);

    const role = normalizeRole(body.role);
    const status = normalizeUserStatus(body.status || (role === 'teacher' ? 'pending' : 'active'));
    const now = nowIso();
    const existingUser = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM platform_users WHERE LOWER(email) = LOWER(?) OR uid = ? LIMIT 1',
      [email, String(body.id || '')],
    );

    const userId = String(existingUser?.uid || body.id || newId());
    const fullName = String(
      body.fullName ||
        body.full_name ||
        body.display_name ||
        existingUser?.full_name ||
        email.split('@')[0] ||
        userId,
    ).trim();

    if (existingUser) {
      await dbRun(
        context.env.DB,
        `UPDATE platform_users
         SET full_name = ?, phone = ?, updated_at = ?
         WHERE uid = ?`,
        [fullName, String(body.phone || existingUser.phone || ''), now, userId],
      );
    } else {
      await dbRun(
        context.env.DB,
        `INSERT INTO platform_users
         (uid, email, full_name, phone, photo_url, is_platform_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', 0, ?, ?)`,
        [userId, email, fullName, String(body.phone || ''), now, now],
      );
    }

    const existingMembership = await getMembership(context.env.DB, institutionId, userId);
    if (existingMembership) {
      await dbRun(
        context.env.DB,
        'UPDATE institution_users SET role = ?, status = ?, updated_at = ? WHERE institution_id = ? AND user_id = ?',
        [role, status, now, institutionId, userId],
      );
    } else {
      await dbRun(
        context.env.DB,
        `INSERT INTO institution_users
         (id, institution_id, user_id, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newId(), institutionId, userId, role, status, now, now],
      );
    }

    if (role === 'teacher') {
      await dbRun(
        context.env.DB,
        `INSERT OR IGNORE INTO teacher_profiles
         (user_id, institution_id, employee_number, phone, assigned_courses, department)
         VALUES (?, ?, ?, ?, '[]', ?)`,
        [
          userId,
          institutionId,
          `EMP-${userId.slice(0, 8).toUpperCase()}`,
          String(body.phone || ''),
          String(body.specialization || ''),
        ],
      );
    }

    if (role === 'student') {
      await dbRun(
        context.env.DB,
        `INSERT OR IGNORE INTO student_profiles
         (user_id, institution_id, student_number, phone, payment_status, total_fee, amount_paid, balance, academic_status)
         VALUES (?, ?, ?, ?, 'unpaid', 0, 0, 0, 'active')`,
        [userId, institutionId, `STD-${userId.slice(0, 8).toUpperCase()}`, String(body.phone || '')],
      );
    }

    const membership = await getMembership(context.env.DB, institutionId, userId);
    return context.json(membership, 201);
  });

  app.patch('/api/institutions/:id/users/:userId', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const targetUserId = context.req.param('userId');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<{ status?: UserStatus; role?: UserRole }>(context.req.raw);
    const fields: Row = {
      status: body.status,
      role: body.role,
      updated_at: nowIso(),
    };
    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
    if (entries.length === 1) return context.json({ error: 'No changes supplied' }, 400);

    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    await dbRun(
      context.env.DB,
      `UPDATE institution_users SET ${setClause} WHERE institution_id = ? AND user_id = ?`,
      [...entries.map(([, value]) => value), institutionId, targetUserId],
    );

    const membership = await getMembership(context.env.DB, institutionId, targetUserId);
    return context.json(membership);
  });

  app.delete('/api/institutions/:id/users/:userId', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const targetUserId = context.req.param('userId');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    await dbRun(
      context.env.DB,
      'DELETE FROM institution_users WHERE institution_id = ? AND user_id = ?',
      [institutionId, targetUserId],
    );
    return context.json({ success: true });
  });

  app.get('/api/institutions/:id/teachers', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const q = String(context.req.query('q') || '').trim().toLowerCase();
    const status = String(context.req.query('status') || '').trim().toLowerCase();
    const limit = Math.max(toNumber(context.req.query('limit'), 25), 1);
    const offset = Math.max(toNumber(context.req.query('offset'), 0), 0);

    let teachers = await getTeacherSummaryRows(context.env.DB, institutionId);
    if (q) {
      teachers = teachers.filter((teacher) =>
        [
          teacher.fullName,
          teacher.email,
          teacher.employeeNumber,
          teacher.qualification,
          (teacher.assignedCourseNames || []).join(' '),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      );
    }
    if (status) {
      teachers = teachers.filter((teacher) => {
        const approvalStatus = String(teacher.approvalStatus || '').toLowerCase();
        const activeStatus = String(teacher.activeStatus || '').toLowerCase();
        return approvalStatus === status || activeStatus === status;
      });
    }

    return context.json({
      results: teachers.slice(offset, offset + limit),
      total: teachers.length,
      limit,
      offset,
    });
  });

  app.get('/api/institutions/:id/teachers/:teacherId', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const teacher = await getTeacherDetail(context.env.DB, institutionId, context.req.param('teacherId'));
    if (!teacher) return context.json({ error: 'Teacher not found' }, 404);
    return context.json(teacher);
  });

  app.post('/api/institutions/:id/teachers', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const institution = await getInstitutionById(context.env.DB, institutionId);
    if (!institution) return context.json({ error: 'Institution not found' }, 404);

    const body = await parseRequestBody<{
      fullName?: string;
      email?: string;
      phone?: string;
      gender?: string;
      address?: string;
      qualification?: string;
      courseIds?: string[];
      assignedCourses?: string[];
      employeeNumber?: string;
      employee_number?: string;
      profileImageUrl?: string;
      profile_image_url?: string;
      status?: 'pending' | 'approved' | 'suspended' | 'active';
      notes?: string;
    }>(context.req.raw);

    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    if (!email || !fullName) {
      return context.json({ error: 'Full name and email are required' }, 400);
    }

    const requestedStatus = String(body.status || 'pending').trim().toLowerCase();
    const approvalStatus =
      requestedStatus === 'approved' || requestedStatus === 'active'
        ? 'approved'
        : requestedStatus === 'suspended'
          ? 'suspended'
          : 'pending';
    const membershipStatus =
      approvalStatus === 'approved' ? 'active' : approvalStatus === 'suspended' ? 'suspended' : 'pending';
    const courseIds = Array.from(
      new Set([...(body.courseIds || []), ...(body.assignedCourses || [])].map((value) => String(value).trim()).filter(Boolean)),
    );
    const createdAt = nowIso();
    const temporaryPassword = generateTemporaryPassword();

    let platformRow = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM platform_users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email],
    );

    let userId = String(platformRow?.uid || '');
    let invitationPreview: InvitationDeliveryResult | null = null;
    if (!userId) {
      const provisioned = await provisionAuthUser(email, temporaryPassword, fullName);
      userId = provisioned.uid;
      await dbRun(
        context.env.DB,
        `INSERT INTO platform_users
         (uid, email, full_name, phone, photo_url, is_platform_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [userId, email, fullName, String(body.phone || ''), body.profileImageUrl || body.profile_image_url || '', createdAt, createdAt],
      );
      platformRow = await dbFirst<Row>(context.env.DB, 'SELECT * FROM platform_users WHERE uid = ? LIMIT 1', [userId]);
    } else {
      const update = buildUpdateStatement(
        'platform_users',
        {
          full_name: fullName,
          phone: body.phone,
          photo_url: body.profileImageUrl || body.profile_image_url,
          updated_at: createdAt,
        },
        'uid',
      );
      if (update.values.length > 0) {
        await dbRun(context.env.DB, update.sql, [...update.values, userId]);
      }
    }

    await dbRun(
      context.env.DB,
      `INSERT INTO institution_users
       (id, institution_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'teacher', ?, ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET
         role = 'teacher',
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [newId(), institutionId, userId, membershipStatus, createdAt, createdAt],
    );

    await ensureTeacherProfile(context.env.DB, institutionId, userId, {
      employee_number: body.employeeNumber || body.employee_number,
      phone: body.phone || '',
      gender: body.gender,
      address: body.address,
      qualification: body.qualification,
      profile_image_url: body.profileImageUrl || body.profile_image_url,
      notes: body.notes,
    });
    await updateTeacherProfileFields(context.env.DB, institutionId, userId, {
      employee_number: body.employeeNumber || body.employee_number || undefined,
      phone: body.phone || platformRow?.phone || '',
      gender: body.gender ?? null,
      address: body.address ?? null,
      qualification: body.qualification ?? null,
      profile_image_url: body.profileImageUrl || body.profile_image_url || null,
      notes: body.notes ?? null,
      approved_at: approvalStatus === 'approved' ? createdAt : null,
      approved_by: approvalStatus === 'approved' ? verified.uid : null,
      suspended_at: approvalStatus === 'suspended' ? createdAt : null,
      suspended_by: approvalStatus === 'suspended' ? verified.uid : null,
      reactivated_at: approvalStatus === 'approved' ? createdAt : null,
      invite_sent_at: createdAt,
      invited_by: verified.uid,
      is_active: approvalStatus === 'approved' ? 1 : 0,
      updated_at: createdAt,
    });

    if (courseIds.length > 0) {
      const placeholders = courseIds.map(() => '?').join(', ');
      await dbRun(
        context.env.DB,
        `UPDATE courses
         SET teacher_id = NULL, updated_at = ?
         WHERE institution_id = ? AND teacher_id = ? AND id NOT IN (${placeholders})`,
        [createdAt, institutionId, userId, ...courseIds],
      );
      await dbRun(
        context.env.DB,
        `UPDATE courses
         SET teacher_id = ?, updated_at = ?
         WHERE institution_id = ? AND id IN (${placeholders})`,
        [userId, createdAt, institutionId, ...courseIds],
      );
    } else {
      await dbRun(
        context.env.DB,
        `UPDATE courses
         SET teacher_id = NULL, updated_at = ?
         WHERE institution_id = ? AND teacher_id = ?`,
        [createdAt, institutionId, userId],
      );
    }
    await syncTeacherProfileCourseAssignments(context.env.DB, institutionId);

    await dbRun(
      context.env.DB,
      `UPDATE user_invites
       SET status = 'expired'
       WHERE institution_id = ? AND email = ? AND role = 'teacher' AND status = 'pending'`,
      [institutionId, email],
    );

    const inviteId = newId();
    const inviteToken = newId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await dbRun(
      context.env.DB,
      `INSERT INTO user_invites
       (id, institution_id, email, full_name, role, assigned_courses, token, status, expires_at, created_by, pending_user_id, created_at)
       VALUES (?, ?, ?, ?, 'teacher', ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        inviteId,
        institutionId,
        email,
        fullName,
        JSON.stringify(courseIds),
        inviteToken,
        expiresAt,
        verified.uid,
        userId,
        createdAt,
      ],
    );

    invitationPreview = await deliverInvitationEmail({
      institutionName: institution.name,
      institutionSlug: institution.slug,
      email,
      fullName,
      inviteToken,
      temporaryPassword,
      expiresAt,
    });

    const inviteLoginUrl = new URL(`/${institution.slug}/login?invite=${inviteToken}`, normalizeBaseUrl(context.env.APP_URL)).toString();
    void sendTransactionalEmail(context.env, {
      to: email,
      toName: fullName || email,
      subject: `Welcome to ${institution.name}`,
      text: `You have been added to ${institution.name}. Use the temporary password ${temporaryPassword} on first sign-in. Complete your onboarding at ${inviteLoginUrl}.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827;">
          <h2 style="margin-bottom: 8px;">Welcome to ${institution.name}</h2>
          <p>You have been added as a teacher for ${institution.name}.</p>
          <p>Use your temporary password <strong>${temporaryPassword}</strong> on your first sign-in, then reset it after you log in.</p>
          <p>Start your onboarding here: <a href="${inviteLoginUrl}">${inviteLoginUrl}</a></p>
        </div>
      `,
    }).catch((error) => {
      console.error('Failed to send teacher onboarding email', error);
    });

    await createNotification(
      context.env.DB,
      institutionId,
      userId,
      'invite',
      'Teacher account created',
      'Your teacher access has been created. Use the institution login flow to enter the dashboard.',
    );
    await logAuditAction(context.env.DB, context.req.raw, {
      institutionId,
      userId: verified.uid,
      action: 'teacher.account.created',
      targetTable: 'institution_users',
      targetId: userId,
      metadata: {
        email,
        approvalStatus,
        courseIds,
      },
    });

    const teacher = await getTeacherDetail(context.env.DB, institutionId, userId);
    return context.json(
      {
        ...teacher,
        invitationPreview,
        invitation_preview: invitationPreview,
      },
      201,
    );
  });

  app.patch('/api/institutions/:id/teachers/:teacherId', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const teacherId = context.req.param('teacherId');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const teacher = await getTeacherDetail(context.env.DB, institutionId, teacherId);
    if (!teacher) return context.json({ error: 'Teacher not found' }, 404);

    const body = await parseRequestBody<{
      fullName?: string;
      phone?: string;
      gender?: string;
      address?: string;
      qualification?: string;
      employeeNumber?: string;
      employee_number?: string;
      profileImageUrl?: string;
      profile_image_url?: string;
      status?: 'pending' | 'approved' | 'suspended' | 'active';
      notes?: string;
    }>(context.req.raw);

    const updatedAt = nowIso();
    const platformUpdate = buildUpdateStatement(
      'platform_users',
      {
        full_name: body.fullName,
        phone: body.phone,
        photo_url: body.profileImageUrl || body.profile_image_url,
        updated_at: updatedAt,
      },
      'uid',
    );
    if (platformUpdate.values.length > 0) {
      await dbRun(context.env.DB, platformUpdate.sql, [...platformUpdate.values, teacherId]);
    }

    const nextApprovalStatus =
      body.status === undefined
        ? teacher.approvalStatus
        : body.status === 'approved' || body.status === 'active'
          ? 'approved'
          : body.status === 'suspended'
            ? 'suspended'
            : 'pending';
    const nextMembershipStatus =
      nextApprovalStatus === 'approved'
        ? 'active'
        : nextApprovalStatus === 'suspended'
          ? 'suspended'
          : 'pending';

    if (body.status !== undefined) {
      await updateInstitutionUserFields(context.env.DB, institutionId, teacherId, {
        status: nextMembershipStatus,
        updated_at: updatedAt,
      });
    }

    await updateTeacherProfileFields(context.env.DB, institutionId, teacherId, {
      employee_number: body.employeeNumber || body.employee_number || undefined,
      phone: body.phone || undefined,
      gender: body.gender ?? undefined,
      address: body.address ?? undefined,
      qualification: body.qualification ?? undefined,
      profile_image_url: body.profileImageUrl || body.profile_image_url || undefined,
      notes: body.notes ?? undefined,
      approved_at: body.status !== undefined ? (nextApprovalStatus === 'approved' ? updatedAt : null) : undefined,
      approved_by: body.status !== undefined ? (nextApprovalStatus === 'approved' ? verified.uid : null) : undefined,
      suspended_at: body.status !== undefined ? (nextApprovalStatus === 'suspended' ? updatedAt : null) : undefined,
      suspended_by: body.status !== undefined ? (nextApprovalStatus === 'suspended' ? verified.uid : null) : undefined,
      reactivated_at: body.status !== undefined ? (nextApprovalStatus === 'approved' ? updatedAt : null) : undefined,
      is_active: body.status !== undefined ? (nextApprovalStatus === 'approved' ? 1 : 0) : undefined,
      updated_at: updatedAt,
    });

    await logAuditAction(context.env.DB, context.req.raw, {
      institutionId,
      userId: verified.uid,
      action: 'teacher.profile.updated',
      targetTable: 'teacher_profiles',
      targetId: teacherId,
      metadata: {
        status: body.status || null,
      },
    });

    return context.json(await getTeacherDetail(context.env.DB, institutionId, teacherId));
  });

  app.put('/api/institutions/:id/teachers/:teacherId/courses', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const teacherId = context.req.param('teacherId');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<{ courseIds?: string[]; assignedCourses?: string[] }>(context.req.raw);
    const courseIds = Array.from(
      new Set([...(body.courseIds || []), ...(body.assignedCourses || [])].map((value) => String(value).trim()).filter(Boolean)),
    );
    const updatedAt = nowIso();

    if (courseIds.length > 0) {
      const placeholders = courseIds.map(() => '?').join(', ');
      await dbRun(
        context.env.DB,
        `UPDATE courses
         SET teacher_id = NULL, updated_at = ?
         WHERE institution_id = ? AND teacher_id = ? AND id NOT IN (${placeholders})`,
        [updatedAt, institutionId, teacherId, ...courseIds],
      );
      await dbRun(
        context.env.DB,
        `UPDATE courses
         SET teacher_id = ?, updated_at = ?
         WHERE institution_id = ? AND id IN (${placeholders})`,
        [teacherId, updatedAt, institutionId, ...courseIds],
      );
    } else {
      await dbRun(
        context.env.DB,
        `UPDATE courses
         SET teacher_id = NULL, updated_at = ?
         WHERE institution_id = ? AND teacher_id = ?`,
        [updatedAt, institutionId, teacherId],
      );
    }

    await syncTeacherProfileCourseAssignments(context.env.DB, institutionId);
    await logAuditAction(context.env.DB, context.req.raw, {
      institutionId,
      userId: verified.uid,
      action: 'teacher.courses.assigned',
      targetTable: 'teacher_profiles',
      targetId: teacherId,
      metadata: {
        courseIds,
      },
    });

    return context.json(await getTeacherDetail(context.env.DB, institutionId, teacherId));
  });

  app.get('/api/institutions/:id/teachers/:teacherId/attendance', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    return context.json(
      await listTeacherAttendanceRecords(
        context.env.DB,
        institutionId,
        context.req.param('teacherId'),
        context.req.query('month') || undefined,
      ),
    );
  });

  app.post('/api/institutions/:id/teachers/:teacherId/attendance', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const teacherId = context.req.param('teacherId');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<{ attendanceDate?: string; attendance_date?: string; status?: string; notes?: string }>(
      context.req.raw,
    );
    const attendanceDate = String(body.attendanceDate || body.attendance_date || nowIso().slice(0, 10)).slice(0, 10);
    const status = String(body.status || '').trim().toLowerCase();
    if (!['present', 'absent', 'late'].includes(status)) {
      return context.json({ error: 'status must be present, absent, or late' }, 400);
    }

    const recordId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO teacher_attendance_records
       (id, institution_id, teacher_id, attendance_date, status, marked_by, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(institution_id, teacher_id, attendance_date) DO UPDATE SET
         status = excluded.status,
         marked_by = excluded.marked_by,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      [recordId, institutionId, teacherId, attendanceDate, status, verified.uid, body.notes || null, nowIso(), nowIso()],
    );

    await logAuditAction(context.env.DB, context.req.raw, {
      institutionId,
      userId: verified.uid,
      action: 'teacher.attendance.marked',
      targetTable: 'teacher_attendance_records',
      targetId: teacherId,
      metadata: {
        attendanceDate,
        status,
      },
    });

    const records = await listTeacherAttendanceRecords(context.env.DB, institutionId, teacherId);
    return context.json(records[0] || null, 201);
  });

  app.get('/api/institutions/:id/teachers/:teacherId/performance', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
    ]);
    if (access.error) return access.error;

    const teacher = await getTeacherDetail(context.env.DB, institutionId, context.req.param('teacherId'));
    if (!teacher) return context.json({ error: 'Teacher not found' }, 404);

    return context.json({
      averageStudentScore: teacher.averageStudentScore,
      averageQuizScore: teacher.averageQuizScore,
      averageAssignmentGrade: teacher.averageAssignmentGrade,
      attendancePercentage: teacher.attendancePercentage,
      assignedStudentsCount: teacher.assignedStudentsCount,
      assignedCoursesCount: teacher.assignedCoursesCount,
      courseCompletionRate: teacher.courseCompletionRate,
    });
  });

  app.get('/api/institutions/:id/courses', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    return context.json(await listCoursesForInstitution(context.env.DB, institutionId));
  });

  app.post('/api/institutions/:id/courses', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<CourseInput & Row>(context.req.raw);
    if (!body.title) return context.json({ error: 'Course title is required' }, 400);
    const selectedTeacherId = String(body.teacherId || body.teacher_id || '').trim();
    const teacherId =
      selectedTeacherId || (access.membership?.role === 'teacher' ? verified.uid : null);

    const courseId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO courses
       (id, institution_id, title, description, teacher_id, category, level, status, fee, max_students, start_date, end_date, syllabus, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        institutionId,
        body.title,
        body.description || '',
        teacherId,
        body.category || null,
        body.level || null,
        body.status || 'draft',
        toNumber(body.fee, 0),
        body.max_students || null,
        body.start_date || null,
        body.end_date || null,
        body.syllabus || null,
        nowIso(),
        nowIso(),
      ],
    );
    await syncTeacherProfileCourseAssignments(context.env.DB, institutionId);

    const course = await getCourseWithModules(context.env.DB, courseId, verified.uid);
    return context.json(course, 201);
  });

  app.get('/api/courses/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const courseId = context.req.param('id');
    const courseRow = await getCourseRow(context.env.DB, courseId);
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);
    const institutionId = String(courseRow.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    const course = await getCourseWithModules(context.env.DB, courseId, verified.uid);
    return context.json(course);
  });

  app.put('/api/courses/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const courseId = context.req.param('id');
    const courseRow = await getCourseRow(context.env.DB, courseId);
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);

    const institutionId = String(courseRow.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<Partial<CourseInput> & Row>(context.req.raw);
    const teacherFieldProvided = 'teacherId' in body || 'teacher_id' in body;
    const fields: Row = {
      title: body.title,
      description: body.description,
      teacher_id: teacherFieldProvided ? String(body.teacherId || body.teacher_id || '').trim() || null : undefined,
      category: body.category,
      status: body.status,
      fee: body.fee,
      syllabus: body.syllabus,
      updated_at: nowIso(),
    };
    const update = buildUpdateStatement('courses', fields);
    await dbRun(context.env.DB, update.sql, [...update.values, courseId]);
    await syncTeacherProfileCourseAssignments(context.env.DB, institutionId);
    return context.json(await getCourseWithModules(context.env.DB, courseId, verified.uid));
  });

  app.patch('/api/courses/:id', async (context) => {
    return app.fetch(new Request(context.req.raw, { method: 'PUT' }), context.env, context.executionCtx);
  });

  app.delete('/api/courses/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const courseRow = await getCourseRow(context.env.DB, context.req.param('id'));
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(courseRow.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    await dbRun(context.env.DB, 'DELETE FROM courses WHERE id = ?', [context.req.param('id')]);
    await syncTeacherProfileCourseAssignments(context.env.DB, String(courseRow.institution_id || ''));
    return context.json({ success: true });
  });

  app.post('/api/courses/:id/enroll', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const courseRow = await getCourseRow(context.env.DB, context.req.param('id'));
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);

    const institutionId = String(courseRow.institution_id || '');
    const body = await parseRequestBody<{ studentId?: string; student_id?: string }>(context.req.raw);
    const targetStudentId = String(body.studentId || body.student_id || verified.uid);
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;

    if (
      targetStudentId !== verified.uid &&
      !roleAllowed(access.membership?.role as UserRole, ['owner', 'admin', 'teacher']) &&
      !platformUser.isPlatformAdmin
    ) {
      return context.json({ error: 'Forbidden' }, 403);
    }

    await dbRun(
      context.env.DB,
      `INSERT INTO enrollments
       (id, institution_id, course_id, student_id, status, enrolled_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
       ON CONFLICT(course_id, student_id) DO UPDATE SET
         status = 'active',
         updated_at = excluded.updated_at`,
      [newId(), institutionId, context.req.param('id'), targetStudentId, nowIso(), nowIso(), nowIso()],
    );

    await ensureStudentProfile(context.env.DB, institutionId, targetStudentId, {});
    const rows = await listEnrollmentsForInstitution(context.env.DB, institutionId, context.req.param('id'), targetStudentId);
    return context.json(rows[0], 201);
  });

  app.get('/api/courses/:id/students', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const courseRow = await getCourseRow(context.env.DB, context.req.param('id'));
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);
    const institutionId = String(courseRow.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    return context.json(await listEnrollmentsForInstitution(context.env.DB, institutionId, context.req.param('id')));
  });

  app.get('/api/institutions/:id/enrollments', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    return context.json(
      await listEnrollmentsForInstitution(
        context.env.DB,
        institutionId,
        context.req.query('course_id') || undefined,
        context.req.query('student_id') || undefined,
      ),
    );
  });

  app.post('/api/institutions/:id/enrollments', async (context) => {
    const body = await parseRequestBody<{ courseId?: string; course_id?: string; studentId?: string; student_id?: string }>(context.req.raw);
    const courseId = String(body.courseId || body.course_id || '').trim();
    if (!courseId) return context.json({ error: 'courseId is required' }, 400);
    const request = new Request(new URL(`/api/courses/${courseId}/enroll`, context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
      body: JSON.stringify({
        studentId: body.studentId || body.student_id,
      }),
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.delete('/api/enrollments/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const enrollment = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM enrollments WHERE id = ? LIMIT 1',
      [context.req.param('id')],
    );
    if (!enrollment) return context.json({ error: 'Enrollment not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(enrollment.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    await dbRun(context.env.DB, 'DELETE FROM enrollments WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.get('/api/courses/:courseId/modules', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const courseRow = await getCourseRow(context.env.DB, context.req.param('courseId'));
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(courseRow.institution_id || ''), []);
    if (access.error) return access.error;
    return context.json(await listModulesForCourse(context.env.DB, context.req.param('courseId')));
  });

  app.post('/api/courses/:courseId/modules', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const courseId = context.req.param('courseId');
    const courseRow = await getCourseRow(context.env.DB, courseId);
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(courseRow.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<ModuleInput>(context.req.raw);
    if (!body.title) return context.json({ error: 'Module title is required' }, 400);
    const orderIndexRows = await dbFirst<Row>(
      context.env.DB,
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM modules WHERE course_id = ?',
      [courseId],
    );
    await dbRun(
      context.env.DB,
      `INSERT INTO modules (id, course_id, title, description, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        courseId,
        body.title,
        body.description || '',
        toNumber(body.orderIndex ?? body.order_index, toNumber(orderIndexRows?.next_order, 0)),
        nowIso(),
        nowIso(),
      ],
    );
    return context.json(await listModulesForCourse(context.env.DB, courseId), 201);
  });

  app.get('/api/modules/:moduleId/lessons', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const moduleRow = await getModuleRow(context.env.DB, context.req.param('moduleId'));
    if (!moduleRow) return context.json({ error: 'Module not found' }, 404);
    const courseRow = await getCourseRow(context.env.DB, String(moduleRow.course_id || ''));
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(courseRow.institution_id || ''), []);
    if (access.error) return access.error;
    return context.json(await listLessonsForModule(context.env.DB, context.req.param('moduleId'), verified.uid));
  });

  app.post('/api/modules/:moduleId/lessons', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const moduleId = context.req.param('moduleId');
    const moduleRow = await getModuleRow(context.env.DB, moduleId);
    if (!moduleRow) return context.json({ error: 'Module not found' }, 404);
    const courseRow = await getCourseRow(context.env.DB, String(moduleRow.course_id || ''));
    if (!courseRow) return context.json({ error: 'Course not found' }, 404);

    const institutionId = String(courseRow.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<LessonInput>(context.req.raw);
    if (!body.title) return context.json({ error: 'Lesson title is required' }, 400);
    const orderIndexRows = await dbFirst<Row>(
      context.env.DB,
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM lessons WHERE module_id = ?',
      [moduleId],
    );
    const lessonId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO lessons
       (id, module_id, course_id, title, content, video_r2_key, duration_minutes, order_index, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lessonId,
        moduleId,
        String(courseRow.id || ''),
        body.title,
        body.content || '',
        body.videoUrl || body.video_url || null,
        body.durationMinutes || body.duration_minutes || null,
        toNumber(body.orderIndex ?? body.order_index, toNumber(orderIndexRows?.next_order, 0)),
        toBoolean(body.published) ? 1 : 0,
        nowIso(),
        nowIso(),
      ],
    );

    const lessons = await listLessonsForModule(context.env.DB, moduleId, verified.uid);
    return context.json(lessons.find((lesson) => lesson.id === lessonId) || null, 201);
  });

  app.get('/api/lessons/:id', async (context) => {
    const verified = context.get('user');
    const lessonRow = await getLessonRow(context.env.DB, context.req.param('id'));
    if (!lessonRow) return context.json({ error: 'Lesson not found' }, 404);
    const course = await getCourseRow(context.env.DB, String(lessonRow.course_id || ''));
    const platformUser = context.get('platformUser');
    const access = await requireMembership(context.env.DB, platformUser, verified, String(course?.institution_id || ''), []);
    if (access.error) return access.error;
    const lessons = await listLessonsForModule(context.env.DB, String(lessonRow.module_id || ''), verified.uid);
    return context.json(lessons.find((lesson) => lesson.id === context.req.param('id')) || null);
  });

  app.put('/api/lessons/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const lessonRow = await getLessonRow(context.env.DB, context.req.param('id'));
    if (!lessonRow) return context.json({ error: 'Lesson not found' }, 404);
    const course = await getCourseRow(context.env.DB, String(lessonRow.course_id || ''));
    const access = await requireMembership(context.env.DB, platformUser, verified, String(course?.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<Partial<LessonInput> & Row>(context.req.raw);
    const fields: Row = {
      title: body.title,
      content: body.content,
      video_r2_key: body.videoUrl || body.video_url,
      duration_minutes: body.durationMinutes || body.duration_minutes,
      published: body.published === undefined ? undefined : (toBoolean(body.published) ? 1 : 0),
      updated_at: nowIso(),
    };
    const update = buildUpdateStatement('lessons', fields);
    await dbRun(context.env.DB, update.sql, [...update.values, context.req.param('id')]);
    const lessons = await listLessonsForModule(context.env.DB, String(lessonRow.module_id || ''), verified.uid);
    return context.json(lessons.find((lesson) => lesson.id === context.req.param('id')) || null);
  });

  app.patch('/api/lessons/:id', async (context) => {
    return app.fetch(new Request(context.req.raw, { method: 'PUT' }), context.env, context.executionCtx);
  });

  app.delete('/api/lessons/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const lessonRow = await getLessonRow(context.env.DB, context.req.param('id'));
    if (!lessonRow) return context.json({ error: 'Lesson not found' }, 404);
    const course = await getCourseRow(context.env.DB, String(lessonRow.course_id || ''));
    const access = await requireMembership(context.env.DB, platformUser, verified, String(course?.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    await dbRun(context.env.DB, 'DELETE FROM lessons WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.put('/api/lessons/:id/progress', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const lessonRow = await getLessonRow(context.env.DB, context.req.param('id'));
    if (!lessonRow) return context.json({ error: 'Lesson not found' }, 404);
    const course = await getCourseRow(context.env.DB, String(lessonRow.course_id || ''));
    const institutionId = String(course?.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'student',
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<{ completed?: boolean; resumeSeconds?: number; resume_seconds?: number }>(
      context.req.raw,
    );
    await dbRun(
      context.env.DB,
      `INSERT INTO lesson_progress
       (id, lesson_id, student_id, institution_id, completed, resume_position_seconds, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(lesson_id, student_id) DO UPDATE SET
         completed = excluded.completed,
         resume_position_seconds = excluded.resume_position_seconds,
         completed_at = excluded.completed_at,
         updated_at = excluded.updated_at`,
      [
        newId(),
        context.req.param('id'),
        verified.uid,
        institutionId,
        body.completed ? 1 : 0,
        toNumber(body.resumeSeconds ?? body.resume_seconds, 0),
        body.completed ? nowIso() : null,
        nowIso(),
      ],
    );

    return context.json({
      success: true,
      lesson_id: context.req.param('id'),
      student_id: verified.uid,
      completed: Boolean(body.completed),
    });
  });

  app.post('/api/lessons/:id/progress', async (context) => {
    return app.fetch(new Request(context.req.raw, { method: 'PUT' }), context.env, context.executionCtx);
  });

  app.get('/api/lessons/:lessonId/assignments', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const lessonRow = await getLessonRow(context.env.DB, context.req.param('lessonId'));
    if (!lessonRow) return context.json({ error: 'Lesson not found' }, 404);
    const course = await getCourseRow(context.env.DB, String(lessonRow.course_id || ''));
    const access = await requireMembership(context.env.DB, platformUser, verified, String(course?.institution_id || ''), []);
    if (access.error) return access.error;
    return context.json(await listAssignmentsForInstitution(context.env.DB, String(course?.institution_id || ''), String(course?.id || ''), context.req.param('lessonId')));
  });

  app.post('/api/lessons/:lessonId/assignments', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const lessonRow = await getLessonRow(context.env.DB, context.req.param('lessonId'));
    if (!lessonRow) return context.json({ error: 'Lesson not found' }, 404);
    const course = await getCourseRow(context.env.DB, String(lessonRow.course_id || ''));
    const institutionId = String(course?.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<AssignmentInput>(context.req.raw);
    if (!body.title) return context.json({ error: 'Assignment title is required' }, 400);

    const assignmentId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO assignments
       (id, institution_id, course_id, lesson_id, title, description, teacher_id, file_url, due_date, status, total_points, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        institutionId,
        String(course?.id || ''),
        context.req.param('lessonId'),
        body.title,
        body.description || '',
        body.teacherId || body.teacher_id || verified.uid,
        body.fileUrl || body.file_url || null,
        body.dueDate || body.due_date || null,
        body.status || 'published',
        toNumber(body.totalPoints ?? body.total_points, 100),
        nowIso(),
        nowIso(),
      ],
    );

    const assignments = await listAssignmentsForInstitution(context.env.DB, institutionId, String(course?.id || ''), context.req.param('lessonId'));
    return context.json(assignments.find((assignment) => assignment.id === assignmentId) || null, 201);
  });

  app.get('/api/institutions/:id/assignments', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    return context.json(await listAssignmentsForInstitution(context.env.DB, institutionId, context.req.query('course_id') || undefined));
  });

  app.post('/api/institutions/:id/assignments', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<AssignmentInput & Row>(context.req.raw);
    const courseId = await resolveCourseId(context.env.DB, institutionId, body as Row);
    if (!courseId || !body.title) {
      return context.json({ error: 'Assignment title and valid course are required' }, 400);
    }

    const assignmentId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO assignments
       (id, institution_id, course_id, lesson_id, title, description, teacher_id, file_url, due_date, status, total_points, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        institutionId,
        courseId,
        body.lessonId || body.lesson_id || null,
        body.title,
        body.description || '',
        body.teacherId || body.teacher_id || verified.uid,
        body.fileUrl || body.file_url || null,
        body.dueDate || body.due_date || null,
        body.status || 'published',
        toNumber(body.totalPoints ?? body.total_points, 100),
        nowIso(),
        nowIso(),
      ],
    );

    const assignments = await listAssignmentsForInstitution(context.env.DB, institutionId, courseId);
    return context.json(assignments.find((assignment) => assignment.id === assignmentId) || null, 201);
  });

  app.put('/api/assignments/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const assignment = await getAssignmentRow(context.env.DB, context.req.param('id'));
    if (!assignment) return context.json({ error: 'Assignment not found' }, 404);
    const institutionId = String(assignment.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    const body = await parseRequestBody<Partial<AssignmentInput> & Row>(context.req.raw);
    const fields: Row = {
      title: body.title,
      description: body.description,
      file_url: body.fileUrl || body.file_url,
      due_date: body.dueDate || body.due_date,
      status: body.status,
      total_points: body.totalPoints || body.total_points,
      updated_at: nowIso(),
    };
    if (body.courseName || body.course_name || body.courseId || body.course_id) {
      fields.course_id = await resolveCourseId(context.env.DB, institutionId, body as Row);
    }
    const update = buildUpdateStatement('assignments', fields);
    await dbRun(context.env.DB, update.sql, [...update.values, context.req.param('id')]);
    const assignments = await listAssignmentsForInstitution(context.env.DB, institutionId);
    return context.json(assignments.find((item) => item.id === context.req.param('id')) || null);
  });

  app.patch('/api/assignments/:id', async (context) => {
    return app.fetch(new Request(context.req.raw, { method: 'PUT' }), context.env, context.executionCtx);
  });

  app.delete('/api/assignments/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const assignment = await getAssignmentRow(context.env.DB, context.req.param('id'));
    if (!assignment) return context.json({ error: 'Assignment not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(assignment.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    await dbRun(context.env.DB, 'DELETE FROM assignments WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.get('/api/institutions/:id/submissions', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    return context.json(
      await listSubmissionsForInstitution(
        context.env.DB,
        institutionId,
        context.req.query('assignment_id') || undefined,
        context.req.query('student_id') || undefined,
      ),
    );
  });

  app.post('/api/assignments/:id/submit', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const assignment = await getAssignmentRow(context.env.DB, context.req.param('id'));
    if (!assignment) return context.json({ error: 'Assignment not found' }, 404);
    const institutionId = String(assignment.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['student', 'owner', 'admin', 'teacher']);
    if (access.error) return access.error;
    const body = await parseRequestBody<{ content?: string; notes?: string; fileUrl?: string; file_url?: string }>(context.req.raw);
    await dbRun(
      context.env.DB,
      `INSERT INTO submissions
       (id, assignment_id, student_id, institution_id, submission_content, file_url, notes, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
       ON CONFLICT(assignment_id, student_id) DO UPDATE SET
         submission_content = excluded.submission_content,
         file_url = excluded.file_url,
         notes = excluded.notes,
         status = 'pending',
         submitted_at = excluded.submitted_at`,
      [
        newId(),
        context.req.param('id'),
        verified.uid,
        institutionId,
        body.content || null,
        body.fileUrl || body.file_url || null,
        body.notes || null,
        nowIso(),
      ],
    );
    const submissions = await listSubmissionsForInstitution(context.env.DB, institutionId, context.req.param('id'), verified.uid);
    return context.json(submissions[0], 201);
  });

  app.post('/api/institutions/:id/submissions', async (context) => {
    const body = await parseRequestBody<{ assignmentId?: string; assignment_id?: string; content?: string; notes?: string; fileUrl?: string; file_url?: string }>(context.req.raw);
    const assignmentId = String(body.assignmentId || body.assignment_id || '').trim();
    if (!assignmentId) return context.json({ error: 'assignmentId is required' }, 400);
    const request = new Request(new URL(`/api/assignments/${assignmentId}/submit`, context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
      body: JSON.stringify(body),
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.get('/api/assignments/:id/submissions', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const assignment = await getAssignmentRow(context.env.DB, context.req.param('id'));
    if (!assignment) return context.json({ error: 'Assignment not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(assignment.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    return context.json(await listSubmissionsForInstitution(context.env.DB, String(assignment.institution_id || ''), context.req.param('id')));
  });

  app.put('/api/submissions/:id/grade', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const submission = await dbFirst<Row>(context.env.DB, 'SELECT * FROM submissions WHERE id = ? LIMIT 1', [
      context.req.param('id'),
    ]);
    if (!submission) return context.json({ error: 'Submission not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(submission.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    const body = await parseRequestBody<{ grade?: number; feedback?: string }>(context.req.raw);
    await dbRun(
      context.env.DB,
      'UPDATE submissions SET grade = ?, feedback = ?, status = ?, graded_at = ?, graded_by = ? WHERE id = ?',
      [body.grade ?? null, body.feedback || null, 'graded', nowIso(), verified.uid, context.req.param('id')],
    );
    await createNotification(
      context.env.DB,
      String(submission.institution_id || ''),
      String(submission.student_id || ''),
      'grade',
      'Submission graded',
      'Your assignment submission has been graded.',
    );
    const submissions = await listSubmissionsForInstitution(context.env.DB, String(submission.institution_id || ''), String(submission.assignment_id || ''));
    return context.json(submissions.find((item) => item.id === context.req.param('id')) || null);
  });

  app.patch('/api/submissions/:id', async (context) => {
    const request = await forwardRawRequest(
      context.req.raw.url.replace(`/submissions/${context.req.param('id')}`, `/submissions/${context.req.param('id')}/grade`),
      context.req.raw,
      'PUT',
    );
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.get('/api/lessons/:lessonId/quizzes', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const lessonRow = await getLessonRow(context.env.DB, context.req.param('lessonId'));
    if (!lessonRow) return context.json({ error: 'Lesson not found' }, 404);
    const course = await getCourseRow(context.env.DB, String(lessonRow.course_id || ''));
    const access = await requireMembership(context.env.DB, platformUser, verified, String(course?.institution_id || ''), []);
    if (access.error) return access.error;
    return context.json(await listQuizzesForInstitution(context.env.DB, String(course?.institution_id || ''), String(course?.id || ''), context.req.param('lessonId')));
  });

  app.post('/api/lessons/:lessonId/quizzes', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const lessonRow = await getLessonRow(context.env.DB, context.req.param('lessonId'));
    if (!lessonRow) return context.json({ error: 'Lesson not found' }, 404);
    const course = await getCourseRow(context.env.DB, String(lessonRow.course_id || ''));
    const institutionId = String(course?.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    const body = await parseRequestBody<QuizInput>(context.req.raw);
    if (!body.title || !Array.isArray(body.questions)) {
      return context.json({ error: 'Quiz title and questions are required' }, 400);
    }
    const quizId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO quizzes
       (id, institution_id, course_id, lesson_id, teacher_id, title, time_limit_minutes, questions, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quizId,
        institutionId,
        String(course?.id || ''),
        context.req.param('lessonId'),
        body.teacherId || body.teacher_id || verified.uid,
        body.title,
        toNumber(body.timeLimitMinutes ?? body.time_limit_minutes ?? body.time_limit, 15),
        JSON.stringify(body.questions),
        body.status || 'published',
        nowIso(),
        nowIso(),
      ],
    );
    const quizzes = await listQuizzesForInstitution(context.env.DB, institutionId, String(course?.id || ''), context.req.param('lessonId'));
    return context.json(quizzes.find((quiz) => quiz.id === quizId) || null, 201);
  });

  app.get('/api/institutions/:id/quizzes', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    return context.json(await listQuizzesForInstitution(context.env.DB, institutionId));
  });

  app.post('/api/institutions/:id/quizzes', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const body = await parseRequestBody<QuizInput & Row>(context.req.raw);
    const courseId = await resolveCourseId(context.env.DB, institutionId, body as Row);
    if (!courseId || !body.title || !Array.isArray(body.questions)) {
      return context.json({ error: 'Quiz title, questions, and valid course are required' }, 400);
    }

    const quizId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO quizzes
       (id, institution_id, course_id, lesson_id, teacher_id, title, time_limit_minutes, questions, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quizId,
        institutionId,
        courseId,
        body.lessonId || body.lesson_id || null,
        body.teacherId || body.teacher_id || verified.uid,
        body.title,
        toNumber(body.timeLimitMinutes ?? body.time_limit_minutes ?? body.time_limit, 15),
        JSON.stringify(body.questions),
        body.status || 'published',
        nowIso(),
        nowIso(),
      ],
    );

    const quizzes = await listQuizzesForInstitution(context.env.DB, institutionId, courseId);
    return context.json(quizzes.find((quiz) => quiz.id === quizId) || null, 201);
  });

  app.delete('/api/quizzes/:id', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const quiz = await getQuizRow(context.env.DB, context.req.param('id'));
    if (!quiz) return context.json({ error: 'Quiz not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(quiz.institution_id || ''), [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;
    await dbRun(context.env.DB, 'DELETE FROM quizzes WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.get('/api/institutions/:id/quiz-attempts', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    return context.json(
      await listQuizAttemptsForInstitution(
        context.env.DB,
        institutionId,
        undefined,
        context.req.query('student_id') || undefined,
      ),
    );
  });

  app.post('/api/quizzes/:id/attempt', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const quiz = await getQuizRow(context.env.DB, context.req.param('id'));
    if (!quiz) return context.json({ error: 'Quiz not found' }, 404);
    const institutionId = String(quiz.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['student', 'owner', 'admin', 'teacher']);
    if (access.error) return access.error;
    const body = await parseRequestBody<{ answers?: Record<number, string>; score?: number; questions?: unknown[] }>(context.req.raw);
    const attemptId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO quiz_attempts
       (id, quiz_id, student_id, institution_id, answers, score, questions_snapshot, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [
        attemptId,
        context.req.param('id'),
        verified.uid,
        institutionId,
        JSON.stringify(body.answers || {}),
        toNumber(body.score, 0),
        JSON.stringify(body.questions || parseJsonValue(quiz.questions, [])),
        nowIso(),
      ],
    );
    await createNotification(
      context.env.DB,
      institutionId,
      String(quiz.teacher_id || ''),
      'assignment',
      'Quiz submitted',
      'A learner submitted a quiz attempt.',
    );
    const attempts = await listQuizAttemptsForInstitution(context.env.DB, institutionId, context.req.param('id'), verified.uid);
    return context.json(attempts.find((attempt) => attempt.id === attemptId) || null, 201);
  });

  app.post('/api/institutions/:id/quiz-attempts', async (context) => {
    const body = await parseRequestBody<{ quizId?: string; quiz_id?: string; answers?: Record<number, string>; score?: number; questions?: unknown[] }>(context.req.raw);
    const quizId = String(body.quizId || body.quiz_id || '').trim();
    if (!quizId) return context.json({ error: 'quizId is required' }, 400);
    const request = new Request(new URL(`/api/quizzes/${quizId}/attempt`, context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
      body: JSON.stringify(body),
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.put('/api/quiz-attempts/:id/submit', async (context) => {
    const body = await parseRequestBody<{ answers?: Record<number, string>; score?: number }>(context.req.raw);
    await dbRun(
      context.env.DB,
      'UPDATE quiz_attempts SET answers = ?, score = ?, submitted_at = ? WHERE id = ?',
      [JSON.stringify(body.answers || {}), toNumber(body.score, 0), nowIso(), context.req.param('id')],
    );
    const attempt = await dbFirst<Row>(context.env.DB, 'SELECT * FROM quiz_attempts WHERE id = ? LIMIT 1', [context.req.param('id')]);
    return context.json(attempt);
  });

  app.get('/api/quizzes/:id/results', async (context) => {
    const quiz = await getQuizRow(context.env.DB, context.req.param('id'));
    if (!quiz) return context.json({ error: 'Quiz not found' }, 404);
    return context.json(await listQuizAttemptsForInstitution(context.env.DB, String(quiz.institution_id || ''), context.req.param('id')));
  });

  app.get('/api/courses/:courseId/attendance-sessions', async (context) => {
    return context.json(await listAttendanceSessions(context.env.DB, context.req.param('courseId')));
  });

  app.post('/api/courses/:courseId/attendance-sessions', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const course = await getCourseRow(context.env.DB, context.req.param('courseId'));
    if (!course) return context.json({ error: 'Course not found' }, 404);
    const institutionId = String(course.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['owner', 'admin', 'teacher']);
    if (access.error) return access.error;
    const body = await parseRequestBody<{ sessionDate?: string; topic?: string }>(context.req.raw);
    const sessionId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO attendance_sessions
       (id, institution_id, course_id, teacher_id, session_date, topic, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        institutionId,
        context.req.param('courseId'),
        verified.uid,
        body.sessionDate || nowIso().slice(0, 10),
        body.topic || null,
        nowIso(),
      ],
    );
    return context.json(await getAttendanceSessionRow(context.env.DB, sessionId), 201);
  });

  app.get('/api/attendance-sessions/:id/records', async (context) => {
    const session = await getAttendanceSessionRow(context.env.DB, context.req.param('id'));
    if (!session) return context.json({ error: 'Attendance session not found' }, 404);
    return context.json(await listAttendanceRecords(context.env.DB, String(session.institution_id || ''), context.req.param('id')));
  });

  app.put('/api/attendance-sessions/:id/mark', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const session = await getAttendanceSessionRow(context.env.DB, context.req.param('id'));
    if (!session) return context.json({ error: 'Attendance session not found' }, 404);
    const institutionId = String(session.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['owner', 'admin', 'teacher']);
    if (access.error) return access.error;
    const body = await parseRequestBody<{ records?: Array<{ studentId?: string; student_id?: string; status: string; notes?: string }> }>(context.req.raw);
    if (!Array.isArray(body.records)) return context.json({ error: 'records[] is required' }, 400);
    for (const record of body.records) {
      const studentId = String(record.studentId || record.student_id || '').trim();
      if (!studentId) continue;
      await dbRun(
        context.env.DB,
        `INSERT INTO attendance_records
         (id, session_id, institution_id, student_id, status, marked_by, marked_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id, student_id) DO UPDATE SET
           status = excluded.status,
           marked_by = excluded.marked_by,
           marked_at = excluded.marked_at,
           notes = excluded.notes`,
        [newId(), context.req.param('id'), institutionId, studentId, record.status, verified.uid, nowIso(), record.notes || null],
      );
    }
    return context.json(await listAttendanceRecords(context.env.DB, institutionId, context.req.param('id')));
  });

  app.get('/api/institutions/:id/attendance/records', async (context) => {
    return context.json(await listAttendanceRecords(context.env.DB, context.req.param('id')));
  });

  app.post('/api/institutions/:id/attendance/records', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['owner', 'admin', 'teacher']);
    if (access.error) return access.error;
    const body = await parseRequestBody<{ courseId?: string; course_id?: string; studentId?: string; student_id?: string; status?: string }>(context.req.raw);
    const courseId = String(body.courseId || body.course_id || '').trim();
    const studentId = String(body.studentId || body.student_id || '').trim();
    if (!courseId || !studentId || !body.status) {
      return context.json({ error: 'courseId, studentId, and status are required' }, 400);
    }

    const today = new Date().toISOString().slice(0, 10);
    let session = await dbFirst<Row>(
      context.env.DB,
      'SELECT * FROM attendance_sessions WHERE course_id = ? AND session_date = ? LIMIT 1',
      [courseId, today],
    );
    if (!session) {
      const sessionId = newId();
      await dbRun(
        context.env.DB,
        `INSERT INTO attendance_sessions (id, institution_id, course_id, teacher_id, session_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, institutionId, courseId, verified.uid, today, nowIso()],
      );
      session = await getAttendanceSessionRow(context.env.DB, sessionId);
    }

    await dbRun(
      context.env.DB,
      `INSERT INTO attendance_records
       (id, session_id, institution_id, student_id, status, marked_by, marked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id, student_id) DO UPDATE SET
         status = excluded.status,
         marked_by = excluded.marked_by,
         marked_at = excluded.marked_at`,
      [newId(), String(session?.id || ''), institutionId, studentId, body.status, verified.uid, nowIso()],
    );

    return context.json(await listAttendanceRecords(context.env.DB, institutionId, String(session?.id || '')));
  });

  app.get('/api/institutions/:id/payments', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    return context.json(await listPaymentsForInstitution(context.env.DB, institutionId, context.req.query('student_id') || undefined));
  });

  app.post('/api/institutions/:id/payments', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['owner', 'admin']);
    if (access.error) return access.error;
    const body = await parseRequestBody<PaymentInput & Row>(context.req.raw);
    const paymentId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO payments
       (id, institution_id, student_id, course_id, amount_paid, total_fee, balance, currency, payment_method, reference_number, status, payment_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        institutionId,
        body.studentId || body.student_id,
        body.courseId || body.course_id || null,
        toNumber(body.amountPaid ?? body.amount_paid, 0),
        toNumber(body.totalFee ?? body.total_fee, 0),
        Math.max(0, toNumber(body.totalFee ?? body.total_fee, 0) - toNumber(body.amountPaid ?? body.amount_paid, 0)),
        body.paymentMethod || body.payment_method || 'manual',
        body.referenceNumber || body.reference_number || '',
        body.status ||
          (toNumber(body.amountPaid ?? body.amount_paid, 0) >= toNumber(body.totalFee ?? body.total_fee, 0)
            ? 'paid'
            : 'partial'),
        nowIso(),
        null,
        nowIso(),
      ],
    );
    return context.json((await listPaymentsForInstitution(context.env.DB, institutionId)).find((payment) => payment.id === paymentId) || null, 201);
  });

  app.get('/api/institutions/:id/invoices', async (context) => {
    return context.json(await listInvoicesForInstitution(context.env.DB, context.req.param('id')));
  });

  app.post('/api/institutions/:id/invoices', async (context) => {
    const body = await parseRequestBody<{ studentId?: string; student_id?: string; courseId?: string; course_id?: string; amount?: number; dueDate?: string; due_date?: string }>(context.req.raw);
    const institutionId = context.req.param('id');
    const invoiceId = newId();
    const invoiceNumber = `INV-${Date.now()}`;
    await dbRun(
      context.env.DB,
      `INSERT INTO invoices
       (id, institution_id, student_id, course_id, invoice_number, amount, currency, due_date, status, issued_at)
       VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, 'open', ?)`,
      [
        invoiceId,
        institutionId,
        body.studentId || body.student_id,
        body.courseId || body.course_id || null,
        invoiceNumber,
        toNumber(body.amount, 0),
        body.dueDate || body.due_date || null,
        nowIso(),
      ],
    );
    return context.json((await listInvoicesForInstitution(context.env.DB, institutionId)).find((invoice) => invoice.id === invoiceId) || null, 201);
  });

  app.get('/api/institutions/:id/refunds', async (context) => {
    return context.json(await listRefundsForInstitution(context.env.DB, context.req.param('id')));
  });

  app.post('/api/institutions/:id/refunds', async (context) => {
    const verified = context.get('user');
    const body = await parseRequestBody<{ paymentId?: string; payment_id?: string; amount?: number; reason?: string }>(context.req.raw);
    const paymentId = String(body.paymentId || body.payment_id || '').trim();
    const payment = await getPaymentRow(context.env.DB, paymentId);
    if (!payment) return context.json({ error: 'Payment not found' }, 404);
    const refundId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO refunds
       (id, institution_id, payment_id, student_id, amount, reason, status, requested_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        refundId,
        context.req.param('id'),
        paymentId,
        payment.student_id,
        toNumber(body.amount, 0),
        body.reason || null,
        verified.uid,
        nowIso(),
      ],
    );
    return context.json((await listRefundsForInstitution(context.env.DB, context.req.param('id'))).find((refund) => refund.id === refundId) || null, 201);
  });

  app.patch('/api/refunds/:id', async (context) => {
    const body = await parseRequestBody<{ status?: string }>(context.req.raw);
    await dbRun(context.env.DB, 'UPDATE refunds SET status = ?, processed_at = ? WHERE id = ?', [
      body.status || 'processed',
      nowIso(),
      context.req.param('id'),
    ]);
    const refund = await dbFirst<Row>(context.env.DB, 'SELECT * FROM refunds WHERE id = ? LIMIT 1', [context.req.param('id')]);
    return context.json(refund);
  });

  app.get('/api/courses/:courseId/live-classes', async (context) => {
    const course = await getCourseRow(context.env.DB, context.req.param('courseId'));
    if (!course) return context.json({ error: 'Course not found' }, 404);
    return context.json(await listLiveClassesForInstitution(context.env.DB, String(course.institution_id || ''), context.req.param('courseId')));
  });

  app.post('/api/courses/:courseId/live-classes', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const course = await getCourseRow(context.env.DB, context.req.param('courseId'));
    if (!course) return context.json({ error: 'Course not found' }, 404);
    const institutionId = String(course.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['owner', 'admin', 'teacher']);
    if (access.error) return access.error;
    const body = await parseRequestBody<LiveClassInput>(context.req.raw);
    const classId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO live_classes
       (id, institution_id, course_id, teacher_id, title, scheduled_at, duration_minutes, platform, meeting_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
      [
        classId,
        institutionId,
        context.req.param('courseId'),
        body.teacherId || body.teacher_id || verified.uid,
        body.title,
        body.scheduledAt || body.scheduled_at || body.dateTime || nowIso(),
        toNumber(body.durationMinutes ?? body.duration_minutes, 60),
        normalizePlatform(body.platform),
        body.meetingUrl || body.meeting_url || body.meetingLink || null,
        nowIso(),
        nowIso(),
      ],
    );
    return context.json((await listLiveClassesForInstitution(context.env.DB, institutionId, context.req.param('courseId'))).find((item) => item.id === classId) || null, 201);
  });

  app.get('/api/institutions/:id/live-classes', async (context) => {
    return context.json(await listLiveClassesForInstitution(context.env.DB, context.req.param('id')));
  });

  app.post('/api/institutions/:id/live-classes', async (context) => {
    const body = await parseRequestBody<LiveClassInput & Row>(context.req.raw);
    const courseId = await resolveCourseId(context.env.DB, context.req.param('id'), body as Row);
    if (!courseId) return context.json({ error: 'Valid course is required' }, 400);
    const request = new Request(new URL(`/api/courses/${courseId}/live-classes`, context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
      body: JSON.stringify(body),
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.put('/api/live-classes/:id', async (context) => {
    const body = await parseRequestBody<Partial<LiveClassInput>>(context.req.raw);
    const fields: Row = {
      title: body.title,
      scheduled_at: body.scheduledAt || body.scheduled_at || body.dateTime,
      duration_minutes: body.durationMinutes || body.duration_minutes,
      platform: body.platform ? normalizePlatform(body.platform) : undefined,
      meeting_url: body.meetingUrl || body.meeting_url || body.meetingLink,
      updated_at: nowIso(),
    };
    const update = buildUpdateStatement('live_classes', fields);
    await dbRun(context.env.DB, update.sql, [...update.values, context.req.param('id')]);
    return context.json(await getLiveClassRow(context.env.DB, context.req.param('id')));
  });

  app.delete('/api/live-classes/:id', async (context) => {
    await dbRun(context.env.DB, 'DELETE FROM live_classes WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.post('/api/live-classes/:id/start', async (context) => {
    const liveClass = await getLiveClassRow(context.env.DB, context.req.param('id'));
    if (!liveClass) return context.json({ error: 'Live class not found' }, 404);
    const meetingUrl =
      (liveClass.meeting_url as string | null) ||
      `https://meet.example.com/session/${context.req.param('id')}`;
    await dbRun(
      context.env.DB,
      'UPDATE live_classes SET status = ?, meeting_url = ?, started_at = ?, updated_at = ? WHERE id = ?',
      ['live', meetingUrl, nowIso(), nowIso(), context.req.param('id')],
    );
    return context.json({ meetingUrl, meeting_url: meetingUrl });
  });

  app.post('/api/live-classes/:id/end', async (context) => {
    const recordingKey = `recordings/${context.req.param('id')}.txt`;
    await context.env.BUCKET.put(recordingKey, `Recording placeholder for ${context.req.param('id')}`);
    await dbRun(
      context.env.DB,
      'UPDATE live_classes SET status = ?, ended_at = ?, recording_r2_key = ?, updated_at = ? WHERE id = ?',
      ['completed', nowIso(), recordingKey, nowIso(), context.req.param('id')],
    );
    return context.json({ success: true, recordingKey, recordingUrl: publicObjectUrl(recordingKey) });
  });

  app.get('/api/institutions/:id/announcements', async (context) => {
    return context.json(await listAnnouncementsForInstitution(context.env.DB, context.req.param('id'), context.req.query('course_id') || undefined));
  });

  app.get('/api/courses/:courseId/announcements', async (context) => {
    const course = await getCourseRow(context.env.DB, context.req.param('courseId'));
    if (!course) return context.json({ error: 'Course not found' }, 404);
    return context.json(await listAnnouncementsForInstitution(context.env.DB, String(course.institution_id || ''), context.req.param('courseId')));
  });

  app.post('/api/institutions/:id/announcements', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, ['owner', 'admin', 'teacher']);
    if (access.error) return access.error;
    const body = await parseRequestBody<AnnouncementInput>(context.req.raw);
    if (!body.content) return context.json({ error: 'Announcement content is required' }, 400);
    const announcementId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO announcements
       (id, institution_id, course_id, title, content, author_id, author_name, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        announcementId,
        institutionId,
        body.courseId || body.course_id || null,
        body.title || String(body.content).slice(0, 64),
        body.content,
        verified.uid,
        String(platformUser.fullName || platformUser.full_name || verified.name || ''),
        body.priority || 'normal',
        nowIso(),
        nowIso(),
      ],
    );
    return context.json((await listAnnouncementsForInstitution(context.env.DB, institutionId)).find((announcement) => announcement.id === announcementId) || null, 201);
  });

  app.put('/api/announcements/:id', async (context) => {
    const body = await parseRequestBody<Partial<AnnouncementInput>>(context.req.raw);
    const fields: Row = {
      title: body.title,
      content: body.content,
      course_id: body.courseId || body.course_id,
      priority: body.priority,
      updated_at: nowIso(),
    };
    const update = buildUpdateStatement('announcements', fields);
    await dbRun(context.env.DB, update.sql, [...update.values, context.req.param('id')]);
    const row = await dbFirst<Row>(context.env.DB, 'SELECT * FROM announcements WHERE id = ? LIMIT 1', [context.req.param('id')]);
    return context.json(row);
  });

  app.delete('/api/announcements/:id', async (context) => {
    await dbRun(context.env.DB, 'DELETE FROM announcements WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.get('/api/courses/:courseId/discussions', async (context) => {
    const course = await getCourseRow(context.env.DB, context.req.param('courseId'));
    if (!course) return context.json({ error: 'Course not found' }, 404);
    return context.json(await listDiscussionsForInstitution(context.env.DB, String(course.institution_id || ''), context.req.param('courseId')));
  });

  app.post('/api/courses/:courseId/discussions', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const course = await getCourseRow(context.env.DB, context.req.param('courseId'));
    if (!course) return context.json({ error: 'Course not found' }, 404);
    const institutionId = String(course.institution_id || '');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    const body = await parseRequestBody<{ title?: string }>(context.req.raw);
    if (!body.title) return context.json({ error: 'Discussion title is required' }, 400);
    const discussionId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO discussions
       (id, institution_id, course_id, title, author_id, author_name, status, pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', 0, ?, ?)`,
      [
        discussionId,
        institutionId,
        context.req.param('courseId'),
        body.title,
        verified.uid,
        String(platformUser.fullName || platformUser.full_name || verified.name || ''),
        nowIso(),
        nowIso(),
      ],
    );
    return context.json((await listDiscussionsForInstitution(context.env.DB, institutionId, context.req.param('courseId'))).find((discussion) => discussion.id === discussionId) || null, 201);
  });

  app.get('/api/institutions/:id/discussions', async (context) => {
    return context.json(await listDiscussionsForInstitution(context.env.DB, context.req.param('id'), context.req.query('course_id') || undefined));
  });

  app.post('/api/institutions/:id/discussions', async (context) => {
    const body = await parseRequestBody<{ courseId?: string; course_id?: string; title?: string }>(context.req.raw);
    const courseId = String(body.courseId || body.course_id || '').trim();
    if (!courseId || !body.title) return context.json({ error: 'courseId and title are required' }, 400);
    const request = new Request(new URL(`/api/courses/${courseId}/discussions`, context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
      body: JSON.stringify(body),
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.get('/api/discussions/:id/replies', async (context) => {
    const discussion = await getDiscussionRow(context.env.DB, context.req.param('id'));
    if (!discussion) return context.json({ error: 'Discussion not found' }, 404);
    return context.json(await listDiscussionPosts(context.env.DB, context.req.param('id')));
  });

  app.post('/api/discussions/:id/replies', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const discussion = await getDiscussionRow(context.env.DB, context.req.param('id'));
    if (!discussion) return context.json({ error: 'Discussion not found' }, 404);
    const access = await requireMembership(context.env.DB, platformUser, verified, String(discussion.institution_id || ''), []);
    if (access.error) return access.error;
    const body = await parseRequestBody<{ content?: string }>(context.req.raw);
    if (!body.content) return context.json({ error: 'Reply content is required' }, 400);
    const postId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO discussion_posts
       (id, discussion_id, author_id, author_name, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        postId,
        context.req.param('id'),
        verified.uid,
        String(platformUser.fullName || platformUser.full_name || verified.name || ''),
        body.content,
        nowIso(),
      ],
    );
    await dbRun(
      context.env.DB,
      'UPDATE discussions SET updated_at = ? WHERE id = ?',
      [nowIso(), context.req.param('id')],
    );
    return context.json((await listDiscussionPosts(context.env.DB, context.req.param('id'))).find((post) => post.id === postId) || null, 201);
  });

  app.get('/api/institutions/:id/discussions/:discussionId/posts', async (context) => {
    return context.json(await listDiscussionPosts(context.env.DB, context.req.param('discussionId')));
  });

  app.post('/api/institutions/:id/discussions/:discussionId/posts', async (context) => {
    const request = await forwardRawRequest(
      new URL(`/api/discussions/${context.req.param('discussionId')}/replies`, context.req.raw.url),
      context.req.raw,
      'POST',
    );
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.delete('/api/institutions/:id/discussions/:discussionId/posts/:postId', async (context) => {
    await dbRun(context.env.DB, 'DELETE FROM discussion_posts WHERE id = ?', [context.req.param('postId')]);
    return context.json({ success: true });
  });

  app.post('/api/messages', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const body = await parseRequestBody<{ institutionId?: string; institution_id?: string; toUserId?: string; to_user_id?: string; recipientId?: string; content?: string }>(context.req.raw);
    const institutionId = String(body.institutionId || body.institution_id || '').trim();
    const toUserId = String(body.toUserId || body.to_user_id || body.recipientId || '').trim();
    if (!institutionId || !toUserId || !body.content) {
      return context.json({ error: 'institutionId, toUserId, and content are required' }, 400);
    }
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId);
    if (access.error) return access.error;
    const pair = [verified.uid, toUserId].sort();
    let conversation = await dbFirst<Row>(
      context.env.DB,
      `SELECT * FROM conversations
       WHERE institution_id = ? AND participant_a_user_id = ? AND participant_b_user_id = ?
       LIMIT 1`,
      [institutionId, pair[0], pair[1]],
    );
    if (!conversation) {
      const conversationId = newId();
      await dbRun(
        context.env.DB,
        `INSERT INTO conversations
         (id, institution_id, participant_a_user_id, participant_b_user_id, last_message_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [conversationId, institutionId, pair[0], pair[1], nowIso(), nowIso(), nowIso()],
      );
      conversation = await getConversationRow(context.env.DB, conversationId);
    }
    const messageId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO messages
       (id, institution_id, conversation_id, from_user_id, from_user_name, to_user_id, to_user_name, content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        institutionId,
        conversation?.id,
        verified.uid,
        String(platformUser.fullName || platformUser.full_name || verified.name || ''),
        toUserId,
        '',
        body.content,
        nowIso(),
      ],
    );
    await dbRun(
      context.env.DB,
      'UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?',
      [nowIso(), nowIso(), conversation?.id],
    );
    await createNotification(
      context.env.DB,
      institutionId,
      toUserId,
      'message',
      'New message',
      body.content,
    );
    const messages = await listMessagesForInstitution(context.env.DB, institutionId, verified.uid, toUserId);
    return context.json(messages.find((message) => message.id === messageId) || null, 201);
  });

  app.get('/api/messages/conversations', async (context) => {
    const verified = context.get('user');
    const institutionId = context.req.query('institutionId') || context.req.query('institution_id') || '';
    if (!institutionId) return context.json({ error: 'institutionId is required' }, 400);
    const rows = await dbAll<Row>(
      context.env.DB,
      `SELECT *
       FROM conversations
       WHERE institution_id = ? AND (participant_a_user_id = ? OR participant_b_user_id = ?)
       ORDER BY updated_at DESC`,
      [institutionId, verified.uid, verified.uid],
    );
    return context.json(rows);
  });

  app.get('/api/conversations/:id/messages', async (context) => {
    const conversation = await getConversationRow(context.env.DB, context.req.param('id'));
    if (!conversation) return context.json({ error: 'Conversation not found' }, 404);
    const currentUserId = context.get('user').uid;
    const peerId =
      String(conversation.participant_a_user_id || '') === currentUserId
        ? String(conversation.participant_b_user_id || '')
        : String(conversation.participant_a_user_id || '');
    return context.json(await listMessagesForInstitution(context.env.DB, String(conversation.institution_id || ''), currentUserId, peerId));
  });

  app.get('/api/institutions/:id/messages', async (context) => {
    const verified = context.get('user');
    return context.json(await listMessagesForInstitution(context.env.DB, context.req.param('id'), verified.uid, context.req.query('peer_id') || undefined));
  });

  app.post('/api/institutions/:id/messages', async (context) => {
    const body = await parseRequestBody<{ toUserId?: string; to_user_id?: string; content?: string }>(context.req.raw);
    const request = new Request(new URL('/api/messages', context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
      body: JSON.stringify({
        institutionId: context.req.param('id'),
        toUserId: body.toUserId || body.to_user_id,
        content: body.content,
      }),
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.get('/api/notifications', async (context) => {
    const verified = context.get('user');
    const institutionId = context.req.query('institutionId') || context.req.query('institution_id');
    if (!institutionId) return context.json({ error: 'institutionId is required' }, 400);
    return context.json(await listNotificationsForUser(context.env.DB, institutionId, verified.uid));
  });

  app.get('/api/institutions/:id/notifications', async (context) => {
    const verified = context.get('user');
    return context.json(await listNotificationsForUser(context.env.DB, context.req.param('id'), verified.uid));
  });

  app.put('/api/notifications/:id/read', async (context) => {
    await dbRun(context.env.DB, 'UPDATE notifications SET read_at = ? WHERE id = ?', [nowIso(), context.req.param('id')]);
    return context.json({ success: true });
  });

  app.delete('/api/notifications/:id', async (context) => {
    await dbRun(context.env.DB, 'DELETE FROM notifications WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.post('/api/institutions/:id/notifications/mark-read', async (context) => {
    const verified = context.get('user');
    await dbRun(
      context.env.DB,
      'UPDATE notifications SET read_at = ? WHERE institution_id = ? AND user_id = ? AND read_at IS NULL',
      [nowIso(), context.req.param('id'), verified.uid],
    );
    return context.json({ success: true });
  });

  app.get('/api/courses/:courseId/certificates', async (context) => {
    const course = await getCourseRow(context.env.DB, context.req.param('courseId'));
    if (!course) return context.json({ error: 'Course not found' }, 404);
    return context.json(await listCertificatesForInstitution(context.env.DB, String(course.institution_id || ''), context.req.param('courseId')));
  });

  app.get('/api/institutions/:id/certificates', async (context) => {
    return context.json(await listCertificatesForInstitution(context.env.DB, context.req.param('id')));
  });

  app.post('/api/institutions/:id/certificates', async (context) => {
    const body = await parseRequestBody<{ studentId?: string; student_id?: string; courseId?: string; course_id?: string }>(context.req.raw);
    const certificateId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO certificates
       (id, institution_id, student_id, course_id, verification_code, issued_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'issued')`,
      [
        certificateId,
        context.req.param('id'),
        body.studentId || body.student_id,
        body.courseId || body.course_id,
        `CERT-${Date.now()}`,
        nowIso(),
      ],
    );
    return context.json((await listCertificatesForInstitution(context.env.DB, context.req.param('id'))).find((certificate) => certificate.id === certificateId) || null, 201);
  });

  app.post('/api/certificates/:id/generate', async (context) => {
    const certificate = await getCertificateRow(context.env.DB, context.req.param('id'));
    if (!certificate) return context.json({ error: 'Certificate not found' }, 404);
    const key = `certificates/${context.req.param('id')}.txt`;
    await context.env.BUCKET.put(
      key,
      `Certificate ${certificate.verification_code || ''} for course ${certificate.course_id || ''}`,
      { httpMetadata: { contentType: 'text/plain' } },
    );
    await dbRun(
      context.env.DB,
      'UPDATE certificates SET certificate_r2_key = ? WHERE id = ?',
      [key, context.req.param('id')],
    );
    return context.json({ success: true, key, url: publicObjectUrl(key) });
  });

  app.get('/api/teachers/:teacherId/timetable', async (context) => {
    const institutionId = context.req.query('institutionId') || context.req.query('institution_id');
    if (!institutionId) return context.json({ error: 'institutionId is required' }, 400);
    return context.json(await listTimetableEntries(context.env.DB, institutionId, context.req.param('teacherId')));
  });

  app.post('/api/teachers/:teacherId/timetable', async (context) => {
    const body = await parseRequestBody<TimetableInput & { institutionId?: string; institution_id?: string }>(context.req.raw);
    const institutionId = String(body.institutionId || body.institution_id || '').trim();
    const courseId = String(body.courseId || body.course_id || '').trim();
    if (!institutionId || !courseId) {
      return context.json({ error: 'institutionId and courseId are required' }, 400);
    }
    const entryId = newId();
    await dbRun(
      context.env.DB,
      `INSERT INTO timetable_entries
       (id, institution_id, course_id, teacher_id, day_of_week, start_time, end_time, room, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entryId,
        institutionId,
        courseId,
        context.req.param('teacherId'),
        toNumber(body.dayOfWeek ?? body.day_of_week, 0),
        body.startTime || body.start_time || '',
        body.endTime || body.end_time || '',
        body.room || null,
        nowIso(),
        nowIso(),
      ],
    );
    return context.json((await listTimetableEntries(context.env.DB, institutionId, context.req.param('teacherId'))).find((entry) => entry.id === entryId) || null, 201);
  });

  app.get('/api/institutions/:id/timetable', async (context) => {
    return context.json(await listTimetableEntries(context.env.DB, context.req.param('id'), context.req.query('teacher_id') || undefined));
  });

  app.post('/api/institutions/:id/timetable', async (context) => {
    const body = await parseRequestBody<TimetableInput & { teacherId?: string; teacher_id?: string }>(context.req.raw);
    const teacherId = String(body.teacherId || body.teacher_id || '').trim();
    if (!teacherId) return context.json({ error: 'teacherId is required' }, 400);
    const request = new Request(new URL(`/api/teachers/${teacherId}/timetable?institutionId=${context.req.param('id')}`, context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
      body: JSON.stringify({
        ...body,
        institutionId: context.req.param('id'),
      }),
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.put('/api/timetable-entries/:id', async (context) => {
    const body = await parseRequestBody<Partial<TimetableInput>>(context.req.raw);
    const fields: Row = {
      day_of_week: body.dayOfWeek ?? body.day_of_week,
      start_time: body.startTime || body.start_time,
      end_time: body.endTime || body.end_time,
      room: body.room,
      updated_at: nowIso(),
    };
    const update = buildUpdateStatement('timetable_entries', fields);
    await dbRun(context.env.DB, update.sql, [...update.values, context.req.param('id')]);
    return context.json(await getTimetableRow(context.env.DB, context.req.param('id')));
  });

  app.delete('/api/timetable-entries/:id', async (context) => {
    await dbRun(context.env.DB, 'DELETE FROM timetable_entries WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.delete('/api/timetable/:id', async (context) => {
    await dbRun(context.env.DB, 'DELETE FROM timetable_entries WHERE id = ?', [context.req.param('id')]);
    return context.json({ success: true });
  });

  app.get('/api/institutions/:id/invites', async (context) => {
    const rows = await dbAll<Row>(
      context.env.DB,
      'SELECT * FROM user_invites WHERE institution_id = ? ORDER BY created_at DESC',
      [context.req.param('id')],
    );
    return context.json(
      rows.map((row) => ({
        ...row,
        fullName: row.full_name,
        assignedCourses: parseJsonValue(row.assigned_courses, []),
        expiresAt: row.expires_at,
        createdBy: row.created_by,
        pendingUserId: row.pending_user_id,
      })),
    );
  });

  app.post('/api/institutions/:id/invites', async (context) => {
    const body = await parseRequestBody<{ email: string; role: UserRole; fullName?: string; assignedCourses?: string[] }>(context.req.raw);
    const request = new Request(new URL('/api/auth/institution-invite', context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
      body: JSON.stringify({
        institutionId: context.req.param('id'),
        email: body.email,
        role: body.role,
        fullName: body.fullName,
        assignedCourses: body.assignedCourses,
      }),
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.delete('/api/institutions/:id/invites/:inviteId', async (context) => {
    await dbRun(context.env.DB, 'DELETE FROM user_invites WHERE id = ? AND institution_id = ?', [
      context.req.param('inviteId'),
      context.req.param('id'),
    ]);
    return context.json({ success: true });
  });

  app.post('/api/institutions/:id/invites/:inviteId/accept', async (context) => {
    const request = new Request(new URL(`/api/auth/accept-invite/${context.req.param('inviteId')}`, context.req.raw.url), {
      method: 'POST',
      headers: context.req.raw.headers,
    });
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.get('/api/institutions/:id/applications', async (context) => {
    const verified = context.get('user');
    const platformUser = context.get('platformUser');
    const institutionId = context.req.param('id');
    const access = await requireMembership(context.env.DB, platformUser, verified, institutionId, [
      'owner',
      'admin',
      'teacher',
    ]);
    if (access.error) return access.error;

    const rows = await dbAll<Row>(
      context.env.DB,
      'SELECT * FROM student_applications WHERE institution_id = ? ORDER BY COALESCE(application_submitted_at, created_at) DESC',
      [institutionId],
    );
    return context.json(rows.map((row) => mapStudentApplication(row)));
  });

  app.post('/api/institutions/:id/applications', async (context) => {
    const institution = await getInstitutionById(context.env.DB, context.req.param('id'));
    if (!institution) return context.json({ error: 'Institution not found' }, 404);
    const request = await forwardRawRequest(
      new URL(`/api/auth/request-join/${institution.slug}`, context.req.raw.url),
      context.req.raw,
      'POST',
    );
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.patch('/api/institutions/:id/applications/:appId', async (context) => {
    const request = await forwardRawRequest(
      new URL(`/api/auth/approve-application/${context.req.param('appId')}`, context.req.raw.url),
      context.req.raw,
      'POST',
    );
    return app.fetch(request, context.env, context.executionCtx);
  });

  app.get('/api/institutions/:id/materials', async (context) => {
    return context.json(await listMaterialsForInstitution(context.env.DB, context.req.param('id')));
  });

  app.post('/api/institutions/:id/materials', async (context) => {
    const verified = context.get('user');
    const body = await parseRequestBody<Row>(context.req.raw);
    const materialId = newId();
    const fileType = normalizeFileType(body.type || body.file_type);
    const fileSize = typeof body.file_size === 'number' ? body.file_size : Number(body.file_size) || null;
    await dbRun(
      context.env.DB,
      `INSERT INTO content_library
       (id, institution_id, title, description, r2_key, download_url, file_type, file_size, category, download_count, uploader_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        materialId,
        context.req.param('id'),
        String(body.name || body.title || 'Untitled file'),
        body.description || null,
        body.r2_key || null,
        body.download_url || body.downloadUrl || null,
        fileType,
        fileSize,
        String(body.category || 'General'),
        verified.uid,
        nowIso(),
      ],
    );
    return context.json((await listMaterialsForInstitution(context.env.DB, context.req.param('id'))).find((material) => material.id === materialId) || null, 201);
  });

  app.delete('/api/institutions/:id/materials/:materialId', async (context) => {
    const material = await dbFirst<Row>(context.env.DB, 'SELECT * FROM content_library WHERE id = ? LIMIT 1', [context.req.param('materialId')]);
    if (!material) return context.json({ error: 'Material not found' }, 404);
    if (material.r2_key) {
      await context.env.BUCKET.delete(String(material.r2_key));
    }
    await dbRun(context.env.DB, 'DELETE FROM content_library WHERE id = ?', [context.req.param('materialId')]);
    return context.json({ success: true });
  });

  app.post('/api/institutions/:id/materials/:materialId/download', async (context) => {
    await dbRun(
      context.env.DB,
      'UPDATE content_library SET download_count = COALESCE(download_count, 0) + 1 WHERE id = ?',
      [context.req.param('materialId')],
    );
    const material = await dbFirst<Row>(context.env.DB, 'SELECT * FROM content_library WHERE id = ? LIMIT 1', [context.req.param('materialId')]);
    return context.json(material);
  });

  app.post('/api/storage/upload', async (context) => {
    try {
      return context.json(await createStorageObject(context.env.BUCKET, 'uploads', context.req.raw), 201);
    } catch (error) {
      return context.json({ error: error instanceof Error ? error.message : 'Upload failed' }, 400);
    }
  });

  app.delete('/api/storage/object', async (context) => {
    const key = context.req.query('key');
    if (!key) return context.json({ error: 'Missing storage key' }, 400);
    await context.env.BUCKET.delete(key);
    return context.json({ success: true });
  });

  app.post('/api/uploads/:kind', async (context) => {
    try {
      return context.json(
        await createStorageObject(context.env.BUCKET, context.req.param('kind'), context.req.raw),
        201,
      );
    } catch (error) {
      return context.json({ error: error instanceof Error ? error.message : 'Upload failed' }, 400);
    }
  });

  app.get('/api/institutions/:id/dashboard', async (context) => {
    const institutionId = context.req.param('id');
    const [studentsCount, teachersCount, coursesCount, payments] = await Promise.all([
      dbFirst<Row>(context.env.DB, "SELECT COUNT(*) AS total FROM institution_users WHERE institution_id = ? AND role = 'student' AND status = 'active'", [institutionId]),
      dbFirst<Row>(context.env.DB, "SELECT COUNT(*) AS total FROM institution_users WHERE institution_id = ? AND role IN ('teacher', 'admin') AND status = 'active'", [institutionId]),
      dbFirst<Row>(context.env.DB, 'SELECT COUNT(*) AS total FROM courses WHERE institution_id = ?', [institutionId]),
      listPaymentsForInstitution(context.env.DB, institutionId),
    ]);
    const totalRevenue = payments
      .filter((payment) => String(payment.status || '') !== 'failed')
      .reduce((sum, payment) => sum + toNumber(payment.amount_paid || payment.amountPaid, 0), 0);
    const unpaidCount = payments.filter((payment) => String(payment.status || '') === 'unpaid').length;
    return context.json({
      students_count: toNumber(studentsCount?.total, 0),
      teachers_count: toNumber(teachersCount?.total, 0),
      courses_count: toNumber(coursesCount?.total, 0),
      total_revenue: totalRevenue,
      unpaid_count: unpaidCount,
    });
  });

  app.get('/api/institutions/:id/reports/financial', async (context) => {
    const payments = await listPaymentsForInstitution(context.env.DB, context.req.param('id'));
    const invoices = await listInvoicesForInstitution(context.env.DB, context.req.param('id'));
    const monthlyMap = new Map<string, number>();
    for (const payment of payments) {
      const date = String(payment.payment_date || payment.created_at || nowIso()).slice(0, 7);
      monthlyMap.set(date, (monthlyMap.get(date) || 0) + toNumber(payment.amount_paid, 0));
    }
    return context.json({
      totalRevenue: payments.reduce((sum, payment) => sum + toNumber(payment.amount_paid, 0), 0),
      outstanding: invoices
        .filter((invoice) => String(invoice.status || '') !== 'paid')
        .reduce((sum, invoice) => sum + toNumber(invoice.amount, 0), 0),
      monthly: [...monthlyMap.entries()].map(([name, revenue]) => ({ name, revenue })),
    });
  });

  app.get('/api/institutions/:id/reports/enrollment', async (context) => {
    const enrollments = await listEnrollmentsForInstitution(context.env.DB, context.req.param('id'));
    const totalStudents = new Set(enrollments.map((enrollment) => enrollment.student_id)).size;
    const distributionMap = new Map<string, number>();
    for (const enrollment of enrollments) {
      const label = String(enrollment.course_name || 'Course');
      distributionMap.set(label, (distributionMap.get(label) || 0) + 1);
    }
    return context.json({
      totalStudents,
      distribution: [...distributionMap.entries()].map(([name, students]) => ({ name, students })),
    });
  });

  app.get('/api/institutions/:id/reports/attendance', async (context) => {
    const records = await listAttendanceRecords(context.env.DB, context.req.param('id'));
    const total = records.length || 1;
    const present = records.filter((record) => String(record.status || '') === 'present').length;
    return context.json({
      rate: Math.round((present / total) * 100),
    });
  });

  app.notFound((context) => context.json({ error: 'Route not found' }, 404));

  app.onError((error) => {
    return jsonError(error instanceof Error ? error.message : 'Unhandled API error', 500);
  });

  return app;
}

export default createApp();
