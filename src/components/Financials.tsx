import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { DollarSign, Search, Plus, CheckCircle2, AlertCircle, X, Printer, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as cfApi from '../services/cfApi';
import type { PaymentInput } from '../types';

// Sub-components
import { PaymentList } from './finance/PaymentList';
import { InvoiceList } from './finance/InvoiceList';
import { RefundList } from './finance/RefundList';

interface FinancialsProps {
  initialTab?: 'payments' | 'invoices' | 'refunds';
}

export function Financials({ initialTab = 'payments' }: FinancialsProps) {
  const { profile, isOwner, institutionId } = useAuth();
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices' | 'refunds'>(initialTab);
  
  // Data States
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    amountPaid: '',
    totalFee: '',
    method: 'Transfer',
    reference: ''
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetchData();
  }, [profile, institutionId, activeTab]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [fetchedStudents, fetchedCourses] = await Promise.all([
        cfApi.getInstitutionMembers(institutionId, 'student'),
        cfApi.listCourses(institutionId)
      ]);
      setStudents(fetchedStudents);
      setCourses(fetchedCourses);

      if (activeTab === 'payments') {
        const list = await cfApi.listPayments(institutionId, profile?.role === 'student' ? profile.uid : undefined);
        setPayments(list);
      } else if (activeTab === 'invoices') {
        const list = await cfApi.listInvoices(institutionId);
        setInvoices(list);
      } else if (activeTab === 'refunds') {
        const list = await cfApi.listRefunds(institutionId);
        setRefunds(list);
      }
    } catch (err) {
      console.error("Fetch financial data failed:", err);
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

      if (isEditing && selectedPayment) {
        // await cfApi.updatePayment(selectedPayment.id, payload); // Logic for update if needed
      } else {
        await cfApi.createPayment(institutionId, payload);
      }
      
      setShowForm(false);
      setFormData({ studentId: '', courseId: '', amountPaid: '', totalFee: '', method: 'Transfer', reference: '' });
      fetchData();
      alert("Payment recorded successfully!");
    } catch (err) {
      console.error("Save payment failed:", err);
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
          <p><strong>Amount Paid:</strong> $${(p.amount_paid || p.amountPaid).toLocaleString()}</p>
          <p><strong>Status:</strong> ${p.status?.toUpperCase()}</p>
          <p><strong>Date:</strong> ${new Date(p.created_at || Date.now()).toLocaleDateString()}</p>
          <hr style="margin:20px 0; border:none; border-top:1px dashed #ccc;" />
          <button onclick="window.print()" style="display:block; margin:20px auto 0; padding:8px 16px; font-weight:bold; cursor:pointer;">Print Receipt</button>
        </div>
      `);
      w.document.close();
    }
  };

  // Stats calculation
  const totalReceived = payments.reduce((sum, p) => sum + (p.amount_paid || p.amountPaid || 0), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalRefunded = refunds.filter(r => r.status === 'processed').reduce((sum, r) => sum + (r.amount || 0), 0);

  if (profile?.role === 'student') {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Financial Ledger</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">View your outstanding balance, invoices, and transaction history.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-black text-white border-none shadow-xl">
             <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Paid</p>
             <h3 className="text-3xl font-black mt-2">${totalReceived.toLocaleString()}</h3>
          </Card>
          <Card className="bg-red-50 border-red-100">
             <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Invoiced Amount</p>
             <h3 className="text-3xl font-black text-red-900 mt-2">${totalInvoiced.toLocaleString()}</h3>
          </Card>
          <Card>
             <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Account Status</p>
             <h3 className="text-3xl font-black text-gray-900 mt-2">{totalInvoiced > totalReceived ? 'Arrears' : 'Settle'}</h3>
          </Card>
        </div>

        <PaymentList payments={payments} onEdit={() => {}} onDelete={() => {}} onReceipt={handleReceipt} loading={loading} readonly />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Financial Tracking</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Monitor payments, tuition revenue, and outstanding student arrears.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setIsEditing(false); setShowForm(true); }} className="bg-black text-white gap-2">
            <Plus className="w-4 h-4" /> Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-black text-white border-none shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Revenue Received</p>
          <h3 className="text-3xl font-black mt-1">${totalReceived.toLocaleString()}</h3>
        </Card>
        <Card>
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Total Invoiced</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">${totalInvoiced.toLocaleString()}</h3>
        </Card>
        <Card>
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Refunds Processed</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">${totalRefunded.toLocaleString()}</h3>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-gray-100 pb-px">
        {['payments', 'invoices', 'refunds'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'payments' && <PaymentList payments={payments} loading={loading} onEdit={() => {}} onDelete={() => {}} onReceipt={handleReceipt} />}
      {activeTab === 'invoices' && <InvoiceList invoices={invoices} loading={loading} onDownload={() => {}} />}
      {activeTab === 'refunds' && <RefundList refunds={refunds} loading={loading} onApprove={() => {}} onReject={() => {}} isOwner={isOwner} />}

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Record Transaction</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSavePayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Student</label>
                    <select 
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.uid} value={s.uid}>{s.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Course</label>
                    <select 
                      required
                      value={formData.courseId}
                      onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.course_name || c.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Amount Paid ($)</label>
                    <input 
                      required
                      type="number"
                      value={formData.amountPaid}
                      onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Total Fee ($)</label>
                    <input 
                      required
                      type="number"
                      value={formData.totalFee}
                      onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Reference / Method</label>
                  <div className="flex gap-2">
                    <select 
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="Transfer">Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                    </select>
                    <input 
                      required
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="Ref #..."
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" type="button" onClick={() => setShowForm(false)} className="flex-1 py-3">Cancel</Button>
                  <Button type="submit" className="flex-[2] py-3 bg-black text-white hover:bg-gray-800">
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
