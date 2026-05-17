import { useState, FormEvent } from 'react';
import { doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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

  // Student active learning flow states
  const [activeStudyLesson, setActiveStudyLesson] = useState<Lesson | null>(null);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev: string[]) => 
      prev.includes(moduleId) ? prev.filter((id: string) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const trackLessonOpened = async (lesson: Lesson) => {
    if (!profile) return;
    try {
      localStorage.setItem(`last_lesson_${course.id}`, lesson.id);
      const progressId = `${profile.uid}-${lesson.id}`;
      await setDoc(doc(db, 'lessonProgress', progressId), {
        studentId: profile.uid,
        courseId: course.id,
        lessonId: lesson.id,
        completed: profile.completedLessons?.includes(lesson.id) || false,
        lastOpenedAt: new Date()
      }, { merge: true });
    } catch (err) {
      console.warn("Could not track lesson progress in Firestore:", err);
    }
  };

  const handleToggleLesson = async (lessonId: string, isCompleted: boolean) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        completedLessons: isCompleted ? arrayRemove(lessonId) : arrayUnion(lessonId)
      });
      
      const progressId = `${profile.uid}-${lessonId}`;
      await setDoc(doc(db, 'lessonProgress', progressId), {
        studentId: profile.uid,
        courseId: course.id,
        lessonId,
        completed: !isCompleted,
        completedAt: !isCompleted ? new Date() : null,
        lastOpenedAt: new Date()
      }, { merge: true });

      alert("Lesson completion status updated!");
      onUpdate();
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
                            <div key={lesson.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 group gap-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-gray-900 text-sm truncate">{lesson.title}</h5>
                                    {lesson.published === false && (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Unpublished</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{lesson.content.slice(0, 100)}...</p>
                                  {(lesson as any).videoUrl && (
                                    <span className="inline-block text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded mt-1">
                                      Contains study material
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                {role === 'student' ? (
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      onClick={() => {
                                        setActiveStudyLesson(lesson);
                                        trackLessonOpened(lesson);
                                      }}
                                      className="text-xs py-1.5 bg-black text-white hover:bg-gray-800"
                                    >
                                      Study Lesson
                                    </Button>
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
                                  </div>
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

      {/* Student Study Lesson Modal */}
      <AnimatePresence>
        {activeStudyLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActiveStudyLesson(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Study Workspace</span>
                  <h3 className="text-2xl font-black text-gray-900 mt-1">{activeStudyLesson.title}</h3>
                </div>
                <button 
                  onClick={() => setActiveStudyLesson(null)} 
                  className="p-1 hover:bg-gray-100 rounded-lg font-bold text-gray-500 hover:text-black text-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Responsive Embedded Resource / Video Player */}
                {(activeStudyLesson as any).videoUrl ? (
                  <div className="w-full bg-black rounded-2xl overflow-hidden aspect-video relative flex flex-col items-center justify-center p-4">
                    {/* Simulated premium dynamic player */}
                    <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-xs" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80')` }} />
                    <div className="z-10 text-center space-y-4 max-w-md">
                      <span className="inline-block bg-blue-500 text-white font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                        Premium Lesson Materials
                      </span>
                      <h4 className="text-white text-lg font-black tracking-tight truncate">{(activeStudyLesson as any).videoUrl.split('/').pop()}</h4>
                      <p className="text-gray-300 text-xs">Interactive video streams and lecture slides are loaded securely.</p>
                      <div className="flex justify-center gap-3">
                        <a 
                          href={(activeStudyLesson as any).videoUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-white hover:bg-gray-100 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                        >
                          Launch Material
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 rounded-2xl text-center border border-gray-100">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">No external attachments configured for this lecture.</p>
                  </div>
                )}

                {/* Lesson text content */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider">Syllabus Details</h4>
                  <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-line font-medium">
                    {activeStudyLesson.content}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <button 
                    onClick={() => handleToggleLesson(activeStudyLesson.id, profile?.completedLessons?.includes(activeStudyLesson.id) || false)}
                    className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border font-bold text-xs transition-all active:scale-95 ${
                      profile?.completedLessons?.includes(activeStudyLesson.id)
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-gray-200 bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {profile?.completedLessons?.includes(activeStudyLesson.id) ? '✓ Completed' : 'Mark Lesson as Completed'}
                  </button>

                  <Button 
                    onClick={() => setActiveStudyLesson(null)}
                    variant="outline"
                    className="py-3 px-6 text-xs"
                  >
                    Close Workspace
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
