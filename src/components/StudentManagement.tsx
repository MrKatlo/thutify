import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, deleteDoc, doc, updateDoc, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { Button } from './ui/Card';
import { Search, Plus, Mail, Phone, Trash2, Edit, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function StudentManagement() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [courseEnrolled, setCourseEnrolled] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('unpaid');

  useEffect(() => {
    fetchStudents();
  }, []);

  const getMockStudents = (): UserProfile[] => [
    { uid: 's1', email: 'alex@example.com', name: 'Alex Johnson', phone: '+1 234 567 890', role: 'student', courseEnrolled: 'Advanced Mathematics', paymentStatus: 'paid', progress: 85, createdAt: new Date() },
    { uid: 's2', email: 'maria@example.com', name: 'Maria Garcia', phone: '+1 987 654 321', role: 'student', courseEnrolled: 'Physics 101', paymentStatus: 'partial', progress: 42, createdAt: new Date() },
    { uid: 's3', email: 'james@example.com', name: 'James Wilson', phone: '+1 555 444 333', role: 'student', courseEnrolled: 'Introduction to Programming', paymentStatus: 'unpaid', progress: 12, createdAt: new Date() },
    { uid: 's4', email: 'emma@example.com', name: 'Emma Davis', phone: '+1 666 777 888', role: 'student', courseEnrolled: 'Advanced Mathematics', paymentStatus: 'paid', progress: 95, createdAt: new Date() },
  ];

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'student'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        ...doc.data(),
        id: doc.id
      } as UserProfile & { id: string }));
      setStudents(fetched.length > 0 ? fetched : getMockStudents());
    } catch (error) {
      console.warn("Firestore students fetch failed (likely rules or uninitialized). Falling back to mock students:", error);
      setStudents(getMockStudents());
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCourseEnrolled('');
    setPaymentStatus('unpaid');
    setIsEditing(false);
    setSelectedStudent(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedStudent) {
        const studentDoc = doc(db, 'users', (selectedStudent as any).id);
        await updateDoc(studentDoc, {
          name,
          email,
          phone,
          courseEnrolled,
          paymentStatus,
        });
      } else {
        const studentId = crypto.randomUUID(); 
        await addDoc(collection(db, 'users'), {
          uid: studentId,
          name,
          email,
          phone,
          role: 'student',
          courseEnrolled,
          paymentStatus,
          progress: 0,
          enrollmentDate: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
      setShowForm(false);
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'users');
    }
  };

  const handleEdit = (student: UserProfile) => {
    setSelectedStudent(student);
    setName(student.name || '');
    setEmail(student.email);
    setPhone(student.phone || '');
    setCourseEnrolled(student.courseEnrolled || '');
    setPaymentStatus(student.paymentStatus || 'unpaid');
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student profile?')) return;
    try {
      await deleteDoc(doc(db, 'users', studentId));
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${studentId}`);
    }
  };

  const filteredStudents = students.filter((s: UserProfile) => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Student Management</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Manage enrollments, payments, and learning progress.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 w-full md:w-auto">
          <Plus className="w-4 h-4" />
          Add Student
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by name or email..."
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
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Course</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</th>
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
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={(student as any).id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 shrink-0">
                          {student.name?.[0] || 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{student.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            ID: {(student as any).id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </div>
                        {student.phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-700">
                        {student.courseEnrolled || 'Not Enrolled'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        student.paymentStatus === 'paid' ? 'bg-green-50 text-green-600' :
                        student.paymentStatus === 'partial' ? 'bg-orange-50 text-orange-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {student.paymentStatus || 'unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                          <div 
                            className="h-full bg-black transition-all duration-500" 
                            style={{ width: `${student.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500">{student.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(student)}
                          className="p-2 text-gray-400 hover:text-black transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete((student as any).id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {isEditing ? 'Edit Student' : 'Add New Student'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="+1 234 567 890"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Enrolled Course</label>
                    <input 
                      value={courseEnrolled}
                      onChange={(e) => setCourseEnrolled(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      placeholder="e.g. Advanced Mathematics"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Payment Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['paid', 'partial', 'unpaid'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setPaymentStatus(status)}
                          className={`py-2 text-[10px] font-bold rounded-lg border-2 transition-all uppercase tracking-wider ${
                            paymentStatus === status 
                            ? 'border-black bg-black text-white' 
                            : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-3"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-[2] py-3"
                    >
                      {isEditing ? 'Save Changes' : 'Create Student'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
