import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../ui/Card';
import { BookOpen, FolderOpen, ChevronRight } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import type { Course } from '../../types';

function courseCategory(course: Course) {
  const value = String(course.category || '').trim();
  return value || 'Uncategorized';
}

interface CourseCategoriesProps {
  onOpenCourse?: (courseId: string) => void;
  setActiveTab?: (tab: string) => void;
}

export function CourseCategories({ setActiveTab }: CourseCategoriesProps) {
  const { institutionId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      setLoading(true);
      try {
        const list = await cfApi.listCourses(institutionId);
        setCourses(list || []);
      } catch (err) {
        console.error('Failed to load courses for categories', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Course[]>();
    courses.forEach((course) => {
      const key = courseCategory(course);
      const bucket = map.get(key) || [];
      bucket.push(course);
      map.set(key, bucket);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [courses]);

  const selectedCourses = selectedCategory
    ? grouped.find(([name]) => name === selectedCategory)?.[1] || []
    : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Course Categories</h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">
          Browse courses grouped by subject or department. Set a category when creating or editing a course.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No courses yet. Create a course and assign a category.</p>
          {setActiveTab && (
            <Button onClick={() => setActiveTab('courses/create')} className="mt-4 bg-black text-white">
              Create Course
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {grouped.map(([name, items]) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedCategory(name)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedCategory === name
                    ? 'border-black bg-black text-white shadow-lg'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">{name}</p>
                    <p className={`text-xs mt-1 ${selectedCategory === name ? 'text-white/70' : 'text-gray-400'}`}>
                      {items.length} course{items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <FolderOpen className="w-5 h-5 shrink-0 opacity-70" />
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6 min-h-[280px]">
              {!selectedCategory ? (
                <p className="text-sm text-gray-500 text-center py-16">Select a category to view its courses.</p>
              ) : selectedCourses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-16">No courses in this category.</p>
              ) : (
                <div className="space-y-3">
                  <h2 className="text-lg font-black text-gray-900 mb-4">{selectedCategory}</h2>
                  {selectedCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{course.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{course.status || 'draft'}</p>
                        </div>
                      </div>
                      {setActiveTab && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('courses/all')}
                          className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1 shrink-0"
                        >
                          Manage <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
