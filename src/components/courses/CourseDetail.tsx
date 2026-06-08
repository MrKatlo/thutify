import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Card';
import { Plus, ChevronDown, ChevronUp, FileText, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as cfApi from '../../services/cfApi';
import { LessonCreationWizard } from './LessonCreationWizard';
import { LessonReader } from './LessonReader';
import { CourseMaterialsPanel } from './CourseMaterialsPanel';

interface CourseDetailProps {
  course: any;
  onBack: () => void;
  onUpdate: () => void;
  role: string;
}

export function CourseDetail({ course, onBack, onUpdate, role }: CourseDetailProps) {
  const { profile, institutionId } = useAuth();
  const toast = useToast();
  
  // Data states
  const [modules, setModules] = useState<any[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Roster states
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  
  // Lesson Form states
  const [lessonWizardModule, setLessonWizardModule] = useState<any | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [newLessonResource, setNewLessonResource] = useState('');
  const [editingLessonTarget, setEditingLessonTarget] = useState<any | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<{ id: string; title: string } | null>(null);

  // Student active learning flow states
  const [viewingLesson, setViewingLesson] = useState<any | null>(null);

  useEffect(() => {
    fetchModules();
  }, [course.id]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const list = await cfApi.listModules(course.id);
      // Fetch lessons for each module
      const modulesWithLessons = await Promise.all(list.map(async (m: any) => {
        const lessons = await cfApi.listLessons(m.id);
        return { ...m, lessons };
      }));
      setModules(modulesWithLessons);
      
      // Auto-expand first module for students if it has lessons
      if (role === 'student' && modulesWithLessons.length > 0 && expandedModules.length === 0) {
        setExpandedModules([modulesWithLessons[0].id]);
      }
    } catch (err) {
      console.error("Fetch modules failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev: string[]) => 
      prev.includes(moduleId) ? prev.filter((id: string) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleToggleLesson = async (lessonId: string, isCompleted: boolean) => {
    if (!profile) return;
    try {
      await cfApi.updateLessonProgress(lessonId, { completed: !isCompleted });
      toast.success("Lesson progress updated!");
      onUpdate();
    } catch (err) {
      console.error("Failed to toggle lesson completion:", err);
      toast.error("Unable to update lesson progress.");
    }
  };

  const handleAddModule = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    try {
      await cfApi.createModule(institutionId, course.id, { title: newModuleTitle });
      setNewModuleTitle('');
      setShowModuleForm(false);
      fetchModules();
      toast.success("Module added successfully!");
    } catch (error) {
      console.error("Add module failed:", error);
      toast.error("Could not add module.");
    }
  };

  const handleSaveLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId || !editingLessonTarget) return;

    try {
      await cfApi.updateLesson(editingLessonTarget.id, {
        title: newLessonTitle,
        content: newLessonContent,
        videoUrl: newLessonResource,
      });

      setNewLessonTitle('');
      setNewLessonContent('');
      setNewLessonResource('');
      setEditingLessonTarget(null);
      fetchModules();
      toast.success('Lesson updated!');
    } catch (error) {
      console.error('Save lesson failed:', error);
      toast.error('Could not save lesson.');
    }
  };

  const handleRequestDeleteLesson = (lessonId: string, lessonTitle: string) => {
    setLessonToDelete({ id: lessonId, title: lessonTitle });
  };

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;
    try {
      await cfApi.deleteLesson(lessonToDelete.id);
      fetchModules();
      onUpdate();
      toast.success('Lesson deleted successfully.');
    } catch (error) {
      console.error('Delete lesson failed:', error);
      toast.error('Could not delete lesson.');
    } finally {
      setLessonToDelete(null);
    }
  };

  const handleTogglePublishLesson = async (lessonId: string, currentVal: boolean) => {
    try {
      await cfApi.updateLesson(lessonId, { published: currentVal ? 0 : 1 });
      fetchModules();
    } catch (error) {
      console.error("Toggle publish failed:", error);
    }
  };

  if (viewingLesson) {
    return <LessonReader lesson={viewingLesson} course={course} onBack={() => setViewingLesson(null)} />;
  }

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
        <p className="text-gray-500 mb-6 max-w-2xl text-sm font-medium">{course.description}</p>

        {institutionId && (
          <div className="mb-8 rounded-2xl border border-gray-100 bg-gray-50/40 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Course materials</h3>
            <CourseMaterialsPanel institutionId={institutionId} courseId={course.id} />
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-2xl animate-pulse" />
          ) : modules.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium italic">No classroom modules configured yet.</p>
            </div>
          ) : (
            modules.map((module, idx) => (
              <div key={module.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                      {idx + 1}
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
                      className="border-t border-gray-50 bg-gray-50/20 overflow-hidden"
                    >
                      <div className="p-5 space-y-3">
                        {(module.lessons || [])
                          .filter((l: any) => role !== 'student' || l.published)
                          .map((lesson: any) => (
                            <div key={lesson.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 group gap-4 hover:border-black/10 transition-all">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-gray-900 text-sm truncate">{lesson.title}</h5>
                                    {!lesson.published && (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Draft</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{lesson.content?.slice(0, 100)}...</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {role === 'student' ? (
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      onClick={() => setViewingLesson(lesson)}
                                      className="text-xs py-1.5 bg-black text-white hover:bg-gray-800"
                                    >
                                      Study Lesson
                                    </Button>
                                    <button 
                                      onClick={() => handleToggleLesson(lesson.id, lesson.completed)}
                                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                        lesson.completed
                                          ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                          : 'border-gray-200 text-gray-400 hover:text-black'
                                      }`}
                                    >
                                      {lesson.completed ? '✓ Completed' : 'Mark Done'}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      onClick={() => setViewingLesson(lesson)}
                                      className="text-xs py-1.5 bg-black text-white hover:bg-gray-800"
                                    >
                                      Preview Lesson
                                    </Button>
                                    <button 
                                      onClick={() => handleTogglePublishLesson(lesson.id, !!lesson.published)}
                                      className="p-2 text-gray-400 hover:text-black transition-colors"
                                    >
                                      {lesson.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={() => { setEditingLessonTarget(lesson); setNewLessonTitle(lesson.title); setNewLessonContent(lesson.content); setNewLessonResource(lesson.videoUrl || ''); }}
                                      className="p-2 text-gray-400 hover:text-black transition-colors"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleRequestDeleteLesson(lesson.id, lesson.title)}
                                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
                            onClick={() => setLessonWizardModule(module)}
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

      <AnimatePresence>
        {showModuleForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModuleForm(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
              <h3 className="text-xl font-black mb-6">Add New Module</h3>
              <form onSubmit={handleAddModule} className="space-y-4">
                <input required placeholder="Module Title" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black" />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowModuleForm(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-black text-white">Create</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {lessonWizardModule && (
          <LessonCreationWizard
            module={lessonWizardModule}
            course={course}
            institutionId={institutionId}
            onClose={() => setLessonWizardModule(null)}
            onCreated={() => {
              setLessonWizardModule(null);
              fetchModules();
              onUpdate();
            }}
          />
        )}

        {(editingLessonTarget) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setEditingLessonTarget(null); }} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
              <h3 className="text-xl font-black mb-6">Edit Lesson</h3>
              <form onSubmit={handleSaveLesson} className="space-y-4">
                <input required placeholder="Lesson Title" value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black" />
                <textarea required placeholder="Content / Description" value={newLessonContent} onChange={(e) => setNewLessonContent(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none h-32" />
                <input type="url" placeholder="Resource / Video URL" value={newLessonResource} onChange={(e) => setNewLessonResource(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setEditingLessonTarget(null); }} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-black text-white">Save</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {lessonToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLessonToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="rounded-3xl bg-amber-50 p-3">
                  <EyeOff className="w-5 h-5 text-amber-700" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-gray-900">Delete lesson</h3>
                  <p className="text-sm text-gray-600">Are you sure you want to delete “{lessonToDelete.title}”? This action cannot be undone.</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setLessonToDelete(null)}>
                      Cancel
                    </Button>
                    <Button type="button" className="bg-red-600 text-white" onClick={handleDeleteLesson}>
                      Delete lesson
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {viewingLesson && (
          <LessonReader lesson={viewingLesson} course={course} onBack={() => setViewingLesson(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
