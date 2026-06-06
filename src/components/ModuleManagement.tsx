import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { useToast } from './ui/Toast';
import { BookOpen, Layers, Trash2, Loader2, Plus, X } from 'lucide-react';
import * as cfApi from '../services/cfApi';

export function ModuleManagement() {
  const { profile, institutionId } = useAuth();
  const toast = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseForModule, setSelectedCourseForModule] = useState<string | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const visibleCourses =
    profile?.role === 'teacher'
      ? courses.filter((course) => (course.teacher_id || course.teacherId) === profile.uid)
      : courses;

  useEffect(() => {
    fetchData();
  }, [profile, institutionId]);

  const fetchData = async () => {
    if (!profile || !institutionId) return;
    setLoading(true);
    try {
      const list = await cfApi.listCourses(institutionId);
      // Fetch modules for each course
      const detailedCourses = await Promise.all(list.map(async (c: any) => {
        const modules = await cfApi.listModules(c.id);
        return { ...c, modules };
      }));
      setCourses(detailedCourses);
    } catch (error) {
      console.error("Fetch modules error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;
    try {
      await cfApi.deleteModule(moduleId);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenAddModule = (courseId: string) => {
    setSelectedCourseForModule(courseId);
    setNewModuleTitle('');
  };

  const handleAddModule = async (event: FormEvent) => {
    event.preventDefault();
    if (!institutionId || !selectedCourseForModule || !newModuleTitle.trim()) return;
    try {
      await cfApi.createModule(institutionId, selectedCourseForModule, { title: newModuleTitle.trim() });
      setSelectedCourseForModule(null);
      setNewModuleTitle('');
      fetchData();
      toast.success('Module created successfully.');
    } catch (error) {
      console.error('Create module failed:', error);
      toast.error('Could not create module.');
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
          <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-black" /></div>
        ) : visibleCourses.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium italic">No courses found.</div>
        ) : (
          visibleCourses.map(course => (
            <Card key={course.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <h3 className="font-bold text-lg text-gray-900">{course.title}</h3>
                </div>
                {(profile?.role === 'teacher' || profile?.role === 'owner') && (
                  <button
                    onClick={() => handleOpenAddModule(course.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-black hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Module
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {!course.modules || course.modules.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No modules in this course.</p>
                ) : (
                  course.modules.map((module: any) => (
                    <div key={module.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-black" />
                        <div>
                          <p className="font-bold text-gray-900">{module.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeleteModule(module.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
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
      {selectedCourseForModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedCourseForModule(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black">Add Module</h2>
                <p className="text-sm text-gray-500">Create a new module for this course.</p>
              </div>
              <button onClick={() => setSelectedCourseForModule(null)} className="p-2 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddModule} className="space-y-4">
              <input
                required
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="Module title"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black/10"
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setSelectedCourseForModule(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                  Create Module
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
