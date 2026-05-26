import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button, Card } from '../ui/Card';
import { BookOpen, Layers, FileText, Loader2, ChevronRight } from 'lucide-react';
import { CourseDetail } from './CourseDetail';
import * as cfApi from '../../services/cfApi';

export function CourseSyllabus() {
  const { profile, institutionId } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!institutionId) return;
      setLoading(true);
      try {
        const list = await cfApi.listCourses(institutionId);
        setCourses(list);
      } catch (err) {
        console.error('Failed to load syllabus courses:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [institutionId]);

  if (selectedCourse) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <CourseDetail
          course={selectedCourse}
          onBack={() => setSelectedCourse(null)}
          onUpdate={async () => {
            const list = await cfApi.listCourses(institutionId || '');
            setCourses(list);
          }}
          role={profile?.role || 'teacher'}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Course Syllabus</h1>
          <p className="text-gray-500 mt-1 text-sm max-w-2xl">
            Review course outlines, module plans, and lesson structure for the institution.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">School content</p>
          <p className="font-bold text-gray-900">{courses.length} courses</p>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-black" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="mx-auto mb-4 w-12 h-12 text-gray-300" />
            <p className="text-sm font-bold text-gray-900">No course syllabus available yet.</p>
            <p className="text-xs text-gray-500 mt-2">Create a course from the Courses tab to start adding modules and lessons.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div key={course.id} className="border border-gray-100 rounded-3xl p-6 bg-white shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-3xl bg-black text-white flex items-center justify-center text-lg font-black">
                    {course.title?.charAt(0) || 'C'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">{course.title}</h2>
                    <p className="text-sm text-gray-500 line-clamp-3 mt-1">{course.description || 'No description yet.'}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>Teacher: {course.teacher_id ? course.teacher_id : 'Unassigned'}</p>
                    <p>Status: <span className="font-bold text-gray-900 capitalize">{course.status || 'draft'}</span></p>
                  </div>
                  <Button onClick={() => setSelectedCourse(course)} className="bg-black text-white hover:bg-gray-800 gap-2">
                    Open Syllabus
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
