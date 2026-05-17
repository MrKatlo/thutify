import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, deleteDoc, doc, updateDoc, QueryDocumentSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Course } from '../../types';
import { Card, Button } from '../ui/Card';
import { Plus, BookOpen, User, Edit, Trash2, ChevronRight, X, DollarSign, Award, CheckCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CourseDetail } from './CourseDetail';

export function CourseList() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [viewingCourse, setViewingCourse] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [fee, setFee] = useState<number>(1000);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  const getMockCourses = (): any[] => [
    { id: 'c1', title: 'Advanced Mathematics', description: 'Advanced calculus, integration, vectors, and linear algebra. Ideal for engineering students.', teacherId: 't1', teacherName: 'Dr. Sarah Smith', fee: 1000, status: 'published', createdAt: new Date() },
    { id: 'c2', title: 'Physics 101', description: 'Classical mechanics, optics, thermodynamics, and electromagnetism. Laboratory guided course.', teacherId: 't2', teacherName: 'Prof. James Wilson', fee: 1200, status: 'published', createdAt: new Date() },
    { id: 'c3', title: 'Introduction to Programming', description: 'Master logic, algorithms, loops, arrays and functional programming using modern language paradigms.', teacherId: 't3', teacherName: 'Emily Chen', fee: 900, status: 'draft', createdAt: new Date() },
  ];

  const fetchTeachers = async () => {
    try {
      const snap = await getDocs(collection(db, 'teachers'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(list);
    } catch (err) {
      console.warn("Could not load teachers for course picker:", err);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedCourses = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(fetchedCourses.length > 0 ? fetchedCourses : getMockCourses());
    } catch (error) {
      console.warn("Firestore courses fetch failed. Loading mock courses:", error);
      setCourses(getMockCourses());
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTeacherId('');
    setFee(1000);
    setStatus('draft');
    setIsEditing(false);
    setSelectedCourse(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const assignedTeacher = teachers.find(t => t.id === teacherId || t.uid === teacherId);
    const teacherName = assignedTeacher ? assignedTeacher.fullName || assignedTeacher.name : 'Unassigned';

    try {
      if (isEditing && selectedCourse) {
        await updateDoc(doc(db, 'courses', selectedCourse.id), {
          title,
          description,
          teacherId,
          teacherName,
          fee: Number(fee),
          status
        });
      } else {
        await addDoc(collection(db, 'courses'), {
          title,
          description,
          teacherId,
          teacherName,
          fee: Number(fee),
          status,
          createdAt: serverTimestamp(),
          modules: []
        });
      }
      resetForm();
      setShowForm(false);
      fetchCourses();
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'courses');
    }
  };

  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setTitle(course.title);
    setDescription(course.description);
    setTeacherId(course.teacherId || '');
    setFee(course.fee || 1000);
    setStatus(course.status || 'draft');
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      fetchCourses();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}`);
    }
  };

  const togglePublishStatus = async (course: any) => {
    const nextStatus = course.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'courses', course.id), { status: nextStatus });
      fetchCourses();
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
    }
  };

  const handleEnrollment = async (course: any, action: 'enroll' | 'drop') => {
    if (!profile) return;
    try {
      // In student flows, save enrolledCourses on their user document
      await updateDoc(doc(db, 'users', profile.uid), {
        enrolledCourses: action === 'enroll' ? arrayUnion(course.title) : arrayRemove(course.title)
      });
      alert(`Successfully ${action === 'enroll' ? 'enrolled in' : 'dropped'} ${course.title}!`);
    } catch (err) {
      console.error("Failed to update course enrollment:", err);
    }
  };

  // Filter out drafts for students
  const filteredCourses = courses.filter(c => {
    if (profile?.role === 'student' && c.status !== 'published') {
      return false;
    }
    return true;
  });

  if (viewingCourse && profile) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <CourseDetail 
          course={viewingCourse} 
          onBack={() => {
            setViewingCourse(null);
            fetchCourses();
          }} 
          onUpdate={fetchCourses}
          role={profile.role}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Course Management</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Create courses, assign instructors, configure tuition fees, and manage syllabus modules.</p>
        </div>
        {profile?.role === 'admin' && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Create Course
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredCourses.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No courses yet</h3>
            <p className="text-gray-500">Get started by creating your first course.</p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="h-full flex flex-col group relative overflow-hidden p-6 border border-gray-100 hover:shadow-lg transition-all">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center group-hover:scale-115 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    {profile?.role === 'admin' && (
                      <button 
                        onClick={() => togglePublishStatus(course)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          course.status === 'published' ? 'bg-green-50 text-green-700 hover:bg-orange-50 hover:text-orange-700' : 'bg-amber-50 text-amber-700 hover:bg-green-50 hover:text-green-700'
                        }`}
                      >
                        {course.status === 'published' ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {course.status || 'draft'}
                      </button>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{course.description}</p>
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                    <span className="flex items-center gap-1 text-gray-400"><User className="w-3.5 h-3.5" /> Instructor:</span>
                    <span>{course.teacherName || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                    <span className="flex items-center gap-1 text-gray-400"><DollarSign className="w-3.5 h-3.5" /> Tuition Fee:</span>
                    <span className="text-black font-black">${course.fee || 1000}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <button 
                    onClick={() => setViewingCourse(course)}
                    className="text-xs font-black text-black hover:underline underline-offset-4 flex items-center gap-1 uppercase tracking-widest"
                  >
                    View Syllabus <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    {profile?.role === 'admin' && (
                      <>
                        <button 
                          onClick={() => handleEdit(course)}
                          className="p-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(course.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {profile?.role === 'student' && (
                      <Button 
                        onClick={() => handleEnrollment(course, 'enroll')}
                        className="text-xs bg-black text-white hover:bg-gray-800"
                      >
                        Enroll Now
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={resetForm} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">{isEditing ? 'Modify Course Details' : 'Launch New Course'}</h2>
                <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Course Title</label>
                  <input 
                    type="text" 
                    required 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Course Description</label>
                  <textarea 
                    required 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Assign Instructor</label>
                    <select 
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="">Select Instructor</option>
                      {teachers.map(t => (
                        <option key={t.id || t.uid} value={t.id || t.uid}>{t.fullName || t.name}</option>
                      ))}
                      <option value="t1">Dr. Sarah Smith</option>
                      <option value="t2">Prof. James Wilson</option>
                      <option value="t3">Emily Chen</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tuition Fee ($)</label>
                    <input 
                      type="number" 
                      required 
                      value={fee}
                      onChange={(e) => setFee(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Publish Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="draft">Draft (Hidden from students)</option>
                    <option value="published">Published (Visible to students)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-6">
                  <Button variant="outline" type="button" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                    {isEditing ? 'Save Changes' : 'Create Course'}
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
