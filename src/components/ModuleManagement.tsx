import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Course, Module } from '../types';
import { Card } from './ui/Card';
import { BookOpen, Layers, Edit, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export function ModuleManagement() {
  const { profile, institutionId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile || !institutionId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'courses'), where('institutionId', '==', institutionId));
      const snap = await getDocs(q);
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (courseId: string, moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;
    try {
      const course = courses.find(c => c.id === courseId);
      if (!course) return;
      const updatedModules = course.modules?.filter(m => m.id !== moduleId) || [];
      await updateDoc(doc(db, 'courses', courseId), { modules: updatedModules });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'modules');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Module Management</h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">
          Overview of all course modules across the institution.
        </p>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full" /></div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium">No courses found.</div>
        ) : (
          courses.map(course => (
            <Card key={course.id} className="p-6">
              <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
                <BookOpen className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-lg text-gray-900">{course.title}</h3>
              </div>
              <div className="space-y-3">
                {!course.modules || course.modules.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No modules in this course.</p>
                ) : (
                  course.modules.map(module => (
                    <div key={module.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-black" />
                        <div>
                          <p className="font-bold text-gray-900">{module.title}</p>
                          <p className="text-xs text-gray-500">{module.lessons?.length || 0} lessons</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeleteModule(course.id, module.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
