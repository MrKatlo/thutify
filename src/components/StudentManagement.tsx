import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, deleteDoc, doc, updateDoc, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Button, Card } from './ui/Card';
import { Search, Plus, Mail, Phone, Trash2, Edit, X, ShieldAlert, CheckCircle, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('unpaid');
  const [totalFee, setTotalFee] = useState<number>(1000);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  const getMockStudents = () => [
    { id: 's1', fullName: 'Alex Johnson', email: 'alex@example.com', phone: '+1 234 567 890', courseId: 'Advanced Mathematics', status: 'active', paymentStatus: 'paid', totalFee: 1000, amountPaid: 1000, balance: 0, enrollmentDate: new Date() },
    { id: 's2', fullName: 'Maria Garcia', email: 'maria@example.com', phone: '+1 987 654 321', courseId: 'Physics 101', status: 'active', paymentStatus: 'partial', totalFee: 1000, amountPaid: 400, balance: 600, enrollmentDate: new Date() },
    { id: 's3', fullName: 'James Wilson', email: 'james@example.com', phone: '+1 555 444 333', courseId: 'Introduction to Programming', status: 'suspended', paymentStatus: 'unpaid', totalFee: 1200, amountPaid: 0, balance: 1200, enrollmentDate: new Date() },
  ];

  const fetchCourses = async () => {
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(list);
    } catch (err) {
      console.warn("Could not load courses collection for student picker:", err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), orderBy('enrollmentDate', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(fetched.length > 0 ? fetched : getMockStudents());
    } catch (error) {
      console.warn("Firestore students fetch failed (permission or empty). Loading mock list:", error);
      setStudents(getMockStudents());
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setCourseId('');
    setStatus('active');
    setPaymentStatus('unpaid');
    setTotalFee(1000);
    setAmountPaid(0);
    setIsEditing(false);
    setSelectedStudent(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const balance = Number(totalFee) - Number(amountPaid);
    
    // Automatically calculate paymentStatus if paid in full
    let finalPaymentStatus = paymentStatus;
    if (Number(amountPaid) >= Number(totalFee)) {
      finalPaymentStatus = 'paid';
    } else if (Number(amountPaid) > 0) {
      finalPaymentStatus = 'partial';
    } else {
      finalPaymentStatus = 'unpaid';
    }

    try {
      if (isEditing && selectedStudent) {
        const studentDoc = doc(db, 'students', selectedStudent.id);
        await updateDoc(studentDoc, {
          fullName,
          email,
          phone,
          courseId,
          status,
          paymentStatus: finalPaymentStatus,
          totalFee: Number(totalFee),
          amountPaid: Number(amountPaid),
          balance: Number(balance)
        });
      } else {
        await addDoc(collection(db, 'students'), {
          fullName,
          email,
          phone,
          courseId,
          status,
          paymentStatus: finalPaymentStatus,
          totalFee: Number(totalFee),
          amountPaid: Number(amountPaid),
          balance: Number(balance),
          enrollmentDate: serverTimestamp()
        });
      }
      resetForm();
      setShowForm(false);
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'students');
    }
  };

  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    setFullName(student.fullName || '');
    setEmail(student.email);
    setPhone(student.phone || '');
    setCourseId(student.courseId || '');
    setStatus(student.status || 'active');
    setPaymentStatus(student.paymentStatus || 'unpaid');
    setTotalFee(student.totalFee || 1000);
    setAmountPaid(student.amountPaid || 0);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this student?')) return;
    try {
      await deleteDoc(doc(db, 'students', studentId));
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
    }
  };

  const toggleStatus = async (student: any) => {
    const nextStatus = student.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'students', student.id), { status: nextStatus });
      fetchStudents();
    } catch (error) {
      console.error("Could not toggle status:", error);
    }
  };

  const filteredStudents = students.filter((s: any) => {
    const matchesSearch = s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || s.paymentStatus === paymentFilter;
    const matchesCourse = courseFilter === 'all' || s.courseId === courseFilter;
    return matchesSearch && matchesStatus && matchesPayment && matchesCourse;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Student Management</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Manage enrollments, active courses, payment balances, and status logs.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4" /> Add Student
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search students..."
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
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>

        <div>
          <select 
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
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
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Course & Enrollment</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Financial Ledger</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    No matching student profiles found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <motion.tr 
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                          {s.fullName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{s.fullName}</p>
                          <p className="text-xs text-gray-500">{s.email}</p>
                          <p className="text-xs text-gray-400">{s.phone || 'No Phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{s.courseId || 'Unassigned'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Enrolled: {s.enrollmentDate ? 'Verified Live' : 'Recent Mock'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' : s.paymentStatus === 'partial' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                      <p>Total: ${s.totalFee || 1000}</p>
                      <p className="text-green-600">Paid: ${s.amountPaid || 0}</p>
                      <p className="text-red-500">Balance: ${s.balance !== undefined ? s.balance : (s.totalFee - s.amountPaid)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(s)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${
                          s.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-orange-50 hover:text-orange-700' : 'bg-red-50 text-red-700 hover:bg-green-50 hover:text-green-700'
                        }`}
                      >
                        {s.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {s.status?.toUpperCase() || 'ACTIVE'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(s)} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={resetForm} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">{isEditing ? 'Edit Student Details' : 'Register New Student'}</h2>
                <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Enrolled Course</label>
                    <select 
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="">Select a Course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.title}>{c.title}</option>
                      ))}
                      <option value="Advanced Mathematics">Advanced Mathematics</option>
                      <option value="Physics 101">Physics 101</option>
                      <option value="Introduction to Programming">Introduction to Programming</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Total Tuition Fee ($)</label>
                    <input 
                      type="number" 
                      required
                      value={totalFee}
                      onChange={(e) => setTotalFee(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tuition Paid ($)</label>
                    <input 
                      type="number" 
                      required
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Account Status</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Calculated Balance ($)</label>
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                      ${totalFee - amountPaid}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-6">
                  <Button variant="outline" type="button" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                    {isEditing ? 'Save Changes' : 'Register Student'}
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
