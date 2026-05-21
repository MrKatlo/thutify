import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Course } from '../types';
import { Card } from './ui/Card';
import { BookOpen, FileText, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import * as cfApi from '../services/cfApi';

export function LessonManagement() {
  const { profile, institutionId } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [profile, institutionId]);

  const fetchData = async () => {
    if (!profile || !institutionId) return;
    setLoading(true);
    try {
      const list = await cfApi.listCourses(institutionId);
      // Fetch modules and lessons for each course
      const detailedCourses = await Promise.all(list.map(async (c: any) => {
        const modules = await cfApi.listModules(c.id);
        const modulesWithLessons = await Promise.all(modules.map(async (m: any) => {
          const lessons = await cfApi.listLessons(m.id);
          return { ...m, lessons };
        }));
        return { ...c, modules: modulesWithLessons };
      }));
      setCourses(detailedCourses);
    } catch (error) {
      console.error("Fetch lessons error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (lessonId: string, currentVal: boolean) => {
    try {
      await cfApi.updateLesson(lessonId, { published: currentVal ? 0 : 1 });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await cfApi.deleteLesson(lessonId);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Lesson Management</h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">
          Overview and management of all course lessons across the institution.
        </p>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-black" /></div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium italic">No courses found.</div>
        ) : (
          courses.map(course => (
            <Card key={course.id} className="p-6">
              <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
                <BookOpen className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-lg text-gray-900">{course.title}</h3>
              </div>
              
              <div className="space-y-6">
                {!course.modules || course.modules.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No modules in this course.</p>
                ) : (
                  course.modules.map((module: any) => (
                    <div key={module.id} className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{module.title}</h4>
                      {!module.lessons || module.lessons.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No lessons</p>
                      ) : (
                        module.lessons.map((lesson: any) => (
                          <div key={lesson.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 border border-gray-100">
                                <FileText className="w-4 h-4 text-gray-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-gray-900 text-sm">{lesson.title}</h5>
                                  {!lesson.published && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Unpublished</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1 max-w-md">{lesson.content}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleTogglePublish(lesson.id, !!lesson.published)} className="p-2 text-gray-400 hover:text-black transition-colors" title={lesson.published ? "Unpublish" : "Publish"}>
                                {lesson.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
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
