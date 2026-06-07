import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ui/Toast';
import { Card, Button } from './ui/Card';
import { Plus, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as cfApi from '../services/cfApi';
import type { PaymentInput, StudentSummary } from '../types';
import { formatMoney } from '../lib/currency';
import { PaymentList } from './finance/PaymentList';
import { InvoiceList } from './finance/InvoiceList';
import { RefundList } from './finance/RefundList';

type FinanceTab =
  | 'payments'
  | 'invoices'
  | 'refunds'
  | 'balances'
  | 'paid'
  | 'unpaid'
  | 'partial'
  | 'receipts'
  | 'revenue'
  | 'installments'
  | 'expenses'
  | 'methods';

const FINANCE_TAB_MAP: Record<string, FinanceTab> = {
  payments: 'payments',
  balances: 'balances',
  paid: 'paid',
  unpaid: 'unpaid',
  partial: 'partial',
  invoices: 'invoices',
  receipts: 'receipts',
  refunds: 'refunds',
  revenue: 'revenue',
  installments: 'balances',
  expenses: 'revenue',
  methods: 'payments',
};

const TAB_LABELS: Record<FinanceTab, string> = {
  payments: 'Payments',
  invoices: 'Invoices',
  refunds: 'Refunds',
  balances: 'Outstanding Balances',
  paid: 'Paid Students',
  unpaid: 'Unpaid Students',
  partial: 'Partial Payments',
  receipts: 'Receipts',
  revenue: 'Revenue Analytics',
  installments: 'Installments',
  expenses: 'Expenses',
  methods: 'Payment Methods',
};

function resolveFinanceTab(tab?: string): FinanceTab {
  return FINANCE_TAB_MAP[tab || 'payments'] || 'payments';
}

function studentPaymentStatus(student: StudentSummary): 'paid' | 'partial' | 'unpaid' {
  const status = String(student.paymentStatus || student.payment_status || '').toLowerCase();
  if (status === 'paid' || status === 'partial' || status === 'unpaid') return status;
  const balance = Number(student.balance ?? 0);
  const paid = Number(student.amountPaid ?? student.amount_paid ?? 0);
  if (balance <= 0 && paid > 0) return 'paid';
  if (paid > 0 && balance > 0) return 'partial';
  return 'unpaid';
}

interface FinancialsProps {
  initialTab?: string;
}

function StudentBalanceTable({
  students,
  loading,
  emptyMessage,
  currency = 'USD',
}: {
  students: StudentSummary[];
  loading: boolean;
  emptyMessage: string;
  currency?: string;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (students.length === 0) {
    return <p className="py-12 text-center text-sm italic text-gray-400">{emptyMessage}</p>;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Student</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Paid</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Fee</th>
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-gray-400">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {students.map((student) => {
            const name = student.fullName || student.full_name || student.email || 'Student';
            const status = studentPaymentStatus(student);
            const paid = Number(student.amountPaid ?? student.amount_paid ?? 0);
            const fee = Number(student.totalFee ?? student.total_fee ?? 0);
            const balance = Number(student.balance ?? 0);
            return (
              <tr key={student.userId || student.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400">{student.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      status === 'paid'
                        ? 'bg-green-50 text-green-700'
                        : status === 'partial'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-700">{formatMoney(paid, currency)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatMoney(fee, currency)}</td>
                <td className="px-6 py-4 text-right text-sm font-black text-red-600">{formatMoney(balance, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Financials({ initialTab = 'payments' }: FinancialsProps) {
  const { profile, canManageInstitution, institutionId, institution } = useAuth();
  const currency = institution?.currency || 'USD';
  const toast = useToast();
  const activeTab = resolveFinanceTab(initialTab);

  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentSummary[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    amountPaid: '',
    totalFee: '',
    method: 'Transfer',
    reference: '',
  });

  useEffect(() => {
    void fetchData();
  }, [profile, institutionId, activeTab]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const isStudent = profile?.role === 'student';
      const [fetchedPayments, fetchedInvoices, fetchedRefunds, studentPage, fetchedMembers, fetchedCourses] =
        await Promise.all([
          cfApi.listPayments(institutionId, isStudent ? profile?.uid : undefined),
          isStudent ? Promise.resolve([]) : cfApi.listInvoices(institutionId),
          isStudent ? Promise.resolve([]) : cfApi.listRefunds(institutionId),
          isStudent
            ? Promise.resolve({ results: [] as StudentSummary[] })
            : cfApi.listStudents(institutionId, { status: 'approved', pagination: { limit: 500, offset: 0 } }),
          isStudent ? Promise.resolve([]) : cfApi.getInstitutionMembers(institutionId, 'student'),
          cfApi.listCourses(institutionId),
        ]);

      setPayments(fetchedPayments);
      setInvoices(fetchedInvoices);
      setRefunds(fetchedRefunds);
      setStudentSummaries(studentPage.results || []);
      setMembers(fetchedMembers);
      setCourses(fetchedCourses);
    } catch (err) {
      console.error('Fetch financial data failed:', err);
      toast.error('Failed to load financial data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    try {
      const payload: PaymentInput = {
        student_id: formData.studentId,
        course_id: formData.courseId,
        amount_paid: Number(formData.amountPaid),
        total_fee: Number(formData.totalFee),
        payment_method: formData.method,
        reference_number: formData.reference,
        status: Number(formData.amountPaid) >= Number(formData.totalFee) ? 'paid' : 'partial',
      };

      if (!isEditing || !selectedPayment) {
        await cfApi.createPayment(institutionId, payload);
      }

      setShowForm(false);
      setFormData({ studentId: '', courseId: '', amountPaid: '', totalFee: '', method: 'Transfer', reference: '' });
      void fetchData();
      toast.success('Payment recorded successfully!');
    } catch (err) {
      console.error('Save payment failed:', err);
      toast.error('Unable to record payment.');
    }
  };

  const handleApproveRefund = async (refundId: string) => {
    try {
      await cfApi.processRefund(refundId, 'processed');
      toast.success('Refund approved.');
      void fetchData();
    } catch (err) {
      console.error('Approve refund failed:', err);
      toast.error('Could not approve refund.');
    }
  };

  const handleRejectRefund = async (refundId: string) => {
    try {
      await cfApi.processRefund(refundId, 'rejected');
      toast.success('Refund rejected.');
      void fetchData();
    } catch (err) {
      console.error('Reject refund failed:', err);
      toast.error('Could not reject refund.');
    }
  };

  const handleReceipt = (p: any) => {
    const w = window.open();
    if (w) {
      w.document.write(`
        <div style="font-family:sans-serif; padding:40px; border:2px solid black; max-width:500px; margin:auto; border-radius:12px;">
          <h2 style="text-align:center; font-weight:bold; margin-bottom:0;">LEARNFLOW ACADEMY</h2>
          <p style="text-align:center; color:#666; font-size:12px; margin-top:4px;">Official Transaction Receipt</p>
          <hr style="margin:20px 0; border:none; border-top:1px dashed #ccc;" />
          <p><strong>Reference:</strong> ${p.reference_number || p.referenceNumber || 'N/A'}</p>
          <p><strong>Student:</strong> ${p.student_name || p.studentName}</p>
          <p><strong>Course:</strong> ${p.course_name || p.courseName}</p>
          <p><strong>Amount Paid:</strong> ${formatMoney(Number(p.amount_paid || p.amountPaid || 0), currency)}</p>
          <p><strong>Status:</strong> ${p.status?.toUpperCase()}</p>
          <p><strong>Date:</strong> ${new Date(p.created_at || Date.now()).toLocaleDateString()}</p>
          <hr style="margin:20px 0; border:none; border-top:1px dashed #ccc;" />
          <button onclick="window.print()" style="display:block; margin:20px auto 0; padding:8px 16px; font-weight:bold; cursor:pointer;">Print Receipt</button>
        </div>
      `);
      w.document.close();
    }
  };

  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount_paid || p.amountPaid || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalRefunded = refunds
    .filter((r) => r.status === 'processed')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalOutstanding = studentSummaries.reduce((sum, s) => sum + Number(s.balance ?? 0), 0);

  const balanceStudents = useMemo(
    () =>
      [...studentSummaries]
        .filter((s) => Number(s.balance ?? 0) > 0)
        .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0)),
    [studentSummaries],
  );

  const paidStudents = useMemo(
    () => studentSummaries.filter((s) => studentPaymentStatus(s) === 'paid'),
    [studentSummaries],
  );

  const unpaidStudents = useMemo(
    () => studentSummaries.filter((s) => studentPaymentStatus(s) === 'unpaid'),
    [studentSummaries],
  );

  const partialStudents = useMemo(
    () => studentSummaries.filter((s) => studentPaymentStatus(s) === 'partial'),
    [studentSummaries],
  );

  const paymentMethods = useMemo(() => {
    const counts = new Map<string, number>();
    payments.forEach((payment) => {
      const method = String(payment.payment_method || payment.paymentMethod || 'Unknown');
      counts.set(method, (counts.get(method) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [payments]);

  if (profile?.role === 'student') {
    return (
      <div className="space-y-8 p-4 md:p-8 mx-auto max-w-7xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Financial Ledger</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            View your outstanding balance, invoices, and transaction history.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card className="border-none bg-black text-white shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Paid</p>
            <h3 className="mt-2 text-3xl font-black">{formatMoney(totalReceived, currency)}</h3>
          </Card>
          <Card className="border-red-100 bg-red-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Invoiced Amount</p>
            <h3 className="mt-2 text-3xl font-black text-red-900">{formatMoney(totalInvoiced, currency)}</h3>
          </Card>
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Account Status</p>
            <h3 className="mt-2 text-3xl font-black text-gray-900">
              {totalInvoiced > totalReceived ? 'Arrears' : 'Settled'}
            </h3>
          </Card>
        </div>

        <PaymentList
          payments={payments}
          onEdit={() => {}}
          onDelete={() => {}}
          onReceipt={handleReceipt}
          loading={loading}
          readonly
        />
      </div>
    );
  }

  const renderMainContent = () => {
    if (activeTab === 'payments' || activeTab === 'methods') {
      if (activeTab === 'methods') {
        return (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-500">Payment methods used in recorded transactions.</p>
            {paymentMethods.length === 0 ? (
              <p className="py-8 text-center text-sm italic text-gray-400">No payment methods recorded yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paymentMethods.map(([method, count]) => (
                  <Card key={method} className="p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{method}</p>
                    <p className="mt-2 text-2xl font-black text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">transactions</p>
                  </Card>
                ))}
              </div>
            )}
            <PaymentList
              payments={payments}
              loading={loading}
              onEdit={() => {}}
              onDelete={() => {}}
              onReceipt={handleReceipt}
            />
          </div>
        );
      }
      return (
        <PaymentList
          payments={payments}
          loading={loading}
          onEdit={() => {}}
          onDelete={() => {}}
          onReceipt={handleReceipt}
        />
      );
    }

    if (activeTab === 'invoices') {
      return <InvoiceList invoices={invoices} loading={loading} onDownload={() => {}} />;
    }

    if (activeTab === 'refunds') {
      return (
        <RefundList
          refunds={refunds}
          loading={loading}
          onApprove={handleApproveRefund}
          onReject={handleRejectRefund}
          canManage={canManageInstitution}
        />
      );
    }

    if (activeTab === 'receipts') {
      return (
        <PaymentList
          payments={payments}
          loading={loading}
          onEdit={() => {}}
          onDelete={() => {}}
          onReceipt={handleReceipt}
          readonly
        />
      );
    }

    if (activeTab === 'revenue' || activeTab === 'expenses') {
      return (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="bg-black p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Revenue</p>
              <p className="mt-2 text-3xl font-black">{formatMoney(totalReceived, currency)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Outstanding</p>
              <p className="mt-2 text-3xl font-black text-gray-900">{formatMoney(totalOutstanding, currency)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Refunded</p>
              <p className="mt-2 text-3xl font-black text-gray-900">{formatMoney(totalRefunded, currency)}</p>
            </Card>
          </div>
          {activeTab === 'expenses' && (
            <Card className="rounded-2xl border-amber-200 bg-amber-50 p-5 text-amber-900">
              <p className="text-sm font-semibold">
                Expense tracking is not configured yet. Revenue and refund totals are shown from payment records.
              </p>
            </Card>
          )}
          <PaymentList
            payments={payments}
            loading={loading}
            onEdit={() => {}}
            onDelete={() => {}}
            onReceipt={handleReceipt}
          />
        </div>
      );
    }

    if (activeTab === 'balances' || activeTab === 'installments') {
      return (
        <StudentBalanceTable
          students={balanceStudents}
          loading={loading}
          emptyMessage="No students with outstanding balances."
          currency={currency}
        />
      );
    }

    if (activeTab === 'paid') {
      return (
        <StudentBalanceTable students={paidStudents} loading={loading} emptyMessage="No fully paid students yet." currency={currency} />
      );
    }

    if (activeTab === 'unpaid') {
      return (
        <StudentBalanceTable students={unpaidStudents} loading={loading} emptyMessage="No unpaid students found." currency={currency} />
      );
    }

    if (activeTab === 'partial') {
      return (
        <StudentBalanceTable
          students={partialStudents}
          loading={loading}
          emptyMessage="No students with partial payments."
          currency={currency}
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-8 p-4 md:p-8 mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{TAB_LABELS[activeTab]}</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Monitor payments, tuition revenue, and outstanding student arrears.
          </p>
        </div>
        {(activeTab === 'payments' || activeTab === 'receipts') && (
          <Button
            onClick={() => {
              setIsEditing(false);
              setShowForm(true);
            }}
            className="gap-2 bg-black text-white"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <Card className="border-none bg-black text-white shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Revenue Received</p>
          <h3 className="mt-1 text-3xl font-black">{formatMoney(totalReceived, currency)}</h3>
        </Card>
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Outstanding</p>
          <h3 className="mt-1 text-3xl font-black text-gray-900">{formatMoney(totalOutstanding, currency)}</h3>
        </Card>
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Invoiced</p>
          <h3 className="mt-1 text-3xl font-black text-gray-900">{formatMoney(totalInvoiced, currency)}</h3>
        </Card>
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Refunds Processed</p>
          <h3 className="mt-1 text-3xl font-black text-gray-900">{formatMoney(totalRefunded, currency)}</h3>
        </Card>
      </div>

      {renderMainContent()}

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Record Transaction</h2>
                <button onClick={() => setShowForm(false)} className="rounded-xl p-2 transition-colors hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSavePayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-700">Student</label>
                    <select
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                    >
                      <option value="">Select Student</option>
                      {members.map((s) => (
                        <option key={s.user_id || s.uid} value={s.user_id || s.uid}>
                          {s.full_name || s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-700">Course</label>
                    <select
                      required
                      value={formData.courseId}
                      onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                    >
                      <option value="">Select Course</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.course_name || c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-700">Amount Paid ({currency})</label>
                    <input
                      required
                      type="number"
                      value={formData.amountPaid}
                      onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-gray-700">Total Fee ($)</label>
                    <input
                      required
                      type="number"
                      value={formData.totalFee}
                      onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-gray-700">Reference / Method</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                    >
                      <option value="Transfer">Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                    </select>
                    <input
                      required
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                      placeholder="Ref #..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" type="button" onClick={() => setShowForm(false)} className="flex-1 py-3">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-[2] bg-black py-3 text-white hover:bg-gray-800">
                    Record Payment
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
