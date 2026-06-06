import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { BookOpen, CheckSquare, ClipboardList, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as cfApi from '../services/cfApi';

const VIEW_META: Record<string, { title: string; description: string }> = {
  course: { title: 'Course Reports', description: 'Completion and enrollment across your assigned courses.' },
  attendance: { title: 'Attendance by Class', description: 'Student attendance rates per course you teach.' },
  student: { title: 'Student Progress', description: 'Enrollment overview across your courses.' },
  assignments: { title: 'Assignment Completion', description: 'Submission and grading progress for your assignments.' },
};

interface TeacherReportsProps {
  initialView?: string;
}

export function TeacherReports({ initialView = 'course' }: TeacherReportsProps) {
  const { institutionId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  const view = VIEW_META[initialView] ? initialView : 'course';
  const meta = VIEW_META[view];

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      setLoading(true);
      try {
        const [courseList, enrollmentList, assignmentList, submissionList, attendanceList] = await Promise.all([
          cfApi.listCourses(institutionId),
          cfApi.listEnrollments(institutionId),
          cfApi.listAssignments(institutionId),
          cfApi.listSubmissions(institutionId),
          cfApi.listAttendanceRecords(institutionId),
        ]);
        setCourses(courseList);
        setEnrollments(enrollmentList);
        setAssignments(assignmentList.filter((a: any) => courseList.some((c: any) => c.id === (a.course_id || a.courseId))));
        setSubmissions(submissionList);
        setAttendanceRecords(attendanceList);
      } catch (err) {
        console.error('Teacher reports failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId]);

  const courseCompletionData = useMemo(() => {
    return courses.map((course) => {
      const enrolled = enrollments.filter((e) => (e.course_id || e.courseId) === course.id);
      const completed = enrolled.filter((e) => String(e.status || '') === 'completed').length;
      const rate = enrolled.length > 0 ? Math.round((completed / enrolled.length) * 100) : 0;
      return { name: course.title?.slice(0, 12) || 'Course', completion: rate, students: enrolled.length };
    });
  }, [courses, enrollments]);

  const attendanceByCourse = useMemo(() => {
    return courses.map((course) => {
      const records = attendanceRecords.filter((r) => (r.course_id || r.courseId) === course.id);
      const present = records.filter((r) => r.status === 'present').length;
      const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
      return { name: course.title?.slice(0, 12) || 'Course', rate, sessions: records.length };
    });
  }, [courses, attendanceRecords]);

  const assignmentCompletionData = useMemo(() => {
    return assignments.map((assignment) => {
      const related = submissions.filter((s) => (s.assignment_id || s.assignmentId) === assignment.id);
      const graded = related.filter((s) => s.status === 'graded' || s.grade != null).length;
      const rate = related.length > 0 ? Math.round((graded / related.length) * 100) : 0;
      return {
        name: (assignment.title || 'Assignment').slice(0, 14),
        submitted: related.length,
        graded: rate,
      };
    });
  }, [assignments, submissions]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{meta.title}</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">{meta.description}</p>
        </div>
        <Button onClick={() => window.print()} variant="outline" className="gap-2 print:hidden">
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>

      {view === 'course' && (
        <Card title="Course Completion" description="Share of enrolled students marked completed.">
          <div className="h-72 mt-6">
            {courseCompletionData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No assigned courses.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="completion" fill="#000000" radius={[4, 4, 0, 0]} name="Completion %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {view === 'attendance' && (
        <Card title="Attendance by Class" description="Present rate from recorded sessions.">
          <div className="h-72 mt-6">
            {attendanceByCourse.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No attendance data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceByCourse}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {view === 'student' && (
        <Card title="Students per Course" description="Active enrollments in your assigned courses.">
          <div className="h-72 mt-6">
            {courseCompletionData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No assigned courses.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="students" fill="#3b82f6" name="Students" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {view === 'assignments' && (
        <Card title="Assignment Completion" description="Submissions received and graded per assignment.">
          <div className="h-72 mt-6">
            {assignmentCompletionData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No assignments in your courses.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assignmentCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="submitted" fill="#000000" name="Submissions" />
                  <Bar dataKey="graded" fill="#10b981" name="Graded %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-2xl font-black">{courses.length}</p>
            <p className="text-xs text-gray-500 uppercase font-bold">My Courses</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-purple-600" />
          <div>
            <p className="text-2xl font-black">{attendanceRecords.length}</p>
            <p className="text-xs text-gray-500 uppercase font-bold">Attendance Records</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-2xl font-black">{submissions.length}</p>
            <p className="text-xs text-gray-500 uppercase font-bold">Submissions</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
