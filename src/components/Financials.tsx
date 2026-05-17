import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, updateDoc, doc, deleteDoc, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { DollarSign, Search, Plus, CheckCircle2, AlertCircle, X, Calendar, ArrowUpRight, Printer, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Financials() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [totalFee, setTotalFee] = useState('');
  const [method, setMethod] = useState('Transfer');
  const [reference, setReference] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const getMockStudents = () => [
    { id: 's1', fullName: 'Alex Johnson', email: 'alex@example.com', phone: '+1 234 567 890', courseId: 'Advanced Mathematics', status: 'active', paymentStatus: 'paid', totalFee: 1000, amountPaid: 1000, balance: 0, enrollmentDate: new Date() },
    { id: 's2', fullName: 'Maria Garcia', email: 'maria@example.com', phone: '+1 987 654 321', courseId: 'Physics 101', status: 'active', paymentStatus: 'partial', totalFee: 1000, amountPaid: 400, balance: 600, enrollmentDate: new Date() },
    { id: 's3', fullName: 'James Wilson', email: 'james@example.com', phone: '+1 555 444 333', courseId: 'Introduction to Programming', status: 'suspended', paymentStatus: 'unpaid', totalFee: 1200, amountPaid: 0, balance: 1200, enrollmentDate: new Date() },
  ];

  const getMockPayments = () => [
    { id: 'p1', studentId: 's1', studentName: 'Alex Johnson', courseId: 'c1', courseName: 'Advanced Mathematics', amountPaid: 1000, totalFee: 1000, balance: 0, paymentMethod: 'Card', referenceNumber: 'REF908123', status: 'paid', paymentDate: new Date() },
    { id: 'p2', studentId: 's2', studentName: 'Maria Garcia', courseId: 'c2', courseName: 'Physics 101', amountPaid: 400, totalFee: 1000, balance: 600, paymentMethod: 'Transfer', referenceNumber: 'REF448912', status: 'partial', paymentDate: new Date() },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [snapPayments, snapStudents, snapCourses] = await Promise.all([
        getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'courses'))
      ]);

      const fetchedStudents = snapStudents.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));
      const fetchedCourses = snapCourses.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));
      const fetchedPayments = snapPayments.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));

      setStudents(fetchedStudents.length > 0 ? fetchedStudents : getMockStudents());
      setCourses(fetchedCourses.length > 0 ? fetchedCourses : [
        { id: 'c1', title: 'Advanced Mathematics' },
        { id: 'c2', title: 'Physics 101' },
        { id: 'c3', title: 'Introduction to Programming' }
      ]);
      setPayments(fetchedPayments.length > 0 ? fetchedPayments : getMockPayments());
    } catch (error) {
      console.warn("Firestore financial fetch failed (permission or empty). Loading fallback specs:", error);
      setStudents(getMockStudents());
      setPayments(getMockPayments());
      setCourses([
        { id: 'c1', title: 'Advanced Mathematics' },
        { id: 'c2', title: 'Physics 101' },
        { id: 'c3', title: 'Introduction to Programming' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e: FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentId || s.uid === selectedStudentId);
    const course = courses.find(c => c.id === selectedCourseId || c.title === selectedCourseId);
    
    if (!student) {
      alert("Invalid Student selection");
      return;
    }

    const paid = Number(amountPaid);
    const total = Number(totalFee);
    const balance = total - paid;
    const paymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    try {
      if (isEditing && selectedPayment) {
        // Edit flow
        const oldPayment = selectedPayment;
        const diffPaid = paid - oldPayment.amountPaid;

        // Update payment doc
        await updateDoc(doc(db, 'payments', selectedPayment.id), {
          amountPaid: paid,
          totalFee: total,
          balance,
          status: paymentStatus,
          paymentMethod: method,
          referenceNumber: reference
        });

        // Recalculate student totals
        const newStudentAmountPaid = Number(student.amountPaid || 0) + diffPaid;
        const newStudentBalance = Number(student.totalFee || 1000) - newStudentAmountPaid;
        const newStudentStatus = newStudentAmountPaid >= Number(student.totalFee || 1000) ? 'paid' : newStudentAmountPaid > 0 ? 'partial' : 'unpaid';

        await updateDoc(doc(db, 'students', student.id), {
          amountPaid: newStudentAmountPaid,
          balance: newStudentBalance,
          paymentStatus: newStudentStatus
        });
      } else {
        // Add flow
        await addDoc(collection(db, 'payments'), {
          studentId: student.id,
          studentName: student.fullName || student.name,
          courseId: course ? course.id : selectedCourseId,
          courseName: course ? course.title : selectedCourseId,
          amountPaid: paid,
          totalFee: total,
          balance,
          status: paymentStatus,
          paymentMethod: method,
          referenceNumber: reference,
          paymentDate: new Date(),
          createdAt: serverTimestamp()
        });

        // Update related Student fields in Firestore in real-time
        const updatedPaid = Number(student.amountPaid || 0) + paid;
        const updatedBalance = Number(student.totalFee || 1000) - updatedPaid;
        const updatedStatus = updatedPaid >= Number(student.totalFee || 1000) ? 'paid' : updatedPaid > 0 ? 'partial' : 'unpaid';

        await updateDoc(doc(db, 'students', student.id), {
          amountPaid: updatedPaid,
          balance: updatedBalance,
          paymentStatus: updatedStatus
        });
      }

      setShowForm(false);
      resetForm();
      fetchData();
      alert("Payment processed successfully and student ledger updated!");
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'payments');
    }
  };

  const handleEdit = (p: any) => {
    setSelectedPayment(p);
    const relatedStudent = students.find(s => s.fullName === p.studentName || s.name === p.studentName || s.id === p.studentId);
    setSelectedStudentId(relatedStudent ? relatedStudent.id : p.studentId);
    setSelectedCourseId(p.courseName);
    setAmountPaid(p.amountPaid.toString());
    setTotalFee(p.totalFee.toString());
    setMethod(p.paymentMethod);
    setReference(p.referenceNumber);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (p: any) => {
    if (!confirm("Are you sure you want to permanently delete this payment?")) return;
    try {
      await deleteDoc(doc(db, 'payments', p.id));
      
      // Revert student totals
      const student = students.find(s => s.id === p.studentId || s.fullName === p.studentName);
      if (student) {
        const revertedPaid = Math.max(0, Number(student.amountPaid || 0) - p.amountPaid);
        const revertedBalance = Number(student.totalFee || 1000) - revertedPaid;
        const revertedStatus = revertedPaid >= Number(student.totalFee || 1000) ? 'paid' : revertedPaid > 0 ? 'partial' : 'unpaid';

        await updateDoc(doc(db, 'students', student.id), {
          amountPaid: revertedPaid,
          balance: revertedBalance,
          paymentStatus: revertedStatus
        });
      }
      fetchData();
      alert("Payment record deleted and student balance reverted!");
    } catch (err) {
      console.error("Could not delete payment record:", err);
    }
  };

  const generateReceipt = (p: any) => {
    const w = window.open();
    if (w) {
      w.document.write(`
        <div style="font-family:sans-serif; padding:40px; border:2px solid black; max-width:500px; margin:auto; border-radius:12px;">
          <h2 style="text-align:center; font-weight:bold; margin-bottom:0;">LEARNFLOW ACADEMY</h2>
          <p style="text-align:center; color:#666; font-size:12px; margin-top:4px;">Official Transaction Receipt</p>
          <hr style="margin:20px 0; border:none; border-top:1px dashed #ccc;" />
          <p><strong>Reference Number:</strong> ${p.referenceNumber || 'REF-N/A'}</p>
          <p><strong>Student:</strong> ${p.studentName}</p>
          <p><strong>Course:</strong> ${p.courseName}</p>
          <p><strong>Amount Paid:</strong> $${p.amountPaid.toLocaleString()}</p>
          <p><strong>Remaining Balance:</strong> $${p.balance.toLocaleString()}</p>
          <p><strong>Payment Status:</strong> ${p.status.toUpperCase()}</p>
          <p><strong>Method:</strong> ${p.paymentMethod}</p>
          <p><strong>Date:</strong> ${p.paymentDate?.seconds ? new Date(p.paymentDate.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}</p>
          <hr style="margin:20px 0; border:none; border-top:1px dashed #ccc;" />
          <p style="text-align:center; font-weight:bold; font-size:14px;">Thank you for your payment!</p>
          <button onclick="window.print()" style="display:block; margin:20px auto 0; padding:8px 16px; font-weight:bold; cursor:pointer;">Print Receipt</button>
        </div>
      `);
      w.document.close();
    }
  };

  const exportReport = () => {
    let csv = "Reference,Student,Course,Paid,Balance,Status,Method,Date\n";
    filteredPayments.forEach(p => {
      csv += `"${p.referenceNumber || ''}","${p.studentName}","${p.courseName}",$${p.amountPaid},$${p.balance},"${p.status}","${p.paymentMethod}","${p.paymentDate?.seconds ? new Date(p.paymentDate.seconds * 1000).toLocaleDateString() : 'N/A'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `LearnFlow_Financial_Report_${new Date().toLocaleDateString()}.csv`);
    a.click();
  };

  const resetForm = () => {
    setSelectedStudentId('');
    setSelectedCourseId('');
    setAmountPaid('');
    setTotalFee('');
    setReference('');
    setIsEditing(false);
    setSelectedPayment(null);
  };

  // Stats calculation
  const stats = {
    totalStudents: students.length,
    paidStudents: students.filter(s => s.paymentStatus === 'paid').length,
    unpaidStudents: students.filter(s => s.paymentStatus === 'unpaid').length,
    totalExpected: students.reduce((sum, s) => sum + Number(s.totalFee || 1000), 0),
    totalReceived: payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0),
    outstanding: students.reduce((sum, s) => sum + Number(s.balance !== undefined ? s.balance : (s.totalFee - s.amountPaid)), 0),
  };

  const filteredPayments = payments.filter((p: any) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesCourse = courseFilter === 'all' || p.courseName === courseFilter;
    const matchesSearch = p.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.courseName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCourse && matchesSearch;
  });

  if (profile?.role === 'student') {
    const studentPayments = payments.filter(p => p.studentId === profile.uid || p.studentName === profile.name);
    const studentPaid = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const studentTotal = studentPayments.reduce((sum, p) => sum + p.totalFee, 0);
    const studentBalance = studentTotal - studentPaid;

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Financial Ledger</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">View your outstanding balance, invoices, and transaction history.</p>
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
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Account Status</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900">
              {studentBalance === 0 ? 'Active' : 'Active (Arrears)'}
            </h3>
            <p className="text-xs mt-2 text-gray-400 font-bold uppercase tracking-widest">
              Payment Status: {studentBalance === 0 ? 'paid' : 'partial'}
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
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {studentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 font-medium italic">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  studentPayments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-gray-900 text-sm">{p.referenceNumber || 'N/A'}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-700">{p.courseName}</td>
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
                          onClick={() => generateReceipt(p)}
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Financial Tracking</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Monitor payments, tuition revenue, outstanding balances, and export financial sheets.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={exportReport} variant="outline" className="gap-2 shrink-0">
            Export CSV
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-black text-white border-none shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Received</span>
          </div>
          <h3 className="text-3xl font-black">${stats.totalReceived.toLocaleString()}</h3>
          <p className="text-xs mt-2 opacity-60 font-bold uppercase tracking-widest">Expected Tuition: ${stats.totalExpected.toLocaleString()}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Outstanding Arrears</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900">${stats.outstanding.toLocaleString()}</h3>
          <p className="text-xs mt-2 text-gray-400 font-bold uppercase tracking-widest">{stats.unpaidStudents} Students Unpaid</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Settled Tuition Accounts</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{stats.paidStudents}/{stats.totalStudents}</h3>
          <p className="text-xs mt-2 text-gray-400 font-bold uppercase tracking-widest">Students Paid in Full</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search payments by student..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          />
        </div>

        <div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div>
          <select 
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.title}>{c.title}</option>
            ))}
            <option value="Advanced Mathematics">Advanced Mathematics</option>
            <option value="Physics 101">Physics 101</option>
            <option value="Introduction to Programming">Introduction to Programming</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student & Course</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Paid</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Outstanding</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reference & Method</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">No payment transactions found.</td></tr>
              ) : (
                filteredPayments.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <p className="font-bold text-gray-900">{p.studentName}</p>
                      <p className="text-xs text-gray-500">{p.courseName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">${p.amountPaid.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">Total: ${p.totalFee.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-red-500">
                      ${p.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'paid' ? 'bg-green-50 text-green-700' : p.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 font-semibold">
                      <p>Ref: {p.referenceNumber || 'N/A'}</p>
                      <p className="text-gray-400">{p.paymentMethod}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => generateReceipt(p)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-50"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-50"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={resetForm} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">{isEditing ? 'Edit Payment Transaction' : 'Record Student Payment'}</h2>
                <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreatePayment} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Select Student</label>
                    <select 
                      required
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.id || s.uid} value={s.id || s.uid}>{s.fullName || s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Select Course</label>
                    <select 
                      required
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id || c.title} value={c.title || c.id}>{c.title || c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Amount Paid ($)</label>
                    <input 
                      required
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Total Course Fee ($)</label>
                    <input 
                      required
                      type="number"
                      value={totalFee}
                      onChange={(e) => setTotalFee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Payment Method</label>
                    <select 
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Credit/Debit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Reference / Receipt Number</label>
                    <input 
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="e.g. REF908123"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" type="button" onClick={resetForm} className="flex-1 py-3">Cancel</Button>
                  <Button type="submit" className="flex-[2] py-3 bg-black text-white hover:bg-gray-800">
                    {isEditing ? 'Save Changes' : 'Record Transaction'}
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
