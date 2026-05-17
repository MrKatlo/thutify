import { useState, FormEvent } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Course, Module, Lesson } from '../../types';
import { Button } from '../ui/Card';
import { Plus, ChevronDown, ChevronUp, FileText, Trash2, Edit, Check, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CourseDetailProps {
  course: Course;
  onBack: () => void;
  onUpdate: () => void;
  role: string;
}

export function CourseDetail({ course, onBack, onUpdate, role }: CourseDetailProps) {
  const { profile } = useAuth();
  
  // Roster states
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  
  // Lesson Form states
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [newLessonResource, setNewLessonResource] = useState('');
  const [editingLessonTarget, setEditingLessonTarget] = useState<{ moduleId: string; lesson: Lesson } | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev: string[]) => 
      prev.includes(moduleId) ? prev.filter((id: string) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleToggleLesson = async (lessonId: string, isCompleted: boolean) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        completedLessons: isCompleted ? arrayRemove(lessonId) : arrayUnion(lessonId)
      });
      alert("Lesson completion status updated!");
    } catch (err) {
      console.error("Failed to toggle lesson completion:", err);
    }
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
      alert("Module added successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
    }
  };

  const handleSaveLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!showLessonForm && !editingLessonTarget) return;

    try {
      let updatedModules: Module[] = [];

      if (editingLessonTarget) {
        // Edit Mode
        const { moduleId, lesson } = editingLessonTarget;
        updatedModules = course.modules?.map(m => {
          if (m.id === moduleId) {
            const nextLessons = m.lessons.map(l => l.id === lesson.id ? {
              ...l,
              title: newLessonTitle,
              content: newLessonContent,
              videoUrl: newLessonResource // Save video/resource link
            } : l);
            return { ...m, lessons: nextLessons };
          }
          return m;
        }) || [];
      } else {
        // Create Mode
        const moduleId = showLessonForm!;
        const newLesson: Lesson = {
          id: crypto.randomUUID(),
          title: newLessonTitle,
          content: newLessonContent,
          videoUrl: newLessonResource,
          published: true, // Default to published
          completedBy: []
        };

        updatedModules = course.modules?.map(m => {
          if (m.id === moduleId) {
            return { ...m, lessons: [...m.lessons, newLesson] };
          }
          return m;
        }) || [];
      }

      await updateDoc(doc(db, 'courses', course.id), {
        modules: updatedModules
      });

      // Reset
      setNewLessonTitle('');
      setNewLessonContent('');
      setNewLessonResource('');
      setShowLessonForm(null);
      setEditingLessonTarget(null);
      onUpdate();
      alert(editingLessonTarget ? "Lesson updated successfully!" : "Lesson added successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
    }
  };

  const handleEditLessonSetup = (moduleId: string, lesson: Lesson) => {
    setEditingLessonTarget({ moduleId, lesson });
    setNewLessonTitle(lesson.title);
    setNewLessonContent(lesson.content);
    setNewLessonResource((lesson as any).videoUrl || '');
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const updatedModules = course.modules?.map(m => {
        if (m.id === moduleId) {
          return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
        }
        return m;
      }) || [];

      await updateDoc(doc(db, 'courses', course.id), {
        modules: updatedModules
      });
      onUpdate();
      alert("Lesson deleted successfully.");
    } catch (error) {
      console.error("Failed to delete lesson:", error);
    }
  };

  const handleTogglePublishLesson = async (moduleId: string, lessonId: string, currentVal: boolean) => {
    try {
      const updatedModules = course.modules?.map(m => {
        if (m.id === moduleId) {
          const next = m.lessons.map(l => l.id === lessonId ? { ...l, published: !currentVal } : l);
          return { ...m, lessons: next };
        }
        return m;
      }) || [];

      await updateDoc(doc(db, 'courses', course.id), {
        modules: updatedModules
      });
      onUpdate();
      alert(!currentVal ? "Lesson published successfully!" : "Lesson unpublished successfully!");
    } catch (error) {
      console.error("Failed to toggle lesson visibility:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-bold text-gray-400 hover:text-black transition-colors flex items-center gap-2">
          ← Back to Syllabus List
        </button>
        {role !== 'student' && (
          <Button onClick={() => setShowModuleForm(true)} className="gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4" />
            Add Module
          </Button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-gray-900">{course.title}</h2>
        <p className="text-gray-500 mb-8 max-w-2xl text-sm font-medium">{course.description}</p>

        <div className="space-y-4">
          {course.modules?.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">No classroom modules configured yet.</p>
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
                    <h4 className="font-bold text-gray-900 text-sm">{module.title}</h4>
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
                        {module.lessons
                          .filter(l => role !== 'student' || l.published !== false)
                          .map((lesson) => (
                            <div key={lesson.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 group">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-gray-900 text-sm">{lesson.title}</h5>
                                    {lesson.published === false && (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Unpublished</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">{lesson.content.slice(0, 75)}...</p>
                                  {(lesson as any).videoUrl && (
                                    <a 
                                      href={(lesson as any).videoUrl} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-[10px] text-blue-600 font-bold hover:underline block mt-1"
                                    >
                                      Reference Materials Link
                                    </a>
                                  )}
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
                                    <button 
                                      onClick={() => handleTogglePublishLesson(module.id, lesson.id, lesson.published !== false)}
                                      className="p-2 text-gray-400 hover:text-black transition-colors"
                                      title={lesson.published !== false ? "Unpublish Lesson" : "Publish Lesson"}
                                    >
                                      {lesson.published !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={() => handleEditLessonSetup(module.id, lesson)}
                                      className="p-2 text-gray-400 hover:text-black transition-colors"
                                      title="Edit Content"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteLesson(module.id, lesson.id)}
                                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                      title="Delete Lesson"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
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
                  <Button type="submit" className="flex-1 bg-black text-white hover:bg-gray-800">Create</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Lesson Form (Create/Edit) Modal */}
        {(showLessonForm || editingLessonTarget) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowLessonForm(null); setEditingLessonTarget(null); }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">
                {editingLessonTarget ? 'Edit Lesson' : 'Add New Lesson'}
              </h3>
              <form onSubmit={handleSaveLesson} className="space-y-4">
                <input 
                  required
                  placeholder="Lesson Title"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm"
                />
                <textarea 
                  required
                  placeholder="Lesson Syllabus Description & Instructions"
                  value={newLessonContent}
                  onChange={(e) => setNewLessonContent(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none h-32 text-sm"
                />
                <input 
                  type="url"
                  placeholder="PDF / Lecture Slides Video URL (Optional)"
                  value={newLessonResource}
                  onChange={(e) => setNewLessonResource(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm"
                />
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => { setShowLessonForm(null); setEditingLessonTarget(null); }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-black text-white hover:bg-gray-800">
                    {editingLessonTarget ? 'Save Lesson' : 'Add Lesson'}
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
