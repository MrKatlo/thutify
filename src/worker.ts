/**
 * Cloudflare Worker — Zerot LMS API
 *
 * Auth model: Firebase verifies user credentials and issues an ID token. The browser
 * sends that token in `Authorization: Bearer <idToken>` on every protected call.
 * This worker verifies the token against Google's public certs and scopes every
 * D1 query by institutionId + uid.
 *
 * Data: Cloudflare D1 (binding DB).
 * Files: Cloudflare R2 (binding BUCKET).
 */

import type { D1Database, R2Bucket, ExecutionContext } from '@cloudflare/workers-types';
import firebaseConfig from '../firebase-applet-config.json';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ============================================================
// Firebase ID token verification (manual RS256 via Web Crypto)
// ============================================================

let cachedCerts: Record<string, CryptoKey> | null = null;
let cachedCertsExpiresAt = 0;

async function loadGoogleCerts(): Promise<Record<string, CryptoKey>> {
  const now = Date.now();
  if (cachedCerts && now < cachedCertsExpiresAt) return cachedCerts;

  const resp = await fetch(GOOGLE_CERTS_URL);
  if (!resp.ok) throw new Error('Failed to fetch Google certs');
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = /max-age=(\d+)/.exec(cacheControl);
  const ttlMs = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600 * 1000;

  const x509Map = (await resp.json()) as Record<string, string>;
  const imported: Record<string, CryptoKey> = {};
  for (const [kid, pem] of Object.entries(x509Map)) {
    imported[kid] = await importX509Pem(pem);
  }
  cachedCerts = imported;
  cachedCertsExpiresAt = now + ttlMs;
  return imported;
}

async function importX509Pem(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  // Extract the SubjectPublicKeyInfo from the DER-encoded cert (simple parse)
  const spki = extractSpkiFromCert(der);
  return crypto.subtle.importKey(
    'spki',
    spki.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

// Minimal ASN.1 SPKI extractor: walks the cert and finds the SubjectPublicKeyInfo.
function extractSpkiFromCert(der: Uint8Array): Uint8Array {
  // Cert = SEQUENCE { TBSCert, sigAlg, sig }
  // TBSCert contains version (optional), serial, sigAlg, issuer, validity, subject, SPKI, ...
  let i = 0;
  if (der[i++] !== 0x30) throw new Error('bad cert');
  i += readLengthSkip(der, i).headerLen;
  // Now inside Certificate. First field = TBSCertificate (SEQUENCE)
  if (der[i++] !== 0x30) throw new Error('bad tbs');
  const tbsLen = readLengthSkip(der, i);
  i += tbsLen.headerLen;
  const tbsEnd = i + tbsLen.len;
  // Skip [0] version if present
  if (der[i] === 0xa0) {
    i += 1;
    const vLen = readLengthSkip(der, i);
    i += vLen.headerLen + vLen.len;
  }
  // Skip serial INTEGER
  i = skipTLV(der, i);
  // Skip sigAlg SEQUENCE
  i = skipTLV(der, i);
  // Skip issuer SEQUENCE
  i = skipTLV(der, i);
  // Skip validity SEQUENCE
  i = skipTLV(der, i);
  // Skip subject SEQUENCE
  i = skipTLV(der, i);
  // SPKI SEQUENCE
  const spkiStart = i;
  i = skipTLV(der, i);
  return der.slice(spkiStart, i);
}

function readLengthSkip(buf: Uint8Array, off: number): { headerLen: number; len: number } {
  const first = buf[off];
  if ((first & 0x80) === 0) return { headerLen: 1, len: first };
  const n = first & 0x7f;
  let len = 0;
  for (let k = 1; k <= n; k++) len = (len << 8) | buf[off + k];
  return { headerLen: 1 + n, len };
}

function skipTLV(buf: Uint8Array, off: number): number {
  // tag byte
  off += 1;
  const l = readLengthSkip(buf, off);
  return off + l.headerLen + l.len;
}

interface VerifiedToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

async function verifyFirebaseIdToken(token: string): Promise<VerifiedToken | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    if (header.alg !== 'RS256') return null;
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;
    if (payload.iat > now + 60) return null;
    if (!payload.sub) return null;

    const certs = await loadGoogleCerts();
    const key = certs[header.kid];
    if (!key) return null;

    const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig.buffer as ArrayBuffer, signed.buffer as ArrayBuffer);
    if (!ok) return null;

    return {
      uid: payload.sub,
      email: payload.email || '',
      emailVerified: !!payload.email_verified,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (err) {
    console.error('Token verify error:', err);
    return null;
  }
}

async function requireAuth(request: Request): Promise<VerifiedToken | Response> {
  const header = request.headers.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/.exec(header);
  if (!match) return errorResponse('Missing bearer token', 401);
  const verified = await verifyFirebaseIdToken(match[1]);
  if (!verified) return errorResponse('Invalid or expired token', 401);
  return verified;
}

// ============================================================
// Helpers
// ============================================================

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

async function readJson<T = any>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

async function getInstitutionMembership(
  env: Env,
  uid: string,
  institutionId: string,
): Promise<{ role: string; status: string } | null> {
  const row = await env.DB.prepare(
    'SELECT role, status FROM institution_users WHERE user_id = ? AND institution_id = ? LIMIT 1',
  )
    .bind(uid, institutionId)
    .first<{ role: string; status: string }>();
  return row || null;
}

async function requireMembership(
  env: Env,
  uid: string,
  institutionId: string,
  allowedRoles: string[],
): Promise<{ role: string; status: string } | Response> {
  // Platform admins bypass.
  const pa = await env.DB.prepare('SELECT is_platform_admin FROM platform_users WHERE uid = ?')
    .bind(uid)
    .first<{ is_platform_admin: number }>();
  if (pa?.is_platform_admin) return { role: 'platform_admin', status: 'active' };

  const m = await getInstitutionMembership(env, uid, institutionId);
  if (!m) return errorResponse('Not a member of this institution', 403);
  if (m.status !== 'active') return errorResponse('Account not active', 403);
  if (allowedRoles.length && !allowedRoles.includes(m.role)) {
    return errorResponse('Insufficient role', 403);
  }
  return m;
}

// ============================================================
// Route dispatcher
// ============================================================

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+|\/+$/g, '');
    const segs = path.split('/');

    try {
      // Log requests in development
      console.log(`[Worker] ${request.method} ${url.pathname}`);

      if (segs[0] !== 'api') return errorResponse('Not found', 404);

      // Public routes (no auth)
      if (segs[1] === 'public') {
        return await routePublic(segs.slice(2), request, env);
      }

      // Auth required for the rest
      const auth = await requireAuth(request);
      if (auth instanceof Response) return auth;

      return await routeAuth(segs.slice(1), request, env, auth);
    } catch (err: any) {
      console.error('Worker error:', err);
      return errorResponse(err?.message || 'Internal error', 500);
    }
  },
};

// ============================================================
// PUBLIC ROUTES (no auth)
// ============================================================

