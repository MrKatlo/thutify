import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, deleteDoc, doc, updateDoc, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Course } from '../../types';
import { Card, Button } from '../ui/Card';
import { Plus, BookOpen, User, Edit, Trash2, ChevronRight, X } from 'lucide-react';
// Fallback components for framer-motion (install framer-motion to enable animations)
// npm install framer-motion to resolve the module not found error
import { motion, AnimatePresence } from 'framer-motion';
import { CourseDetail } from './CourseDetail';

export function CourseList() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const getMockCourses = (): Course[] => [
    { id: 'c1', title: 'Advanced Mathematics', description: 'Advanced calculus, integration, vectors, and linear algebra. Ideal for engineering students.', teacherId: 't1', teacherName: 'Dr. Sarah Smith', createdAt: new Date() },
    { id: 'c2', title: 'Physics 101', description: 'Classical mechanics, optics, thermodynamics, and electromagnetism. Laboratory guided course.', teacherId: 't2', teacherName: 'Prof. James Wilson', createdAt: new Date() },
    { id: 'c3', title: 'Introduction to Programming', description: 'Master logic, algorithms, loops, arrays and functional programming using modern language paradigms.', teacherId: 't3', teacherName: 'Emily Chen', createdAt: new Date() },
  ];

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedCourses = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
      } as Course));
      setCourses(fetchedCourses.length > 0 ? fetchedCourses : getMockCourses());
    } catch (error) {
      console.warn("Firestore courses fetch failed (likely rules or uninitialized). Falling back to mock courses:", error);
      setCourses(getMockCourses());
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIsEditing(false);
    setSelectedCourse(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (isEditing && selectedCourse) {
        await updateDoc(doc(db, 'courses', selectedCourse.id), {
          title,
          description,
        });
      } else {
        await addDoc(collection(db, 'courses'), {
          title,
          description,
          teacherId: profile.uid,
          teacherName: profile.name,
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

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setTitle(course.title);
    setDescription(course.description);
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Course Management</h1>
          <p className="text-gray-500 mt-1 font-medium">Create and organize your educational content.</p>
        </div>
        {profile?.role !== 'student' && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 w-full md:w-auto">
            <Plus className="w-4 h-4" />
            Create Course
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : courses.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No courses yet</h3>
            <p className="text-gray-500">Get started by creating your first course.</p>
          </div>
        ) : (
          courses.map((course) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="h-full flex flex-col group relative overflow-hidden">
                <div className="mb-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="text-white w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{course.description}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <User className="w-3 h-3" />
                    {course.teacherName || 'Teacher'}
                  </div>
                  <div className="flex items-center gap-2">
                    {profile?.role !== 'student' && (
                      <>
                        <button 
                          onClick={() => handleEdit(course)}
                          className="p-2 text-gray-400 hover:text-black transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(course.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setViewingCourse(course)}
                      className="flex items-center gap-1 text-xs font-bold text-black hover:translate-x-1 transition-transform"
                    >
                      View <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Course Form Modal */}
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
                    {isEditing ? 'Edit Course' : 'Create New Course'}
                  </h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Course Title</label>
                    <input 
                      required
                      value={title}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      placeholder="e.g. Advanced Mathematics"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      required
                      value={description}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all h-32"
                      placeholder="What will students learn in this course?"
                    />
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
                      {isEditing ? 'Save Changes' : 'Create Course'}
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
