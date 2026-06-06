import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../ui/Card';
import { BookOpen } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import type { Course } from '../../types';
import {
  CURRICULUM_LEVELS,
  CURRICULUM_COLORS,
  UNCATEGORIZED_LABEL,
  resolveCurriculumLevel,
} from '../../lib/curriculum';

interface CourseCategoriesProps {
  setActiveTab?: (tab: string) => void;
}

export function CourseCategories({ setActiveTab }: CourseCategoriesProps) {
  const { institutionId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>(CURRICULUM_LEVELS[0]);

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      setLoading(true);
      try {
        const list = await cfApi.listCourses(institutionId);
        setCourses(list || []);
      } catch (err) {
        console.error('Failed to load curriculum courses', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Course[]>();
    [...CURRICULUM_LEVELS, UNCATEGORIZED_LABEL].forEach((level) => map.set(level, []));
    courses.forEach((course) => {
      const key = resolveCurriculumLevel(course.category);
      const bucket = map.get(key) || [];
      bucket.push(course);
      map.set(key, bucket);
    });
    return map;
  }, [courses]);

  const sidebarLevels = [...CURRICULUM_LEVELS, UNCATEGORIZED_LABEL];
  const selectedCourses = grouped.get(selectedLevel) || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Curriculum</h1>
        <p className="text-sm text-gray-500 mt-1">Courses by school level.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-gray-500 text-sm">No courses yet.</p>
          {setActiveTab && (
            <Button onClick={() => setActiveTab('courses/create')} className="mt-4 bg-black text-white">
              Create course
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {sidebarLevels.map((level) => {
              const count = grouped.get(level)?.length || 0;
              const color = CURRICULUM_COLORS[level] || '#9ca3af';
              const active = selectedLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedLevel(level)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    active ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: active ? '#fff' : color }}
                      />
                      <span className="font-semibold text-sm truncate">{level}</span>
                    </div>
                    <span className={`text-xs font-bold ${active ? 'text-white/80' : 'text-gray-400'}`}>{count}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            <Card className="p-5 min-h-[260px]">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{selectedLevel}</h2>
              {selectedCourses.length === 0 ? (
                <p className="text-sm text-gray-500 py-12 text-center">No courses in this level yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60"
                    >
                      <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-900 truncate">{course.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{course.status || 'draft'}</p>
                      </div>
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
