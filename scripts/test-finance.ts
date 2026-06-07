import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import initSqlJs from 'sql.js';
import { createApp } from '../src/worker.js';

type JsonRecord = Record<string, unknown>;

// --- MOCKS ---

class FakeD1PreparedStatement {
  constructor(private readonly db: any, private readonly sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]) { this.params = params; return this; }
  async all<T = JsonRecord>() {
    const statement = this.db.prepare(this.sql);
    statement.bind(this.params);
    const results: T[] = [];
    while (statement.step()) results.push(statement.getAsObject() as T);
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
    return { success: true, meta: { changes: this.db.getRowsModified() } };
  }
}

class FakeD1Database {
  constructor(private readonly db: any) {}
  prepare(sql: string) { return new FakeD1PreparedStatement(this.db, sql); }
}

class FakeR2Bucket {
  async put() { return {}; }
  async get() { return null; }
  async delete() { return {}; }
}

// --- TEST RUNNER ---

async function runTests() {
  console.log('🚀 Starting Finance Logic Audit Tests...');

  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const fakeDb = new FakeD1Database(db);
  const fakeBucket = new FakeR2Bucket();

  // Load schema
  const migrations = [
    '0002_complete_schema.sql',
    '0003_student_module.sql',
    '0004_teacher_module.sql',
    '0007_institution_settings.sql'
  ];

  for (const file of migrations) {
    const sql = await readFile(`./migrations/${file}`, 'utf-8');
    db.run(sql);
  }

  const app = createApp({
    verifyToken: async () => ({ uid: 'admin-1', email: 'admin@test.com', emailVerified: true }),
  });

  const env = {
    DB: fakeDb as any,
    BUCKET: fakeBucket as any,
  };

  const adminToken = 'Bearer mock-token';
  const instId = 'inst-123';
  const studentId = 'student-456';

  console.log('--- Seeding Data ---');
  // Seed admin user
  db.run(`INSERT INTO platform_users (uid, full_name, email) VALUES ('admin-1', 'Admin User', 'admin@test.com')`);
  // Seed institution with BWP
  db.run(`INSERT INTO institutions (id, name, slug, owner_user_id, institution_type, currency) VALUES ('${instId}', 'Test Academy', 'test-academy', 'admin-1', 'school', 'BWP')`);
  // Seed membership
  db.run(`INSERT INTO institution_users (id, institution_id, user_id, role, status) VALUES ('mem-1', '${instId}', 'admin-1', 'owner', 'active')`);
  // Seed student
  db.run(`INSERT INTO platform_users (uid, full_name, email) VALUES ('${studentId}', 'John Doe', 'john@doe.com')`);
  db.run(`INSERT INTO institution_users (id, institution_id, user_id, role, status) VALUES ('mem-2', '${instId}', '${studentId}', 'student', 'active')`);
  db.run(`INSERT INTO student_profiles (user_id, institution_id, student_number, payment_status, total_fee, amount_paid, balance) VALUES ('${studentId}', '${instId}', 'STD-001', 'unpaid', 0, 0, 0)`);

  console.log('✅ Seed complete.');

  // 1. Create Invoice
  console.log('--- Testing Invoice Creation ---');
  const invRes = await app.request(`/api/institutions/${instId}/invoices`, {
    method: 'POST',
    headers: { Authorization: adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, amount: 1000, dueDate: '2026-12-31' }),
  }, env);
  
  assert.equal(invRes.status, 201);
  const invoice = await invRes.json() as any;
  assert.equal(invoice.currency, 'BWP');
  assert.equal(invoice.amount, 1000);

  // Check student profile update
  const getProfile = (uid: string) => {
    const stmt = db.prepare(`SELECT * FROM student_profiles WHERE user_id = ?`);
    stmt.bind([uid]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row as any;
  };

  const profileAfterInvoice = getProfile(studentId);
  assert.equal(profileAfterInvoice.balance, 1000);
  assert.equal(profileAfterInvoice.total_fee, 1000);
  assert.equal(profileAfterInvoice.payment_status, 'unpaid');
  console.log('✅ Invoice creation & balance update verified.');

  // 2. Record Partial Payment
  console.log('--- Testing Partial Payment ---');
  const payRes = await app.request(`/api/institutions/${instId}/payments`, {
    method: 'POST',
    headers: { Authorization: adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, amountPaid: 400, totalFee: 1000, paymentMethod: 'Cash' }),
  }, env);

  assert.equal(payRes.status, 201);
  const payment = await payRes.json() as any;
  assert.equal(payment.currency, 'BWP');
  assert.equal(payment.status, 'partial');

  const profileAfterPay = getProfile(studentId);
  assert.equal(profileAfterPay.balance, 600);
  assert.equal(profileAfterPay.amount_paid, 400);
  assert.equal(profileAfterPay.payment_status, 'partial');
  console.log('✅ Partial payment & balance update verified.');

  // 3. Record Full Payment (Completing the balance)
  console.log('--- Testing Full Payment ---');
  await app.request(`/api/institutions/${instId}/payments`, {
    method: 'POST',
    headers: { Authorization: adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, amountPaid: 600, totalFee: 1000, paymentMethod: 'Transfer' }),
  }, env);

  const profileAfterFull = getProfile(studentId);
  assert.equal(profileAfterFull.balance, 0);
  assert.equal(profileAfterFull.amount_paid, 1000);
  assert.equal(profileAfterFull.payment_status, 'paid');
  console.log('✅ Full payment & status transition verified.');

  // 4. Update Payment
  console.log('--- Testing Payment Update ---');
  await app.request(`/api/payments/${payment.id}`, {
    method: 'PATCH',
    headers: { Authorization: adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountPaid: 500 }), // Increased partial payment from 400 to 500
  }, env);

  const profileAfterUpdate = getProfile(studentId);
  assert.equal(profileAfterUpdate.amount_paid, 1100); // 500 + 600
  assert.equal(profileAfterUpdate.balance, 0); // Still 0 because 1100 >= 1000
  console.log('✅ Payment update & balance recalculation verified.');

  // 5. Delete Payment
  console.log('--- Testing Payment Deletion ---');
  await app.request(`/api/payments/${payment.id}`, {
    method: 'DELETE',
    headers: { Authorization: adminToken },
  }, env);

  const profileAfterDelete = getProfile(studentId);
  assert.equal(profileAfterDelete.amount_paid, 600); // Only the 600 payment remains
  assert.equal(profileAfterDelete.balance, 400); // 1000 - 600
  assert.equal(profileAfterDelete.payment_status, 'partial');
  console.log('✅ Payment deletion & balance recovery verified.');

  // 6. Process Refund
  console.log('--- Testing Refund ---');
  // First, get the ID of the remaining payment (the 600 one)
  const getPaymentId = () => {
    const stmt = db.prepare(`SELECT id FROM payments WHERE student_id = ?`);
    stmt.bind([studentId]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row.id;
  };
  const remainingPaymentId = getPaymentId();
  
  // Request refund
  const refReqRes = await app.request(`/api/institutions/${instId}/refunds`, {
    method: 'POST',
    headers: { Authorization: adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: remainingPaymentId, amount: 200, reason: 'Overcharged' }),
  }, env);
  const refund = await refReqRes.json() as any;

  // Approve refund
  await app.request(`/api/refunds/${refund.id}`, {
    method: 'PATCH',
    headers: { Authorization: adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'processed' }),
  }, env);

  const profileAfterRefund = getProfile(studentId);
  assert.equal(profileAfterRefund.amount_paid, 400); // 600 - 200 refund
  assert.equal(profileAfterRefund.balance, 600); // 1000 - 400
  console.log('✅ Refund processing & balance impact verified.');

  console.log('\n🎉 ALL FINANCE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:');
  console.error(err);
  process.exit(1);
});
