import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, updateDoc, doc, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { PaymentRecord, UserProfile, Course } from '../types';
import { Card, Button } from './ui/Card';
import { DollarSign, Search, Plus, CheckCircle2, AlertCircle, X, Calendar, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export function Financials() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [method, setMethod] = useState('Transfer');
  const [reference, setReference] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [snapPayments, snapStudents, snapCourses] = await Promise.all([
        getDocs(query(collection(db, 'payments'), orderBy('paymentDate', 'desc'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'courses'))
      ]);

      const fetchedStudents = snapStudents.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as UserProfile & { id: string }));
      
      const fetchedCourses = snapCourses.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as Course));
      
      const fetchedPayments = snapPayments.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
      } as PaymentRecord));

      if (fetchedStudents.length > 0) setStudents(fetchedStudents);
      else setStudents(getMockStudents());

      if (fetchedCourses.length > 0) setCourses(fetchedCourses);
      else setCourses(getMockCourses());

      if (fetchedPayments.length > 0) setPayments(fetchedPayments);
      else setPayments(getMockPayments());

    } catch (error) {
      console.warn("Firestore financial fetch failed (likely rules or uninitialized). Falling back to mock data:", error);
      setStudents(getMockStudents());
      setCourses(getMockCourses());
      setPayments(getMockPayments());
    } finally {
      setLoading(false);
    }
  };

  const getMockStudents = (): UserProfile[] => [
    { uid: 's1', email: 'alex@example.com', name: 'Alex Johnson', phone: '+1 234 567 890', role: 'student', courseEnrolled: 'Advanced Mathematics', paymentStatus: 'paid', progress: 85, createdAt: new Date() },
    { uid: 's2', email: 'maria@example.com', name: 'Maria Garcia', phone: '+1 987 654 321', role: 'student', courseEnrolled: 'Physics 101', paymentStatus: 'partial', progress: 42, createdAt: new Date() },
    { uid: 's3', email: 'james@example.com', name: 'James Wilson', phone: '+1 555 444 333', role: 'student', courseEnrolled: 'Introduction to Programming', paymentStatus: 'unpaid', progress: 12, createdAt: new Date() },
  ];

  const getMockCourses = (): Course[] => [
    { id: 'c1', title: 'Advanced Mathematics', description: 'Advanced calculus and statistics.', teacherId: 't1', createdAt: new Date() },
    { id: 'c2', title: 'Physics 101', description: 'Basic classical mechanics.', teacherId: 't2', createdAt: new Date() },
    { id: 'c3', title: 'Introduction to Programming', description: 'Learn logic and loops.', teacherId: 't3', createdAt: new Date() },
  ];

  const getMockPayments = (): PaymentRecord[] => [
    { id: 'p1', studentId: 's1', studentName: 'Alex Johnson', courseId: 'c1', courseName: 'Advanced Mathematics', amountPaid: 500, totalAmount: 500, balanceRemaining: 0, paymentDate: new Date(), paymentMethod: 'Card', referenceNumber: 'REF908123', status: 'paid' },
    { id: 'p2', studentId: 's2', studentName: 'Maria Garcia', courseId: 'c2', courseName: 'Physics 101', amountPaid: 200, totalAmount: 400, balanceRemaining: 200, paymentDate: new Date(), paymentMethod: 'Transfer', referenceNumber: 'REF448912', status: 'partial' },
  ];

  const handleCreatePayment = async (e: FormEvent) => {
    e.preventDefault();
    const student = students.find((s: UserProfile) => s.uid === selectedStudentId);
    const course = courses.find((c: Course) => c.id === selectedCourseId);
    
    if (!student || !course) return;

    const paid = Number(amountPaid);
    const total = Number(totalAmount);
    const balance = total - paid;
    const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    try {
      await addDoc(collection(db, 'payments'), {
        studentId: student.uid,
        studentName: student.name,
        courseId: course.id,
        courseName: course.title,
        amountPaid: paid,
        totalAmount: total,
        balanceRemaining: balance,
        status,
        paymentMethod: method,
        referenceNumber: reference,
        paymentDate: serverTimestamp(),
      });
      
      // Update student's payment status
      const studentDoc = doc(db, 'users', (student as any).id);
      await updateDoc(studentDoc, {
        paymentStatus: status
      });

      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
    }
  };

  const resetForm = () => {
    setSelectedStudentId('');
    setSelectedCourseId('');
    setAmountPaid('');
    setTotalAmount('');
    setReference('');
  };

  // Stats calculation
  const stats = {
    totalStudents: students.length,
    paidStudents: students.filter((s: UserProfile) => s.paymentStatus === 'paid').length,
    unpaidStudents: students.filter((s: UserProfile) => s.paymentStatus === 'unpaid').length,
    totalExpected: payments.reduce((sum: number, p: PaymentRecord) => sum + p.totalAmount, 0),
    totalReceived: payments.reduce((sum: number, p: PaymentRecord) => sum + p.amountPaid, 0),
    outstanding: payments.reduce((sum: number, p: PaymentRecord) => sum + p.balanceRemaining, 0),
  };

  const filteredPayments = payments.filter((p: PaymentRecord) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch = p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (profile?.role === 'student') {
    const studentPayments = payments.filter((p: PaymentRecord) => p.studentId === profile.uid || p.studentName === profile.name);
    const studentPaid = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const studentTotal = studentPayments.reduce((sum, p) => sum + p.totalAmount, 0);
    const studentBalance = studentTotal - studentPaid;

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Financial Ledger</h1>
          <p className="text-gray-500 mt-1 font-medium">View your outstanding balance, invoices, and transaction history.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-black text-white border-none shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Paid</span>
            </div>
            <h3 className="text-3xl font-black">${studentPaid.toLocaleString()}</h3>
            <p className="text-xs mt-2 opacity-60 font-bold uppercase tracking-widest">Total Invoiced: ${studentTotal.toLocaleString()}</p>
          </Card>

          <Card className="bg-red-50 border-red-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Outstanding Balance</span>
            </div>
            <h3 className="text-3xl font-black text-red-900">${studentBalance.toLocaleString()}</h3>
            <p className="text-xs mt-2 text-red-500 font-bold uppercase tracking-widest">
              {studentBalance > 0 ? 'Payment Required' : 'Account Fully Settled'}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Account Status</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900">
              {profile.paymentStatus === 'paid' ? 'Active' : profile.paymentStatus === 'partial' ? 'Active (Arrears)' : 'Suspended'}
            </h3>
            <p className="text-xs mt-2 text-gray-400 font-bold uppercase tracking-widest">
              Payment Status: {profile.paymentStatus || 'unpaid'}
            </p>
          </Card>
        </div>

        <Card title="Payment Records" description="Official receipts and transactional details.">
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {studentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 font-medium italic">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  studentPayments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-gray-900 text-sm">{p.referenceNumber || 'N/A'}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-700">{p.courseName}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {p.paymentDate instanceof Date ? p.paymentDate.toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-500">{p.paymentMethod}</td>
                      <td className="py-4 px-4 font-black text-black text-sm">${p.amountPaid.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.status === 'paid' ? 'bg-green-50 text-green-700' : p.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {p.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button 
                          onClick={() => alert(`Official Receipt\nReference: ${p.referenceNumber}\nCourse: ${p.courseName}\nAmount Paid: $${p.amountPaid}\nStatus: ${p.status?.toUpperCase()}\n\nThank you for choosing LearnFlow!`)}
                          variant="outline" 
                          className="text-xs py-1.5"
                        >
                          Download Receipt
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-gray-500">Only administrators can view financial records.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Financial Tracking</h1>
          <p className="text-gray-500 mt-1 font-medium">Monitor payments, revenue, and outstanding balances.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 w-full md:w-auto">
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <Card className="bg-black text-white border-none shadow-xl shadow-black/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Received</span>
          </div>
          <h3 className="text-3xl font-black">${stats.totalReceived.toLocaleString()}</h3>
          <p className="text-xs mt-2 opacity-60 font-bold uppercase tracking-widest">Expected: ${stats.totalExpected.toLocaleString()}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Outstanding</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900">${stats.outstanding.toLocaleString()}</h3>
          <p className="text-xs mt-2 text-gray-400 font-bold uppercase tracking-widest">{stats.unpaidStudents} Students Unpaid</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Payment Status</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{stats.paidStudents}/{stats.totalStudents}</h3>
          <p className="text-xs mt-2 text-gray-400 font-bold uppercase tracking-widest">Students Paid in Full</p>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search payments by student or course..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {(['all', 'paid', 'partial', 'unpaid'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                statusFilter === status 
                ? 'bg-black text-white' 
                : 'bg-white border border-gray-200 text-gray-500 hover:border-black hover:text-black'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student & Course</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Balance</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date & Method</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">No payment records found.</td>
                  </tr>
                ) : (
                  filteredPayments.map((payment: PaymentRecord) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900">{payment.studentName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{payment.courseName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-bold text-gray-900">
                        <span className="text-green-500"><ArrowUpRight className="w-3 h-3" /></span>
                        ${payment.amountPaid.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">of ${payment.totalAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-red-500">
                      ${payment.balanceRemaining.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        payment.status === 'paid' ? 'bg-green-50 text-green-600' :
                        payment.status === 'partial' ? 'bg-orange-50 text-orange-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {payment.paymentDate?.toDate ? format(payment.paymentDate.toDate(), 'MMM dd, yyyy') : 'Recently'}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{payment.paymentMethod}</p>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-[10px] bg-gray-100 px-2 py-1 rounded-lg font-bold text-gray-500">
                        {payment.referenceNumber || 'N/A'}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Record Payment</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreatePayment} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Student</label>
                    <select 
                      required
                      value={selectedStudentId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedStudentId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none appearance-none"
                    >
                      <option value="">Select Student</option>
                      {students.map((s: UserProfile) => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Course</label>
                    <select 
                      required
                      value={selectedCourseId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCourseId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none appearance-none"
                    >
                      <option value="">Select Course</option>
                      {courses.map((c: Course) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Amount Paid ($)</label>
                    <input 
                      required
                      type="number"
                      value={amountPaid}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setAmountPaid(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Total Due ($)</label>
                    <input 
                      required
                      type="number"
                      value={totalAmount}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setTotalAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                    <select 
                      value={method}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setMethod(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none appearance-none"
                    >
                      <option value="Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Credit/Debit Card</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Reference/Receipt #</label>
                    <input 
                      value={reference}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none"
                      placeholder="REF123456"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 py-3">Cancel</Button>
                  <Button type="submit" className="flex-[2] py-3">Save Record</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
