import { useState, FormEvent } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Course, Module, Lesson } from '../../types';
import { Button } from '../ui/Card';
import { Plus, ChevronDown, ChevronUp, FileText, Trash2, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CourseDetailProps {
  course: Course;
  onBack: () => void;
  onUpdate: () => void;
  role: string;
}

export function CourseDetail({ course, onBack, onUpdate, role }: CourseDetailProps) {
  const { profile } = useAuth();
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const handleToggleLesson = async (lessonId: string, isCompleted: boolean) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        completedLessons: isCompleted ? arrayRemove(lessonId) : arrayUnion(lessonId)
      });
    } catch (err) {
      console.error("Failed to toggle lesson completion:", err);
    }
  };
  
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev: string[]) => 
      prev.includes(moduleId) ? prev.filter((id: string) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleAddModule = async (e: FormEvent) => {
    e.preventDefault();
    const newModule: Module = {
      id: crypto.randomUUID(),
      title: newModuleTitle,
      lessons: []
    };

    try {
      await updateDoc(doc(db, 'courses', course.id), {
        modules: arrayUnion(newModule)
      });
      setNewModuleTitle('');
      setShowModuleForm(false);
      onUpdate();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
    }
  };

  const handleAddLesson = async (e: FormEvent, moduleId: string) => {
    e.preventDefault();
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      title: newLessonTitle,
      content: newLessonContent,
      completedBy: []
    };

    try {
      const updatedModules = course.modules?.map(m => {
        if (m.id === moduleId) {
          return { ...m, lessons: [...m.lessons, newLesson] };
        }
        return m;
      }) || [];

      await updateDoc(doc(db, 'courses', course.id), {
        modules: updatedModules
      });
      setNewLessonTitle('');
      setNewLessonContent('');
      setShowLessonForm(null);
      onUpdate();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-bold text-gray-400 hover:text-black transition-colors flex items-center gap-2">
          ← Back to Courses
        </button>
        {role !== 'student' && (
          <Button onClick={() => setShowModuleForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Module
          </Button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">{course.title}</h2>
        <p className="text-gray-500 mb-8 max-w-2xl">{course.description}</p>

        <div className="space-y-4">
          {course.modules?.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">No modules added yet.</p>
            </div>
          ) : (
            course.modules?.map((module) => (
              <div key={module.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-500 text-xs">
                      {course.modules!.indexOf(module) + 1}
                    </div>
                    <h4 className="font-bold text-gray-900">{module.title}</h4>
                  </div>
                  {expandedModules.includes(module.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {expandedModules.includes(module.id) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-50 bg-gray-50/30 overflow-hidden"
                    >
                      <div className="p-5 space-y-3">
                        {module.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <h5 className="font-bold text-gray-900">{lesson.title}</h5>
                                <p className="text-xs text-gray-500">{lesson.content.slice(0, 50)}...</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {role === 'student' ? (
                                <button 
                                  onClick={() => handleToggleLesson(lesson.id, profile?.completedLessons?.includes(lesson.id) || false)}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                    profile?.completedLessons?.includes(lesson.id)
                                      ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100/70'
                                      : 'border-gray-200 text-gray-400 hover:text-black'
                                  }`}
                                >
                                  {profile?.completedLessons?.includes(lesson.id) ? '✓ Completed' : 'Mark Complete'}
                                </button>
                              ) : (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                  <button className="p-2 text-gray-400 hover:text-black transition-colors"><Edit className="w-4 h-4" /></button>
                                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {role !== 'student' && (
                          <button 
                            onClick={() => setShowLessonForm(module.id)}
                            className="w-full py-3 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:text-black hover:border-black transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add Lesson
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Module Form Modal */}
      <AnimatePresence>
        {showModuleForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModuleForm(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">Add New Module</h3>
              <form onSubmit={handleAddModule} className="space-y-4">
                <input 
                  required
                  placeholder="Module Title"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none"
                />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowModuleForm(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1">Create</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showLessonForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLessonForm(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">Add New Lesson</h3>
              <form onSubmit={(e) => handleAddLesson(e, showLessonForm)} className="space-y-4">
                <input 
                  required
                  placeholder="Lesson Title"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none"
                />
                <textarea 
                  required
                  placeholder="Lesson Content"
                  value={newLessonContent}
                  onChange={(e) => setNewLessonContent(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none h-32"
                />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowLessonForm(null)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1">Add Lesson</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