async function routePublic(segs: string[], request: Request, env: Env): Promise<Response> {
  // GET /api/public/institutions/by-slug/:slug
  if (segs[0] === 'institutions' && segs[1] === 'by-slug' && segs[2] && request.method === 'GET') {
    const inst = await env.DB.prepare('SELECT * FROM institutions WHERE slug = ? LIMIT 1')
      .bind(segs[2])
      .first();
    if (!inst) return errorResponse('Institution not found', 404);
    return jsonResponse(inst);
  }

  // GET /api/public/institutions/search?q=
  if (segs[0] === 'institutions' && segs[1] === 'search' && request.method === 'GET') {
    const q = new URL(request.url).searchParams.get('q') || '';
    const rows = await env.DB.prepare(
      "SELECT id, name, slug, logo_url, country, institution_type FROM institutions WHERE status = 'active' AND (LOWER(name) LIKE ? OR LOWER(slug) LIKE ?) LIMIT 20",
    )
      .bind(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`)
      .all();
    return jsonResponse(rows.results);
  }

  // POST /api/public/password-reset { email, institution_id? }
  if (segs[0] === 'password-reset' && request.method === 'POST') {
    const body = await readJson<{ email: string; institutionId?: string }>(request);
    await env.DB.prepare(
      'INSERT INTO password_reset_requests (id, email, institution_id, ip_address, created_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(
        newId(),
        body.email,
        body.institutionId || null,
        request.headers.get('cf-connecting-ip') || null,
        nowIso(),
      )
      .run();
    return jsonResponse({ ok: true });
  }

  return errorResponse('Not found', 404);
}

// ============================================================
// AUTH ROUTES — segs[0] omitted ('api'), starts with the entity
// ============================================================

async function routeAuth(
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
): Promise<Response> {
  const method = request.method;

  // -------- PLATFORM USERS --------
  // GET  /api/me
  if (segs[0] === 'me' && method === 'GET') {
    let row = await env.DB.prepare('SELECT * FROM platform_users WHERE uid = ?')
      .bind(auth.uid)
      .first();
    if (!row) {
      // Auto-provision a platform_users row on first call.
      await env.DB.prepare(
        'INSERT INTO platform_users (uid, full_name, email, phone, photo_url, is_platform_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
      )
        .bind(auth.uid, auth.name || '', auth.email, '', auth.picture || null, nowIso(), nowIso())
        .run();
      row = await env.DB.prepare('SELECT * FROM platform_users WHERE uid = ?')
        .bind(auth.uid)
        .first();
    }
    return jsonResponse(row);
  }

  // PATCH /api/me
  if (segs[0] === 'me' && method === 'PATCH') {
    const body = await readJson<{ fullName?: string; phone?: string; photoUrl?: string }>(request);
    await env.DB.prepare(
      'UPDATE platform_users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), photo_url = COALESCE(?, photo_url), updated_at = ? WHERE uid = ?',
    )
      .bind(body.fullName || null, body.phone || null, body.photoUrl || null, nowIso(), auth.uid)
      .run();
    const row = await env.DB.prepare('SELECT * FROM platform_users WHERE uid = ?')
      .bind(auth.uid)
      .first();
    return jsonResponse(row);
  }

  // -------- INSTITUTIONS --------
  // POST /api/institutions  (anyone authenticated can create one — they become owner)
  if (segs[0] === 'institutions' && segs.length === 1 && method === 'POST') {
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO institutions (id, name, slug, logo_url, primary_color, country, institution_type, owner_user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
      .bind(
        id,
        body.name,
        body.slug,
        body.logoUrl || null,
        body.primaryColor || '#000000',
        body.country || null,
        body.institutionType,
        auth.uid,
        nowIso(),
        nowIso(),
      )
      .run();
    // Ensure platform_users row exists.
    await env.DB.prepare(
      'INSERT OR IGNORE INTO platform_users (uid, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(auth.uid, auth.name || '', auth.email, nowIso(), nowIso())
      .run();
    // Add the owner membership.
    await env.DB.prepare(
      `INSERT INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', 'active', ?, ?)`,
    )
      .bind(newId(), id, auth.uid, nowIso(), nowIso())
      .run();
    const inst = await env.DB.prepare('SELECT * FROM institutions WHERE id = ?').bind(id).first();
    return jsonResponse(inst);
  }

  // -------- INSTITUTION-SCOPED ROUTES --------
  // /api/institutions/:institutionId/...
  if (segs[0] === 'institutions' && segs[1]) {
    const institutionId = segs[1];
    const rest = segs.slice(2);
    return await routeInstitution(institutionId, rest, request, env, auth, method);
  }

  // -------- PLATFORM ADMIN --------
  if (segs[0] === 'platform' && method === 'GET') {
    const pa = await env.DB.prepare('SELECT is_platform_admin FROM platform_users WHERE uid = ?')
      .bind(auth.uid)
      .first<{ is_platform_admin: number }>();
    if (!pa?.is_platform_admin) return errorResponse('Forbidden', 403);

    if (segs[1] === 'institutions') {
      const rows = await env.DB.prepare(
        'SELECT * FROM institutions ORDER BY created_at DESC',
      ).all();
      return jsonResponse(rows.results);
    }
    if (segs[1] === 'stats') {
      const inst = await env.DB.prepare('SELECT COUNT(*) as c FROM institutions').first<{
        c: number;
      }>();
      const users = await env.DB.prepare('SELECT COUNT(*) as c FROM platform_users').first<{
        c: number;
      }>();
      const courses = await env.DB.prepare('SELECT COUNT(*) as c FROM courses').first<{
        c: number;
      }>();
      return jsonResponse({
        institutions: inst?.c || 0,
        users: users?.c || 0,
        courses: courses?.c || 0,
      });
    }
  }

  // -------- STORAGE / R2 --------
  if (segs[0] === 'storage') {
    return await routeStorage(segs.slice(1), request, env, auth);
  }

  return errorResponse('Not found', 404);
}

// ============================================================
// INSTITUTION-SCOPED ROUTES
// /api/institutions/:institutionId/<entity>/...
// ============================================================

