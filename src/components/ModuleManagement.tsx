import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from './ui/Card';
import { BookOpen, Layers, Trash2, Loader2 } from 'lucide-react';
import * as cfApi from '../services/cfApi';

export function ModuleManagement() {
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
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-medium italic">No courses found.</div>
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
    </div>
  );
}
