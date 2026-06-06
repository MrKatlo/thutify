import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../ui/Card';
import { Plus, Trash2, Users } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import { Course, Enrollment, StudentSummary } from '../../types';

function formatDate(date?: string | number | null): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CourseEnrollment() {
  const { institutionId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [pickedStudentIds, setPickedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUnenroll, setPendingUnenroll] = useState<{ id: string; name: string } | null>(null);

  const enrolledStudentIds = useMemo(
    () => enrollments.map((e) => e.studentId || e.student_id || ''),
    [enrollments],
  );

  const availableStudents = useMemo(
    () =>
      students
        .filter((s) => !enrolledStudentIds.includes(s.id))
        .sort((a, b) =>
          String(a.fullName || a.full_name || '').localeCompare(String(b.fullName || b.full_name || '')),
        ),
    [students, enrolledStudentIds],
  );

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [courseList, studentResponse] = await Promise.all([
          cfApi.listCourses(institutionId),
          cfApi.listStudents(institutionId, { status: 'approved', pagination: { limit: 500 } }),
        ]);
        setCourses((courseList || []).sort((a, b) => String(a.title).localeCompare(String(b.title))));
        setStudents(studentResponse.results || []);
      } catch (err) {
        console.error('Failed to load enrollment data:', err);
        setError('Could not load courses or students.');
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId]);

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!institutionId || !selectedCourseId) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await cfApi.listEnrollments(institutionId, selectedCourseId);
        setEnrollments(rows || []);
        setPickedStudentIds([]);
      } catch (err) {
        console.error('Failed to load enrollments:', err);
        setError('Could not load enrollments for this course.');
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId, selectedCourseId]);

  const toggleStudent = (studentId: string) => {
    setPickedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const toggleAllAvailable = () => {
    if (pickedStudentIds.length === availableStudents.length) {
      setPickedStudentIds([]);
      return;
    }
    setPickedStudentIds(availableStudents.map((s) => s.id));
  };

  const handleBulkEnroll = async () => {
    if (!institutionId || !selectedCourseId || pickedStudentIds.length === 0) return;
    setActionLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        pickedStudentIds.map((studentId) =>
          cfApi.enrollCourse(institutionId, selectedCourseId, studentId),
        ),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0 && failed < pickedStudentIds.length) {
        setError(`${pickedStudentIds.length - failed} enrolled. ${failed} could not be added.`);
      } else if (failed === pickedStudentIds.length) {
        setError('Could not enroll the selected students.');
      }
      const rows = await cfApi.listEnrollments(institutionId, selectedCourseId);
      setEnrollments(rows || []);
      setPickedStudentIds([]);
    } catch (err) {
      console.error('Bulk enroll failed:', err);
      setError('Enrollment failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRemoveEnrollment = async () => {
    if (!institutionId || !pendingUnenroll || !selectedCourseId) return;
    setActionLoading(true);
    try {
      await cfApi.unenrollCourse(pendingUnenroll.id);
      setPendingUnenroll(null);
      const rows = await cfApi.listEnrollments(institutionId, selectedCourseId);
      setEnrollments(rows || []);
    } catch (err) {
      console.error('Unenroll failed:', err);
      setError('Could not remove this student.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Enrollment</h1>
          <p className="text-sm text-gray-500 mt-1">Add students to a course.</p>
        </div>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          disabled={loading || courses.length === 0}
          className="w-full sm:w-72 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black"
        >
          {courses.length === 0 ? <option value="">No courses</option> : null}
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{course.title}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Add students</h2>
            {availableStudents.length > 0 && (
              <button type="button" onClick={toggleAllAvailable} className="text-xs font-semibold text-gray-500 hover:text-black">
                {pickedStudentIds.length === availableStudents.length ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
          ) : availableStudents.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Everyone approved is already in this course.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {availableStudents.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={pickedStudentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="rounded border-gray-300"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {student.fullName || student.full_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <Button
            type="button"
            onClick={handleBulkEnroll}
            disabled={!selectedCourseId || pickedStudentIds.length === 0 || actionLoading}
            className="w-full gap-2 bg-black text-white"
          >
            <Plus className="w-4 h-4" />
            {pickedStudentIds.length > 1
              ? `Enroll ${pickedStudentIds.length} students`
              : pickedStudentIds.length === 1
              ? 'Enroll student'
              : 'Enroll'}
          </Button>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">In this course</h2>
            <span className="text-sm font-semibold text-gray-500 flex items-center gap-1">
              <Users className="w-4 h-4" /> {enrollments.length}
            </span>
          </div>

          {loading ? (
            <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No students enrolled yet.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {enrollments.map((enrollment) => {
                const name = enrollment.studentName || enrollment.student_name || 'Student';
                return (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-500">{formatDate(enrollment.enrolledAt || enrollment.enrolled_at)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingUnenroll({ id: enrollment.id, name })}
                      disabled={actionLoading}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      aria-label={`Remove ${name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Remove student?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Remove <span className="font-semibold">{pendingUnenroll.name}</span> from this course?
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setPendingUnenroll(null)}>Cancel</Button>
              <Button type="button" className="bg-red-600 text-white" onClick={confirmRemoveEnrollment} disabled={actionLoading}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