async function routeInstitution(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  // GET /api/institutions/:id — fetch one institution
  if (segs.length === 0 && method === 'GET') {
    const inst = await env.DB.prepare('SELECT * FROM institutions WHERE id = ?')
      .bind(institutionId)
      .first();
    if (!inst) return errorResponse('Not found', 404);
    return jsonResponse(inst);
  }

  // PATCH /api/institutions/:id — owner/admin only
  if (segs.length === 0 && method === 'PATCH') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const fields: string[] = [];
    const vals: any[] = [];
    const map: Record<string, string> = {
      name: 'name',
      logoUrl: 'logo_url',
      primaryColor: 'primary_color',
      country: 'country',
      timezone: 'timezone',
      currency: 'currency',
      locale: 'locale',
      customDomain: 'custom_domain',
      stripePublishableKey: 'stripe_publishable_key',
      stripeSecretKey: 'stripe_secret_key',
      paystackPublicKey: 'paystack_public_key',
      paystackSecretKey: 'paystack_secret_key',
      smtpHost: 'smtp_host',
      smtpUser: 'smtp_user',
      smtpPassword: 'smtp_password',
      smtpFromEmail: 'smtp_from_email',
      status: 'status',
    };
    for (const [k, col] of Object.entries(map)) {
      if (body[k] !== undefined) {
        fields.push(`${col} = ?`);
        vals.push(body[k]);
      }
    }
    if (!fields.length) return errorResponse('No fields', 400);
    fields.push('updated_at = ?');
    vals.push(nowIso(), institutionId);
    await env.DB.prepare(`UPDATE institutions SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();
    const inst = await env.DB.prepare('SELECT * FROM institutions WHERE id = ?')
      .bind(institutionId)
      .first();
    return jsonResponse(inst);
  }

  // /api/institutions/:id/membership — current user's membership (used by useAuth)
  if (segs[0] === 'membership' && method === 'GET') {
    const m = await getInstitutionMembership(env, auth.uid, institutionId);
    return jsonResponse(m || null);
  }

  // /api/institutions/:id/users — list members (admin/owner)
  if (segs[0] === 'users' && segs.length === 1 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const roleFilter = new URL(request.url).searchParams.get('role');
    let sql = `SELECT iu.id as membership_id, iu.role, iu.status, iu.created_at,
                      pu.uid, pu.full_name, pu.email, pu.phone, pu.photo_url
               FROM institution_users iu
               JOIN platform_users pu ON pu.uid = iu.user_id
               WHERE iu.institution_id = ?`;
    const params: any[] = [institutionId];
    if (roleFilter) {
      sql += ' AND iu.role = ?';
      params.push(roleFilter);
    }
    sql += ' ORDER BY iu.created_at DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }

  // PATCH /api/institutions/:id/users/:userId  — admin/owner can change role/status
  if (segs[0] === 'users' && segs[1] && method === 'PATCH') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const userId = segs[1];
    const body = await readJson<{ role?: string; status?: string }>(request);
    const fields: string[] = [];
    const vals: any[] = [];
    if (body.role) {
      fields.push('role = ?');
      vals.push(body.role);
    }
    if (body.status) {
      fields.push('status = ?');
      vals.push(body.status);
    }
    if (!fields.length) return errorResponse('No fields', 400);
    fields.push('updated_at = ?');
    vals.push(nowIso(), institutionId, userId);
    await env.DB.prepare(
      `UPDATE institution_users SET ${fields.join(', ')} WHERE institution_id = ? AND user_id = ?`,
    )
      .bind(...vals)
      .run();
    return jsonResponse({ ok: true });
  }

  // DELETE /api/institutions/:id/users/:userId
  if (segs[0] === 'users' && segs[1] && method === 'DELETE') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    await env.DB.prepare(
      'DELETE FROM institution_users WHERE institution_id = ? AND user_id = ?',
    )
      .bind(institutionId, segs[1])
      .run();
    return jsonResponse({ ok: true });
  }

  // -------- INVITES --------
  if (segs[0] === 'invites') {
    return await routeInvites(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- STUDENT APPLICATIONS --------
  if (segs[0] === 'applications') {
    return await routeApplications(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- COURSES --------
  if (segs[0] === 'courses') {
    return await routeCourses(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- MODULES --------
  if (segs[0] === 'modules') {
    return await routeModules(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- LESSONS --------
  if (segs[0] === 'lessons') {
    return await routeLessons(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- ENROLLMENTS --------
  if (segs[0] === 'enrollments') {
    return await routeEnrollments(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- ASSIGNMENTS / SUBMISSIONS / QUIZZES --------
  if (segs[0] === 'assignments') {
    return await routeAssignments(institutionId, segs.slice(1), request, env, auth, method);
  }
  if (segs[0] === 'submissions') {
    return await routeSubmissions(institutionId, segs.slice(1), request, env, auth, method);
  }
  if (segs[0] === 'quizzes') {
    return await routeQuizzes(institutionId, segs.slice(1), request, env, auth, method);
  }
  if (segs[0] === 'quiz-attempts') {
    return await routeQuizAttempts(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- ATTENDANCE --------
  if (segs[0] === 'attendance') {
    return await routeAttendance(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- LIVE CLASSES --------
  if (segs[0] === 'live-classes') {
    return await routeLiveClasses(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- TIMETABLE --------
  if (segs[0] === 'timetable') {
    return await routeTimetable(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- ANNOUNCEMENTS --------
  if (segs[0] === 'announcements') {
    return await routeAnnouncements(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- DISCUSSIONS / MESSAGES / NOTIFICATIONS --------
  if (segs[0] === 'discussions') {
    return await routeDiscussions(institutionId, segs.slice(1), request, env, auth, method);
  }
  if (segs[0] === 'messages') {
    return await routeMessages(institutionId, segs.slice(1), request, env, auth, method);
  }
  if (segs[0] === 'notifications') {
    return await routeNotifications(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- FINANCE: PAYMENTS / INVOICES / REFUNDS --------
  if (segs[0] === 'payments') {
    return await routePayments(institutionId, segs.slice(1), request, env, auth, method);
  }
  if (segs[0] === 'invoices') {
    return await routeInvoices(institutionId, segs.slice(1), request, env, auth, method);
  }
  if (segs[0] === 'refunds') {
    return await routeRefunds(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- CERTIFICATES --------
  if (segs[0] === 'certificates') {
    return await routeCertificates(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- CONTENT LIBRARY --------
  if (segs[0] === 'content') {
    return await routeContentLibrary(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- CMS --------
  if (segs[0] === 'cms') {
    return await routeCms(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- REPORTS / DASHBOARD --------
  if (segs[0] === 'dashboard' && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    return await dashboardStats(institutionId, env);
  }
  if (segs[0] === 'reports') {
    return await routeReports(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- AUDIT LOG / LOGIN HISTORY --------
  if (segs[0] === 'audit' && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const rows = await env.DB.prepare(
      'SELECT * FROM audit_log WHERE institution_id = ? ORDER BY created_at DESC LIMIT 200',
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs[0] === 'login-history' && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const rows = await env.DB.prepare(
      'SELECT lh.* FROM login_history lh WHERE lh.institution_id = ? ORDER BY created_at DESC LIMIT 200',
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }

  // -------- PERMISSIONS --------
  if (segs[0] === 'permissions') {
    return await routePermissions(institutionId, segs.slice(1), request, env, auth, method);
  }

  // -------- STUDENT PROFILES / TEACHER PROFILES --------
  if (segs[0] === 'student-profiles') {
    return await routeStudentProfiles(institutionId, segs.slice(1), request, env, auth, method);
  }
  if (segs[0] === 'teacher-profiles') {
    return await routeTeacherProfiles(institutionId, segs.slice(1), request, env, auth, method);
  }

  return errorResponse('Not found', 404);
}

// ============================================================
// Sub-routers (concise CRUD impls)
// ============================================================

async function routeCourses(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  // GET /courses
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, []);
    if (m instanceof Response) return m;
    let sql = 'SELECT * FROM courses WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (m.role === 'teacher') {
      sql += ' AND teacher_id = ?';
      params.push(auth.uid);
    } else if (m.role === 'student') {
      // Students only see courses they're enrolled in
      sql = `SELECT c.* FROM courses c
             JOIN enrollments e ON e.course_id = c.id
             WHERE c.institution_id = ? AND e.student_id = ?
             ORDER BY c.created_at DESC`;
      params.push(auth.uid);
    } else {
      sql += ' ORDER BY created_at DESC';
    }
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  // POST /courses
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO courses (id, institution_id, title, description, teacher_id, category, thumbnail_url, level, status, fee, max_students, start_date, end_date, syllabus, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.title,
        body.description || '',
        body.teacherId || auth.uid,
        body.category || null,
        body.thumbnailUrl || null,
        body.level || null,
        body.status || 'draft',
        body.fee || 0,
        body.maxStudents || null,
        body.startDate || null,
        body.endDate || null,
        body.syllabus || null,
        nowIso(),
        nowIso(),
      )
      .run();
    const row = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();
    return jsonResponse(row);
  }
  // GET /courses/:id
  if (segs[0] && segs.length === 1 && method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT * FROM courses WHERE id = ? AND institution_id = ?',
    )
      .bind(segs[0], institutionId)
      .first();
    if (!row) return errorResponse('Not found', 404);
    return jsonResponse(row);
  }
  // PATCH /courses/:id
  if (segs[0] && segs.length === 1 && method === 'PATCH') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const map: Record<string, string> = {
      title: 'title',
      description: 'description',
      teacherId: 'teacher_id',
      category: 'category',
      thumbnailUrl: 'thumbnail_url',
      level: 'level',
      status: 'status',
      fee: 'fee',
      maxStudents: 'max_students',
      startDate: 'start_date',
      endDate: 'end_date',
      syllabus: 'syllabus',
    };
    const fields: string[] = [];
    const vals: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (body[k] !== undefined) {
        fields.push(`${col} = ?`);
        vals.push(body[k]);
      }
    }
    if (!fields.length) return errorResponse('No fields', 400);
    fields.push('updated_at = ?');
    vals.push(nowIso(), segs[0], institutionId);
    await env.DB.prepare(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`,
    )
      .bind(...vals)
      .run();
    const row = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(segs[0]).first();
    return jsonResponse(row);
  }
  // DELETE /courses/:id
  if (segs[0] && segs.length === 1 && method === 'DELETE') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    await env.DB.prepare('DELETE FROM courses WHERE id = ? AND institution_id = ?')
      .bind(segs[0], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeModules(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const courseId = new URL(request.url).searchParams.get('course_id');
    if (!courseId) return errorResponse('course_id required', 400);
    const rows = await env.DB.prepare(
      `SELECT m.* FROM modules m
       JOIN courses c ON c.id = m.course_id
       WHERE m.course_id = ? AND c.institution_id = ?
       ORDER BY m.order_index, m.created_at`,
    )
      .bind(courseId, institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      'INSERT INTO modules (id, course_id, title, description, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(id, body.courseId, body.title, body.description || '', body.orderIndex || 0, nowIso(), nowIso())
      .run();
    const row = await env.DB.prepare('SELECT * FROM modules WHERE id = ?').bind(id).first();
    return jsonResponse(row);
  }
  if (segs[0] && method === 'PATCH') {
    const body = await readJson<any>(request);
    const fields: string[] = [];
    const vals: any[] = [];
    if (body.title !== undefined) {
      fields.push('title = ?');
      vals.push(body.title);
    }
    if (body.description !== undefined) {
      fields.push('description = ?');
      vals.push(body.description);
    }
    if (body.orderIndex !== undefined) {
      fields.push('order_index = ?');
      vals.push(body.orderIndex);
    }
    if (!fields.length) return errorResponse('No fields', 400);
    fields.push('updated_at = ?');
    vals.push(nowIso(), segs[0]);
    await env.DB.prepare(`UPDATE modules SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();
    return jsonResponse({ ok: true });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM modules WHERE id = ?').bind(segs[0]).run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeLessons(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const url = new URL(request.url);
    const moduleId = url.searchParams.get('module_id');
    const courseId = url.searchParams.get('course_id');
    let sql = `SELECT l.* FROM lessons l
               JOIN courses c ON c.id = l.course_id
               WHERE c.institution_id = ?`;
    const params: any[] = [institutionId];
    if (moduleId) {
      sql += ' AND l.module_id = ?';
      params.push(moduleId);
    }
    if (courseId) {
      sql += ' AND l.course_id = ?';
      params.push(courseId);
    }
    sql += ' ORDER BY l.order_index, l.created_at';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO lessons (id, module_id, course_id, title, content, video_r2_key, duration_minutes, order_index, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        body.moduleId,
        body.courseId,
        body.title,
        body.content || '',
        body.videoR2Key || null,
        body.durationMinutes || null,
        body.orderIndex || 0,
        body.published ? 1 : 0,
        nowIso(),
        nowIso(),
      )
      .run();
    const row = await env.DB.prepare('SELECT * FROM lessons WHERE id = ?').bind(id).first();
    return jsonResponse(row);
  }
  if (segs[0] && segs.length === 1 && method === 'GET') {
    const row = await env.DB.prepare(
      `SELECT l.* FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = ? AND c.institution_id = ?`,
    )
      .bind(segs[0], institutionId)
      .first();
    if (!row) return errorResponse('Not found', 404);
    return jsonResponse(row);
  }
  if (segs[0] && segs.length === 1 && method === 'PATCH') {
    const body = await readJson<any>(request);
    const map: Record<string, string> = {
      title: 'title',
      content: 'content',
      videoR2Key: 'video_r2_key',
      durationMinutes: 'duration_minutes',
      orderIndex: 'order_index',
      published: 'published',
    };
    const fields: string[] = [];
    const vals: any[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (body[k] !== undefined) {
        fields.push(`${col} = ?`);
        vals.push(k === 'published' ? (body[k] ? 1 : 0) : body[k]);
      }
    }
    if (!fields.length) return errorResponse('No fields', 400);
    fields.push('updated_at = ?');
    vals.push(nowIso(), segs[0]);
    await env.DB.prepare(`UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();
    return jsonResponse({ ok: true });
  }
  if (segs[0] && segs.length === 1 && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM lessons WHERE id = ?').bind(segs[0]).run();
    return jsonResponse({ ok: true });
  }
  // POST /lessons/:id/progress  — student marks complete
  if (segs[0] && segs[1] === 'progress' && method === 'POST') {
    const body = await readJson<{ completed?: boolean; resumeSeconds?: number }>(request);
    const id = newId();
    const existing = await env.DB.prepare(
      'SELECT id FROM lesson_progress WHERE lesson_id = ? AND student_id = ?',
    )
      .bind(segs[0], auth.uid)
      .first<{ id: string }>();
    if (existing) {
      await env.DB.prepare(
        `UPDATE lesson_progress SET completed = ?, resume_position_seconds = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(
          body.completed ? 1 : 0,
          body.resumeSeconds || 0,
          body.completed ? nowIso() : null,
          nowIso(),
          existing.id,
        )
        .run();
    } else {
      await env.DB.prepare(
        `INSERT INTO lesson_progress (id, lesson_id, student_id, institution_id, completed, resume_position_seconds, completed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          segs[0],
          auth.uid,
          institutionId,
          body.completed ? 1 : 0,
          body.resumeSeconds || 0,
          body.completed ? nowIso() : null,
          nowIso(),
        )
        .run();
    }
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeEnrollments(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id') || auth.uid;
    const courseId = url.searchParams.get('course_id');
    let sql = 'SELECT * FROM enrollments WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (courseId) {
      sql += ' AND course_id = ?';
      params.push(courseId);
    } else {
      sql += ' AND student_id = ?';
      params.push(studentId);
    }
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const body = await readJson<{ studentId: string; courseId: string }>(request);
    const id = newId();
    await env.DB.prepare(
      'INSERT INTO enrollments (id, institution_id, course_id, student_id, status, enrolled_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        id,
        institutionId,
        body.courseId,
        body.studentId,
        'active',
        nowIso(),
        nowIso(),
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM enrollments WHERE id = ? AND institution_id = ?')
      .bind(segs[0], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeInvites(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const rows = await env.DB.prepare(
      'SELECT * FROM user_invites WHERE institution_id = ? ORDER BY created_at DESC',
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await env.DB.prepare(
      `INSERT INTO user_invites (id, institution_id, email, full_name, role, assigned_courses, token, status, expires_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.email,
        body.fullName || '',
        body.role,
        body.assignedCourses ? JSON.stringify(body.assignedCourses) : null,
        token,
        expiresAt,
        auth.uid,
        nowIso(),
      )
      .run();
    return jsonResponse({ id, token });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM user_invites WHERE id = ? AND institution_id = ?')
      .bind(segs[0], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeApplications(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  // POST is allowed by any authed user (used by /student-signup)
  if (segs.length === 0 && method === 'POST') {
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO student_applications (id, institution_id, user_id, full_name, email, phone, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
       ON CONFLICT(institution_id, user_id) DO UPDATE SET full_name = excluded.full_name, phone = excluded.phone, updated_at = excluded.updated_at`,
    )
      .bind(id, institutionId, auth.uid, body.fullName, body.email || auth.email, body.phone || '', nowIso(), nowIso())
      .run();
    return jsonResponse({ id });
  }
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const rows = await env.DB.prepare(
      'SELECT * FROM student_applications WHERE institution_id = ? ORDER BY created_at DESC',
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  // PATCH /applications/:id { status, action: 'approve' | 'reject' }
  if (segs[0] && method === 'PATCH') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<{ status: 'approved' | 'rejected' }>(request);
    const app = await env.DB.prepare(
      'SELECT * FROM student_applications WHERE id = ? AND institution_id = ?',
    )
      .bind(segs[0], institutionId)
      .first<any>();
    if (!app) return errorResponse('Not found', 404);
    await env.DB.prepare(
      'UPDATE student_applications SET status = ?, updated_at = ? WHERE id = ?',
    )
      .bind(body.status, nowIso(), segs[0])
      .run();
    if (body.status === 'approved') {
      // Create institution_users membership row as student
      await env.DB.prepare(
        `INSERT OR IGNORE INTO institution_users (id, institution_id, user_id, role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'student', 'active', ?, ?)`,
      )
        .bind(newId(), institutionId, app.user_id, nowIso(), nowIso())
        .run();
    }
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeAssignments(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const courseId = new URL(request.url).searchParams.get('course_id');
    let sql = 'SELECT * FROM assignments WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (courseId) {
      sql += ' AND course_id = ?';
      params.push(courseId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO assignments (id, institution_id, course_id, title, description, teacher_id, file_url, due_date, total_points, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.courseId,
        body.title,
        body.description || '',
        auth.uid,
        body.fileUrl || null,
        body.dueDate || null,
        body.totalPoints || 100,
        nowIso(),
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] && method === 'PATCH') {
    const body = await readJson<any>(request);
    const fields: string[] = [];
    const vals: any[] = [];
    for (const [k, col] of Object.entries({
      title: 'title',
      description: 'description',
      fileUrl: 'file_url',
      dueDate: 'due_date',
      totalPoints: 'total_points',
    })) {
      if (body[k] !== undefined) {
        fields.push(`${col} = ?`);
        vals.push(body[k]);
      }
    }
    if (!fields.length) return errorResponse('No fields', 400);
    fields.push('updated_at = ?');
    vals.push(nowIso(), segs[0]);
    await env.DB.prepare(`UPDATE assignments SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();
    return jsonResponse({ ok: true });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM assignments WHERE id = ?').bind(segs[0]).run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeSubmissions(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const url = new URL(request.url);
    const assignmentId = url.searchParams.get('assignment_id');
    const studentId = url.searchParams.get('student_id');
    let sql = 'SELECT * FROM submissions WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (assignmentId) {
      sql += ' AND assignment_id = ?';
      params.push(assignmentId);
    }
    if (studentId) {
      sql += ' AND student_id = ?';
      params.push(studentId);
    }
    sql += ' ORDER BY submitted_at DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  // POST /submissions  — student creates/updates their submission
  if (segs.length === 0 && method === 'POST') {
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO submissions (id, assignment_id, student_id, institution_id, file_url, notes, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
       ON CONFLICT(assignment_id, student_id) DO UPDATE SET file_url = excluded.file_url, notes = excluded.notes, submitted_at = excluded.submitted_at, status = 'pending'`,
    )
      .bind(id, body.assignmentId, auth.uid, institutionId, body.fileUrl || null, body.notes || null, nowIso())
      .run();
    return jsonResponse({ id });
  }
  // PATCH /submissions/:id — teacher grades
  if (segs[0] && method === 'PATCH') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<{ grade: number; feedback?: string }>(request);
    await env.DB.prepare(
      `UPDATE submissions SET grade = ?, feedback = ?, status = 'graded', graded_at = ?, graded_by = ? WHERE id = ?`,
    )
      .bind(body.grade, body.feedback || null, nowIso(), auth.uid, segs[0])
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeQuizzes(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, []);
    if (m instanceof Response) return m;
    let sql = 'SELECT * FROM quizzes WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (m.role === 'student') {
      sql += " AND status = 'published'";
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO quizzes (id, institution_id, course_id, teacher_id, title, time_limit_minutes, questions, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.courseId,
        auth.uid,
        body.title,
        body.timeLimitMinutes || 15,
        JSON.stringify(body.questions || []),
        body.status || 'published',
        nowIso(),
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM quizzes WHERE id = ?').bind(segs[0]).run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeQuizAttempts(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const studentId = new URL(request.url).searchParams.get('student_id') || auth.uid;
    const rows = await env.DB.prepare(
      'SELECT * FROM quiz_attempts WHERE institution_id = ? AND student_id = ? ORDER BY submitted_at DESC',
    )
      .bind(institutionId, studentId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO quiz_attempts (id, quiz_id, student_id, institution_id, answers, score, questions_snapshot, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
    )
      .bind(
        id,
        body.quizId,
        auth.uid,
        institutionId,
        JSON.stringify(body.answers),
        body.score,
        JSON.stringify(body.questions || []),
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  return errorResponse('Not found', 404);
}

async function routeAttendance(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  // GET /attendance/sessions?course_id=
  if (segs[0] === 'sessions' && method === 'GET') {
    const courseId = new URL(request.url).searchParams.get('course_id');
    if (!courseId) return errorResponse('course_id required', 400);
    const rows = await env.DB.prepare(
      'SELECT * FROM attendance_sessions WHERE institution_id = ? AND course_id = ? ORDER BY session_date DESC',
    )
      .bind(institutionId, courseId)
      .all();
    return jsonResponse(rows.results);
  }
  // POST /attendance/sessions
  if (segs[0] === 'sessions' && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO attendance_sessions (id, institution_id, course_id, teacher_id, session_date, topic, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(course_id, session_date) DO UPDATE SET topic = excluded.topic`,
    )
      .bind(id, institutionId, body.courseId, auth.uid, body.sessionDate, body.topic || null, nowIso())
      .run();
    const row = await env.DB.prepare(
      'SELECT * FROM attendance_sessions WHERE course_id = ? AND session_date = ?',
    )
      .bind(body.courseId, body.sessionDate)
      .first();
    return jsonResponse(row);
  }
  // GET /attendance/records?session_id= or ?student_id=
  if (segs[0] === 'records' && method === 'GET') {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const studentId = url.searchParams.get('student_id');
    let sql = 'SELECT * FROM attendance_records WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (sessionId) {
      sql += ' AND session_id = ?';
      params.push(sessionId);
    }
    if (studentId) {
      sql += ' AND student_id = ?';
      params.push(studentId);
    }
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  // POST /attendance/records  — bulk mark
  if (segs[0] === 'records' && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<{ sessionId: string; studentId: string; status: string }>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO attendance_records (id, session_id, institution_id, student_id, status, marked_by, marked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id, student_id) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, marked_at = excluded.marked_at`,
    )
      .bind(id, body.sessionId, institutionId, body.studentId, body.status, auth.uid, nowIso())
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeLiveClasses(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, []);
    if (m instanceof Response) return m;
    let sql = 'SELECT * FROM live_classes WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (m.role === 'teacher') {
      sql += ' AND teacher_id = ?';
      params.push(auth.uid);
    } else if (m.role === 'student') {
      sql = `SELECT lc.* FROM live_classes lc
             JOIN enrollments e ON e.course_id = lc.course_id
             WHERE lc.institution_id = ? AND e.student_id = ?`;
      params.push(auth.uid);
    }
    sql += ' ORDER BY scheduled_at DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO live_classes (id, institution_id, course_id, teacher_id, title, scheduled_at, duration_minutes, platform, meeting_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.courseId,
        auth.uid,
        body.title,
        body.scheduledAt,
        body.durationMinutes || 60,
        body.platform || 'zoom',
        body.meetingUrl,
        nowIso(),
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM live_classes WHERE id = ? AND institution_id = ?')
      .bind(segs[0], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeTimetable(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const teacherId = new URL(request.url).searchParams.get('teacher_id') || auth.uid;
    const rows = await env.DB.prepare(
      `SELECT t.*, c.title as course_title FROM timetable_entries t
       LEFT JOIN courses c ON c.id = t.course_id
       WHERE t.institution_id = ? AND t.teacher_id = ?
       ORDER BY t.day_of_week, t.start_time`,
    )
      .bind(institutionId, teacherId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO timetable_entries (id, institution_id, course_id, teacher_id, day_of_week, start_time, end_time, room, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.courseId,
        body.teacherId || auth.uid,
        body.dayOfWeek,
        body.startTime,
        body.endTime,
        body.room || null,
        nowIso(),
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM timetable_entries WHERE id = ? AND institution_id = ?')
      .bind(segs[0], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeAnnouncements(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const courseId = new URL(request.url).searchParams.get('course_id');
    let sql = 'SELECT * FROM announcements WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (courseId) {
      sql += ' AND (course_id IS NULL OR course_id = ?)';
      params.push(courseId);
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin', 'teacher']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    const pu = await env.DB.prepare('SELECT full_name FROM platform_users WHERE uid = ?')
      .bind(auth.uid)
      .first<{ full_name: string }>();
    await env.DB.prepare(
      `INSERT INTO announcements (id, institution_id, course_id, content, author_id, author_name, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.courseId || null,
        body.content,
        auth.uid,
        pu?.full_name || auth.email,
        body.priority || 'normal',
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM announcements WHERE id = ? AND institution_id = ?')
      .bind(segs[0], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeDiscussions(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const courseId = new URL(request.url).searchParams.get('course_id');
    let sql = 'SELECT * FROM discussions WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (courseId) {
      sql += ' AND course_id = ?';
      params.push(courseId);
    }
    sql += ' ORDER BY updated_at DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO discussions (id, institution_id, course_id, title, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, institutionId, body.courseId, body.title, auth.uid, nowIso(), nowIso())
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] === 'posts' && method === 'GET') {
    const discussionId = new URL(request.url).searchParams.get('discussion_id');
    if (!discussionId) return errorResponse('discussion_id required', 400);
    const rows = await env.DB.prepare(
      'SELECT * FROM discussion_posts WHERE discussion_id = ? ORDER BY created_at',
    )
      .bind(discussionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs[0] === 'posts' && method === 'POST') {
    const body = await readJson<{ discussionId: string; content: string }>(request);
    const id = newId();
    const pu = await env.DB.prepare('SELECT full_name FROM platform_users WHERE uid = ?')
      .bind(auth.uid)
      .first<{ full_name: string }>();
    await env.DB.prepare(
      `INSERT INTO discussion_posts (id, discussion_id, author_id, author_name, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, body.discussionId, auth.uid, pu?.full_name || auth.email, body.content, nowIso())
      .run();
    await env.DB.prepare('UPDATE discussions SET updated_at = ? WHERE id = ?')
      .bind(nowIso(), body.discussionId)
      .run();
    return jsonResponse({ id });
  }
  return errorResponse('Not found', 404);
}

async function routeMessages(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const url = new URL(request.url);
    const peerId = url.searchParams.get('peer_id');
    let sql =
      'SELECT * FROM messages WHERE institution_id = ? AND (from_user_id = ? OR to_user_id = ?)';
    const params: any[] = [institutionId, auth.uid, auth.uid];
    if (peerId) {
      sql += ' AND (from_user_id = ? OR to_user_id = ?)';
      params.push(peerId, peerId);
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const body = await readJson<{ toUserId: string; content: string }>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO messages (id, institution_id, from_user_id, to_user_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, institutionId, auth.uid, body.toUserId, body.content, nowIso())
      .run();
    return jsonResponse({ id });
  }
  return errorResponse('Not found', 404);
}

async function routeNotifications(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM notifications WHERE institution_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 50',
    )
      .bind(institutionId, auth.uid)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs[0] === 'mark-read' && method === 'POST') {
    await env.DB.prepare(
      'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL',
    )
      .bind(nowIso(), auth.uid)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routePayments(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, []);
    if (m instanceof Response) return m;
    const studentId = new URL(request.url).searchParams.get('student_id');
    let sql = 'SELECT * FROM payments WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (m.role === 'student') {
      sql += ' AND student_id = ?';
      params.push(auth.uid);
    } else if (studentId) {
      sql += ' AND student_id = ?';
      params.push(studentId);
    }
    sql += ' ORDER BY payment_date DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO payments (id, institution_id, student_id, course_id, amount_paid, total_fee, balance, currency, payment_method, reference_number, status, payment_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.studentId,
        body.courseId || null,
        body.amountPaid,
        body.totalFee,
        body.balance,
        body.currency || 'USD',
        body.paymentMethod || 'cash',
        body.referenceNumber || null,
        body.status || 'paid',
        body.paymentDate || nowIso(),
        body.notes || null,
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  return errorResponse('Not found', 404);
}

async function routeInvoices(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, []);
    if (m instanceof Response) return m;
    let sql = 'SELECT * FROM invoices WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (m.role === 'student') {
      sql += ' AND student_id = ?';
      params.push(auth.uid);
    }
    sql += ' ORDER BY issued_at DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    const count = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM invoices WHERE institution_id = ?',
    )
      .bind(institutionId)
      .first<{ c: number }>();
    const invoiceNumber = `INV-${String((count?.c || 0) + 1).padStart(5, '0')}`;
    await env.DB.prepare(
      `INSERT INTO invoices (id, institution_id, student_id, course_id, invoice_number, amount, currency, due_date, status, issued_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    )
      .bind(
        id,
        institutionId,
        body.studentId,
        body.courseId || null,
        invoiceNumber,
        body.amount,
        body.currency || 'USD',
        body.dueDate || null,
        nowIso(),
      )
      .run();
    return jsonResponse({ id, invoiceNumber });
  }
  return errorResponse('Not found', 404);
}

async function routeRefunds(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const rows = await env.DB.prepare(
      'SELECT * FROM refunds WHERE institution_id = ? ORDER BY created_at DESC',
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO refunds (id, institution_id, payment_id, student_id, amount, reason, status, requested_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
      .bind(id, institutionId, body.paymentId, body.studentId, body.amount, body.reason || null, auth.uid, nowIso())
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] && method === 'PATCH') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<{ status: string }>(request);
    await env.DB.prepare(
      `UPDATE refunds SET status = ?, approved_by = ?, processed_at = ? WHERE id = ? AND institution_id = ?`,
    )
      .bind(body.status, auth.uid, body.status === 'processed' ? nowIso() : null, segs[0], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeCertificates(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, []);
    if (m instanceof Response) return m;
    let sql = 'SELECT * FROM certificates WHERE institution_id = ?';
    const params: any[] = [institutionId];
    if (m.role === 'student') {
      sql += ' AND student_id = ?';
      params.push(auth.uid);
    }
    sql += ' ORDER BY issued_date DESC';
    const rows = await env.DB.prepare(sql)
      .bind(...params)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
    await env.DB.prepare(
      `INSERT INTO certificates (id, institution_id, student_id, course_id, certificate_r2_key, verification_code, status, issued_date)
       VALUES (?, ?, ?, ?, ?, ?, 'issued', ?)`,
    )
      .bind(id, institutionId, body.studentId, body.courseId, body.certificateR2Key || null, code, nowIso())
      .run();
    return jsonResponse({ id, verificationCode: code });
  }
  return errorResponse('Not found', 404);
}

async function routeContentLibrary(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM content_library WHERE institution_id = ? ORDER BY created_at DESC',
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const body = await readJson<any>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO content_library (id, institution_id, title, description, r2_key, file_type, file_size, category, uploader_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        institutionId,
        body.title,
        body.description || null,
        body.r2Key,
        body.fileType,
        body.fileSize || null,
        body.category || null,
        auth.uid,
        nowIso(),
      )
      .run();
    return jsonResponse({ id });
  }
  if (segs[0] && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM content_library WHERE id = ? AND institution_id = ?')
      .bind(segs[0], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeCms(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  const table = segs[0]; // 'pages' | 'faqs' | 'banners'
  if (!['pages', 'faqs', 'banners'].includes(table)) return errorResponse('Unknown CMS entity', 404);
  const tableName = table === 'pages' ? 'cms_pages' : table;

  if (segs.length === 1 && method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT * FROM ${tableName} WHERE institution_id = ? ORDER BY created_at DESC`,
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 1 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    const id = newId();
    if (table === 'pages') {
      await env.DB.prepare(
        'INSERT INTO cms_pages (id, institution_id, slug, title, body, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          id,
          institutionId,
          body.slug,
          body.title,
          body.body || '',
          body.published ? 1 : 0,
          nowIso(),
          nowIso(),
        )
        .run();
    } else if (table === 'faqs') {
      await env.DB.prepare(
        'INSERT INTO faqs (id, institution_id, question, answer, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(id, institutionId, body.question, body.answer, body.orderIndex || 0, nowIso())
        .run();
    } else {
      await env.DB.prepare(
        'INSERT INTO banners (id, institution_id, title, body, image_r2_key, link_url, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          id,
          institutionId,
          body.title,
          body.body || null,
          body.imageR2Key || null,
          body.linkUrl || null,
          body.active ? 1 : 0,
          nowIso(),
        )
        .run();
    }
    return jsonResponse({ id });
  }
  if (segs[1] && method === 'DELETE') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    await env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ? AND institution_id = ?`)
      .bind(segs[1], institutionId)
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routePermissions(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs.length === 0 && method === 'GET') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const rows = await env.DB.prepare(
      'SELECT * FROM role_permissions WHERE institution_id = ?',
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs.length === 0 && method === 'POST') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<{ role: string; permissionKey: string; allowed: boolean }>(request);
    const id = newId();
    await env.DB.prepare(
      `INSERT INTO role_permissions (id, institution_id, role, permission_key, allowed, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(institution_id, role, permission_key) DO UPDATE SET allowed = excluded.allowed`,
    )
      .bind(id, institutionId, body.role, body.permissionKey, body.allowed ? 1 : 0, nowIso())
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeStudentProfiles(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs[0] && method === 'GET') {
    const row = await env.DB.prepare(
      `SELECT sp.*, pu.full_name, pu.email, pu.phone as platform_phone, pu.photo_url
       FROM student_profiles sp
       JOIN platform_users pu ON pu.uid = sp.user_id
       WHERE sp.user_id = ? AND sp.institution_id = ?`,
    )
      .bind(segs[0], institutionId)
      .first();
    return jsonResponse(row || null);
  }
  if (segs[0] && method === 'PUT') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    await env.DB.prepare(
      `INSERT INTO student_profiles (user_id, institution_id, student_number, phone, payment_status, total_fee, amount_paid, balance, academic_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, institution_id) DO UPDATE SET
         student_number = excluded.student_number,
         phone = excluded.phone,
         payment_status = excluded.payment_status,
         total_fee = excluded.total_fee,
         amount_paid = excluded.amount_paid,
         balance = excluded.balance,
         academic_status = excluded.academic_status,
         updated_at = excluded.updated_at`,
    )
      .bind(
        segs[0],
        institutionId,
        body.studentNumber,
        body.phone || '',
        body.paymentStatus || 'unpaid',
        body.totalFee || 0,
        body.amountPaid || 0,
        body.balance || 0,
        body.academicStatus || 'active',
        nowIso(),
        nowIso(),
      )
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

async function routeTeacherProfiles(
  institutionId: string,
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  if (segs[0] && method === 'GET') {
    const row = await env.DB.prepare(
      `SELECT tp.*, pu.full_name, pu.email, pu.photo_url FROM teacher_profiles tp
       JOIN platform_users pu ON pu.uid = tp.user_id
       WHERE tp.user_id = ? AND tp.institution_id = ?`,
    )
      .bind(segs[0], institutionId)
      .first();
    return jsonResponse(row || null);
  }
  if (segs[0] && method === 'PUT') {
    const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
    if (m instanceof Response) return m;
    const body = await readJson<any>(request);
    await env.DB.prepare(
      `INSERT INTO teacher_profiles (user_id, institution_id, employee_number, phone, department, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, institution_id) DO UPDATE SET
         employee_number = excluded.employee_number,
         phone = excluded.phone,
         department = excluded.department,
         updated_at = excluded.updated_at`,
    )
      .bind(
        segs[0],
        institutionId,
        body.employeeNumber,
        body.phone || '',
        body.department || '',
        nowIso(),
        nowIso(),
      )
      .run();
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}

// ============================================================
// DASHBOARD STATS
// ============================================================

async function dashboardStats(institutionId: string, env: Env): Promise<Response> {
  const [students, teachers, courses, activeEnrollments, payments, lateInvoices] =
    await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) as c FROM institution_users WHERE institution_id = ? AND role = 'student' AND status = 'active'",
      )
        .bind(institutionId)
        .first<{ c: number }>(),
      env.DB.prepare(
        "SELECT COUNT(*) as c FROM institution_users WHERE institution_id = ? AND role = 'teacher' AND status = 'active'",
      )
        .bind(institutionId)
        .first<{ c: number }>(),
      env.DB.prepare("SELECT COUNT(*) as c FROM courses WHERE institution_id = ? AND status = 'active'")
        .bind(institutionId)
        .first<{ c: number }>(),
      env.DB.prepare(
        "SELECT COUNT(*) as c FROM enrollments WHERE institution_id = ? AND status = 'active'",
      )
        .bind(institutionId)
        .first<{ c: number }>(),
      env.DB.prepare(
        "SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE institution_id = ? AND status = 'paid'",
      )
        .bind(institutionId)
        .first<{ total: number }>(),
      env.DB.prepare(
        "SELECT COUNT(*) as c FROM invoices WHERE institution_id = ? AND status = 'overdue'",
      )
        .bind(institutionId)
        .first<{ c: number }>(),
    ]);
  return jsonResponse({
    students: students?.c || 0,
    teachers: teachers?.c || 0,
    courses: courses?.c || 0,
    activeEnrollments: activeEnrollments?.c || 0,
    totalRevenue: payments?.total || 0,
    overdueInvoices: lateInvoices?.c || 0,
  });
}

// ============================================================
// REPORTS
// ============================================================

async function routeReports(
  institutionId: string,
  segs: string[],
  _request: Request,
  env: Env,
  auth: VerifiedToken,
  method: string,
): Promise<Response> {
  const m = await requireMembership(env, auth.uid, institutionId, ['owner', 'admin']);
  if (m instanceof Response) return m;
  if (method !== 'GET') return errorResponse('Not found', 404);

  if (segs[0] === 'financial') {
    const monthly = await env.DB.prepare(
      `SELECT strftime('%Y-%m', payment_date) as month, SUM(amount_paid) as total
       FROM payments WHERE institution_id = ? AND status = 'paid'
       GROUP BY month ORDER BY month DESC LIMIT 12`,
    )
      .bind(institutionId)
      .all();
    return jsonResponse(monthly.results);
  }
  if (segs[0] === 'attendance') {
    const rows = await env.DB.prepare(
      `SELECT a.status, COUNT(*) as c FROM attendance_records a WHERE a.institution_id = ? GROUP BY a.status`,
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  if (segs[0] === 'enrollment') {
    const rows = await env.DB.prepare(
      `SELECT c.id, c.title, COUNT(e.id) as enrolled FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
       WHERE c.institution_id = ? GROUP BY c.id ORDER BY enrolled DESC`,
    )
      .bind(institutionId)
      .all();
    return jsonResponse(rows.results);
  }
  return errorResponse('Unknown report', 404);
}

// ============================================================
// STORAGE / R2
// ============================================================

async function routeStorage(
  segs: string[],
  request: Request,
  env: Env,
  auth: VerifiedToken,
): Promise<Response> {
  const method = request.method;
  // POST /api/storage/upload  multipart { file, key }
  if (segs[0] === 'upload' && method === 'POST') {
    const formData = await request.formData();
    const file = formData.get('file') as unknown as File;
    if (!file) return errorResponse('file required', 400);
    const key = (formData.get('key') as string) || `uploads/${auth.uid}/${Date.now()}-${file.name}`;
    const contentType = file.type || 'application/octet-stream';
    await env.BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType },
      customMetadata: { uploadedBy: auth.uid },
    });
    return jsonResponse({ key, size: file.size, contentType });
  }
  // GET /api/storage/object?key=
  if (segs[0] === 'object' && method === 'GET') {
    const key = new URL(request.url).searchParams.get('key');
    if (!key) return errorResponse('key required', 400);
    const obj = await env.BUCKET.get(key);
    if (!obj) return errorResponse('Not found', 404);
    return new Response(obj.body as any, {
      headers: {
        ...corsHeaders,
        'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }
  // DELETE /api/storage/object?key=
  if (segs[0] === 'object' && method === 'DELETE') {
    const key = new URL(request.url).searchParams.get('key');
    if (!key) return errorResponse('key required', 400);
    await env.BUCKET.delete(key);
    return jsonResponse({ ok: true });
  }
  return errorResponse('Not found', 404);
}
