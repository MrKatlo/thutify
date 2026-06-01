import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../ui/Card';
import { BookOpen, Users, CheckCircle2, History, Plus, Trash2 } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import { Course, Enrollment, StudentSummary } from '../../types';

function formatDate(date?: string | number | null): string {
  if (!date) return 'Unknown';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CourseEnrollment() {
  const { profile, institutionId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUnenroll, setPendingUnenroll] = useState<{ id: string; name: string } | null>(null);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  const totalEnrolled = enrollments.length;
  const activeStudents = enrollments.filter((enrollment) => enrollment.status === 'active').length;
  const historyItems = [...enrollments].sort((a, b) => {
    const aTime = new Date(a.enrolledAt || a.enrolled_at || 0).getTime();
    const bTime = new Date(b.enrolledAt || b.enrolled_at || 0).getTime();
    return bTime - aTime;
  });

  const enrolledStudentIds = enrollments.map((enrollment) => enrollment.studentId || enrollment.student_id);
  const availableStudents = students
    .filter((student) => !enrolledStudentIds.includes(student.id))
    .slice()
    .sort((a, b) =>
      String(a.fullName || a.full_name || a.email || '')
        .localeCompare(String(b.fullName || b.full_name || b.email || '')),
    );

  useEffect(() => {
    if (!institutionId) return;
    fetchData();
  }, [institutionId]);

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) return;
    fetchEnrollments(selectedCourseId);
  }, [selectedCourseId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    if (!institutionId) {
      setLoading(false);
      return;
    }

    try {
      const [coursesResponse, studentResponse] = await Promise.all([
        cfApi.listCourses(institutionId),
        cfApi.listStudents(institutionId, { status: 'approved', pagination: { limit: 250 } }),
      ]);

      setCourses(
        (coursesResponse || [])
          .slice()
          .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))),
      );
      setStudents(studentResponse.results || []);
    } catch (err) {
      console.error('Failed to load enrollment data:', err);
      setError('Unable to load course enrollment details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async (courseId: string) => {
    setLoading(true);
    setError(null);
    if (!institutionId) {
      setLoading(false);
      return;
    }

    try {
      const courseEnrollments = await cfApi.listEnrollments(institutionId, courseId);
      setEnrollments(courseEnrollments || []);
      setSelectedStudentId('');
    } catch (err) {
      console.error('Failed to load enrollments:', err);
      setError('Unable to load enrolled students.');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const handleEnrollStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId || !selectedCourseId || !selectedStudentId) return;

    setActionLoading(true);
    setError(null);
    try {
      await cfApi.enrollCourse(institutionId, selectedCourseId, selectedStudentId);
      await fetchEnrollments(selectedCourseId);
    } catch (err) {
      console.error('Enroll student failed:', err);
      setError('Could not enroll student. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveEnrollment = (enrollmentId: string, studentName: string) => {
    if (!enrollmentId) return;
    setPendingUnenroll({ id: enrollmentId, name: studentName });
  };

  const confirmRemoveEnrollment = async () => {
    if (!institutionId || !pendingUnenroll) return;
    setActionLoading(true);
    setError(null);

    try {
      await cfApi.unenrollCourse(pendingUnenroll.id);
      setPendingUnenroll(null);
      await fetchEnrollments(selectedCourseId);
    } catch (err) {
      console.error('Unenroll student failed:', err);
      setError('Unable to remove student from the course.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Course Enrollment</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            Manage enrollment for your courses with a clean, focused workflow.
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-gray-400 font-bold">Selected course</p>
          <div className="rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            {loading && !selectedCourse ? (
              <span className="text-sm text-gray-400">Loading courses...</span>
            ) : selectedCourse ? (
              <span className="text-sm font-semibold text-gray-900">{selectedCourse.title}</span>
            ) : (
              <span className="text-sm text-gray-500">No course selected.</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <Card className="space-y-6 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Enrollment workflow</h2>
              <p className="text-sm text-gray-500">Select a course, view enrolled students, and manage enrollments.</p>
            </div>
            <div className="w-full md:w-auto">
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                disabled={loading || courses.length === 0}
                className="w-full md:w-72 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-black"
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="rounded-3xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 text-blue-600">
                <BookOpen className="w-5 h-5" />
                <span className="text-xs uppercase tracking-[0.3em] font-bold text-gray-400">Total Enrolled</span>
              </div>
              <p className="mt-4 text-3xl font-black text-gray-900">{totalEnrolled}</p>
              <p className="text-sm text-gray-500 mt-1">Students currently enrolled in this course.</p>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs uppercase tracking-[0.3em] font-bold text-gray-400">Active Students</span>
              </div>
              <p className="mt-4 text-3xl font-black text-gray-900">{activeStudents}</p>
              <p className="text-sm text-gray-500 mt-1">Students with active status in this course.</p>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <History className="w-5 h-5" />
                <span className="text-xs uppercase tracking-[0.3em] font-bold text-gray-400">History Entries</span>
              </div>
              <p className="mt-4 text-3xl font-black text-gray-900">{historyItems.length}</p>
              <p className="text-sm text-gray-500 mt-1">Recent enrollment changes and records.</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-6 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Enroll student</h2>
              <p className="text-sm text-gray-500">Pick a student who is not currently enrolled.</p>
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Quick action</div>
          </div>

          <form onSubmit={handleEnrollStudent} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.24em] text-gray-400 mb-2">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={!selectedCourseId || actionLoading || availableStudents.length === 0}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-black"
              >
                <option value="">Choose student to enroll</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName || student.full_name} • {student.email}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              disabled={!selectedCourseId || !selectedStudentId || actionLoading}
              className="w-full gap-2 bg-black text-white hover:bg-gray-900"
            >
              <Plus className="w-4 h-4" /> Enroll Student
            </Button>
            {!selectedCourseId && (
              <div className="text-sm text-gray-500">Select a course before enrolling students.</div>
            )}
            {selectedCourseId && availableStudents.length === 0 && (
              <div className="text-sm text-gray-500">No students are available to enroll in this course.</div>
            )}
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Enrolled students</h2>
              <p className="text-sm text-gray-500">Review the student roster and remove enrollments when needed.</p>
            </div>
            <span className="text-sm font-semibold text-gray-400">{selectedCourse ? selectedCourse.title : 'No course selected'}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-20 rounded-3xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
              No students are currently enrolled in this course.
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => {
                const studentName = enrollment.studentName || enrollment.student_name || 'Student';
                const studentEmail = enrollment.studentEmail || enrollment.student_email || 'No email';
                return (
                  <div key={enrollment.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-5">
                    <div>
                      <p className="font-bold text-gray-900">{studentName}</p>
                      <p className="text-sm text-gray-500 mt-1">{studentEmail}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-gray-400">
                        {enrollment.status === 'active' ? 'Active' : enrollment.status === 'completed' ? 'Completed' : 'Dropped'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatDate(enrollment.enrolledAt || enrollment.enrolled_at)}</p>
                      <p className="text-xs text-gray-500">Enrolled date</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRemoveEnrollment(enrollment.id, studentName)}
                      disabled={actionLoading}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="space-y-6 p-6">
          <div>
            <h2 className="text-xl font-bold">Enrollment history</h2>
            <p className="text-sm text-gray-500">Latest course enrollment events sorted by most recent date.</p>
          </div>

          {historyItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
              No enrollment history is available for this course.
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.slice(0, 10).map((entry) => {
                const studentName = entry.studentName || entry.student_name || 'Student';
                return (
                  <div key={entry.id} className="rounded-3xl border border-gray-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{studentName}</p>
                        <p className="text-xs text-gray-500 mt-1">{entry.status} • {formatDate(entry.enrolledAt || entry.enrolled_at)}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-gray-500">
                        <Users className="w-3 h-3" /> {entry.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      {pendingUnenroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPendingUnenroll(null)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="text-xl font-black text-gray-900">Confirm removal</h3>
            <p className="mt-3 text-sm text-gray-600">
              Remove <span className="font-semibold">{pendingUnenroll.name}</span> from this course? This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPendingUnenroll(null)}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveEnrollment}
                disabled={actionLoading}
                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Remove student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
