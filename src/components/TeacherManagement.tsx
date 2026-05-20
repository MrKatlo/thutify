import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc, 
  QueryDocumentSnapshot,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Button, Card } from './ui/Card';
import { Search, Plus, Mail, Phone, Trash2, Edit, X, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, TeacherProfile } from '../types';

export function TeacherManagement() {
  const { institutionId } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedCourses, setAssignedCourses] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'suspended'>('active');

  useEffect(() => {
    fetchData();
  }, [institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      // 1. Fetch Courses
      const courseSnap = await getDocs(query(collection(db, 'courses'), where('institutionId', '==', institutionId)));
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Fetch Users with role 'teacher'
      const instUserSnap = await getDocs(query(collection(db, 'institutionUsers'), where('institutionId', '==', institutionId), where('role', '==', 'teacher')));
      const teacherUids = new Set(instUserSnap.docs.map(d => d.data().userId));

      const allUsersSnap = await getDocs(collection(db, 'users'));
      const teacherUsers = allUsersSnap.docs
        .filter(d => teacherUids.has(d.id))
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile));

      // 3. Fetch Teacher Profiles and Join
      const combined = await Promise.all(teacherUsers.map(async (user) => {
        const profileSnap = await getDoc(doc(db, 'teachers', user.uid));
        const profileData = profileSnap.exists() ? profileSnap.data() as TeacherProfile : null;
        return {
          id: user.uid,
          user,
          profile: profileData
        };
      }));

      setTeachers(combined);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'teachers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setAssignedCourses([]);
    setStatus('active');
    setIsEditing(false);
    setSelectedTeacher(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;

    try {
      setLoading(true);
      const teacherId = selectedTeacher.id;

      // Update User Profile
      await updateDoc(doc(db, 'users', teacherId), {
        fullName,
        status
      });

      // Update Teacher Profile
      const teacherProfileRef = doc(db, 'teachers', teacherId);
      const profileSnap = await getDoc(teacherProfileRef);

      const profileData: Partial<TeacherProfile> = {
        userId: teacherId,
        phone,
        assignedCourses,
        employeeNumber: selectedTeacher.profile?.employeeNumber || `EMP-${Math.floor(1000 + Math.random() * 9000)}`
      };

      if (profileSnap.exists()) {
        await updateDoc(teacherProfileRef, profileData);
      } else {
        await setDoc(teacherProfileRef, profileData);
      }

      resetForm();
      setShowForm(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setFullName(teacher.user.fullName || '');
    setEmail(teacher.user.email);
    setPhone(teacher.profile?.phone || '');
    setAssignedCourses(teacher.profile?.assignedCourses || []);
    setStatus(teacher.user.status || 'active');
    setIsEditing(true);
    setShowForm(true);
  };

  const toggleStatus = async (teacher: any) => {
    const nextStatus = teacher.user.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'users', teacher.id), { status: nextStatus });
      fetchData();
    } catch (error) {
      console.error("Could not toggle status:", error);
    }
  };

  const handleCourseSelection = (courseId: string) => {
    setAssignedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(c => c !== courseId)
        : [...prev, courseId]
    );
  };

  const filteredTeachers = teachers.filter((t: any) => {
    const matchesSearch = t.user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Teacher Management</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Manage faculty profiles, assigned courses, and review operational status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search teachers by name or email..."
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
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Teacher</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Assigned Courses</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" />
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    No matching teacher profiles found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => (
                  <motion.tr 
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                          {t.user.fullName?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{t.user.fullName}</p>
                          <p className="text-xs text-gray-500">{t.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {t.profile?.assignedCourses && t.profile.assignedCourses.length > 0 ? (
                          t.profile.assignedCourses.map((cId: string) => (
                            <span key={cId} className="text-[10px] bg-gray-100 font-bold px-2 py-0.5 rounded">
                              {courses.find(c => c.id === cId)?.title || cId}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">None assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                      <p className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 opacity-60" /> {t.user.email}</p>
                      <p className="flex items-center gap-1 mt-1"><Phone className="w-3.5 h-3.5 opacity-60" /> {t.profile?.phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(t)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${
                          t.user.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-orange-50 hover:text-orange-700' : 'bg-red-50 text-red-700 hover:bg-green-50 hover:text-green-700'
                        }`}
                      >
                        {t.user.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {t.user.status?.toUpperCase() || 'ACTIVE'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(t)} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg"><Edit className="w-4 h-4" /></button>
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
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Edit Teacher Details</h2>
                <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Address (Read-only)</label>
                    <input 
                      type="email" 
                      readOnly 
                      value={email}
                      className="w-full px-3 py-2 border border-gray-100 bg-gray-50 rounded-xl focus:outline-none text-sm text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Assign Courses (Select multiple)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 max-h-36 overflow-y-auto">
                    {courses.map(course => (
                      <div 
                        key={course.id}
                        onClick={() => handleCourseSelection(course.id)}
                        className={`p-2 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          assignedCourses.includes(course.id) ? 'border-black bg-white shadow-sm' : 'border-transparent hover:bg-gray-100/50'
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-800">{course.title}</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          assignedCourses.includes(course.id) ? 'border-black bg-black text-white' : 'border-gray-300'
                        }`}>
                          {assignedCourses.includes(course.id) && <span className="text-[9px] font-black text-white">✓</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Faculty Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-6">
                  <Button variant="outline" type="button" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="bg-black text-white hover:bg-gray-800">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
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
