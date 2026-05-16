import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Course } from '../../types';
import { Card, Button } from '../ui/Card';
import { Plus, BookOpen, User, Clock, Search } from 'lucide-react';
import { motion } from 'motion/react';

export function CourseList() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedCourses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Course));
      setCourses(fetchedCourses);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await addDoc(collection(db, 'courses'), {
        title: newTitle,
        description: newDesc,
        tutorId: profile.uid,
        tutorName: profile.name,
        createdAt: serverTimestamp(),
      });
      setNewTitle('');
      setNewDesc('');
      setShowForm(false);
      fetchCourses();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'courses');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Courses</h1>
          <p className="text-gray-500 mt-1">Explore and manage educational programs.</p>
        </div>
        {profile?.role !== 'student' && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Course
          </Button>
        )}
      </div>

      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Card title="Create New Course" description="Set up a new educational track for your students.">
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Course Title</label>
                <input 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                  placeholder="e.g. Advanced Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea 
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all h-32"
                  placeholder="What will students learn in this course?"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit">Create Course</Button>
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden hover:shadow-xl transition-all h-full flex flex-col">
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors z-10" />
                  <img 
                    src={`https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=800&q=80`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    alt={course.title}
                  />
                  <div className="absolute top-4 left-4 z-20">
                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-black">
                      COURSE
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-black">{course.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1 italic">{course.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[10px] text-white font-bold">
                        {course.tutorName?.[0] || 'T'}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{course.tutorName || 'Tutor'}</span>
                    </div>
                    <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest px-0 hover:bg-transparent hover:underline underline-offset-4">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && courses.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No courses yet</h3>
          <p className="text-gray-500">Get started by creating your first course.</p>
        </div>
      )}
    </div>
  );
}
