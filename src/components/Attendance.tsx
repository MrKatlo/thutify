import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from './ui/Card';
import * as cfApi from '../services/cfApi';
import type { AttendanceRecord, StudentSummary, TeacherSummary } from '../types';

// Sub-components
import { AttendanceSession } from './attendance/AttendanceSession';
import { AttendanceReport } from './attendance/AttendanceReport';
import { AttendanceAnalytics } from './attendance/AttendanceAnalytics';

type ToastState = { message: string; type: 'success' | 'error' | 'warning' } | null;

const VIEW_TITLES: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Attendance Dashboard', description: 'Overview of presence, recording, and audit history.' },
  record: { title: 'Record Attendance', description: 'Mark student presence for the selected course and date.' },
  reports: { title: 'Attendance Reports', description: 'Filter and review historical attendance records.' },
  late: { title: 'Late Attendance Tracking', description: 'Records where students were marked late.' },
};

interface AttendanceProps {
  initialView?: string;
}

export function Attendance({ initialView = 'dashboard' }: AttendanceProps) {
  const { profile, institutionId } = useAuth();

  // Selection States
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedCourseName, setSelectedCourseName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [filters, setFilters] = useState({
    studentId: '',
    courseId: '',
    teacherId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!institutionId) return;
    fetchCourses();
    fetchTeachers();
    fetchAttendanceHistory();
  }, [profile, institutionId]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchStudentsAndAttendance();
    }
  }, [selectedCourseId, selectedDate]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const fetchCourses = async () => {
    if (!institutionId) return;
    try {
      const list = await cfApi.listCourses(institutionId);
      setCourses(list);
      if (profile?.role === 'student') {
        const enrollments = await cfApi.listEnrollments(institutionId, undefined, profile.uid);
        const enrolledCourseIds = new Set(enrollments.map((e: any) => e.course_id || e.courseId));
        const studentCourses = list.filter((course: any) => enrolledCourseIds.has(course.id));
        setCourses(studentCourses);
        if (studentCourses.length > 0) {
          setSelectedCourseId(studentCourses[0].id);
          setSelectedCourseName(studentCourses[0].course_name || studentCourses[0].title || 'Course');
        }
        return;
      }
      if (list.length > 0) {
        setSelectedCourseId(list[0].id);
        setSelectedCourseName(list[0].course_name || list[0].title || 'Course');
      }
    } catch (err) {
      console.error('Fetch courses failed:', err);
      showToast('Unable to load courses.', 'error');
    }
  };

  const fetchTeachers = async () => {
    if (!institutionId) return;
    try {
      const result = await cfApi.listTeachers(institutionId, { pagination: { limit: 200, offset: 0 } });
      setTeachers(result.results || []);
    } catch (err) {
      console.error('Fetch teachers failed:', err);
    }
  };

  const fetchAttendanceHistory = async () => {
    if (!institutionId) return;
    try {
      const allRecords = await cfApi.listAttendanceRecords(institutionId);
      setAllAttendanceRecords(allRecords || []);
    } catch (err) {
      console.error('Failed to load attendance history:', err);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    if (!institutionId || !selectedCourseId) return;
    setLoading(true);
    try {
      const studentResponse = await cfApi.listStudents(institutionId, {
        courseId: selectedCourseId,
        pagination: { limit: 200, offset: 0 },
      });
      const studentResults = studentResponse.results || [];
      setStudents(
        studentResults
          .slice()
          .sort((a, b) =>
            String(a.lastName || a.last_name || a.fullName || a.full_name || '')
              .localeCompare(String(b.lastName || b.last_name || b.fullName || b.full_name || '')) ||
            String(a.firstName || a.first_name || '').localeCompare(String(b.firstName || b.first_name || '')),
          ),
      );

      const allRecords = await cfApi.listAttendanceRecords(institutionId);
      const filteredRecords = (allRecords || [])
        .filter((r) => String(r.course_id || r.courseId || '') === selectedCourseId)
        .filter((r) => {
          const recordDate = String(r.created_at || r.marked_at || '').slice(0, 10);
          return recordDate === selectedDate;
        });

      if (profile?.role === 'student') {
        const studentRecords = (allRecords || [])
          .filter((r) => r.student_id === profile.uid || r.studentId === profile.uid)
          .map((r) => ({
            ...r,
            date: String(r.created_at || r.marked_at || new Date().toISOString()).slice(0, 10),
            course: r.course_name || r.courseName || selectedCourseName,
          }));
        const studentDateRecords = studentRecords.filter((record) => record.date === selectedDate);
        const total = studentDateRecords.length;
        const present = studentDateRecords.filter((record) => record.status === 'present').length;
        const absent = studentDateRecords.filter((record) => record.status === 'absent').length;
        const late = studentDateRecords.filter((record) => record.status === 'late').length;
        setAttendanceRecords(studentDateRecords);
        setStats({
          present: total > 0 ? Math.round((present / total) * 100) : 0,
          absent: total > 0 ? Math.round((absent / total) * 100) : 0,
          late: total > 0 ? Math.round((late / total) * 100) : 0,
        });
        return;
      }

      setAttendanceRecords(filteredRecords);
      if (filteredRecords.length > 0) {
        const pres = filteredRecords.filter((a) => a.status === 'present').length;
        const abs = filteredRecords.filter((a) => a.status === 'absent').length;
        const lat = filteredRecords.filter((a) => a.status === 'late').length;
        const total = filteredRecords.length;
        setStats({
          present: Math.round((pres / total) * 100),
          absent: Math.round((abs / total) * 100),
          late: Math.round((lat / total) * 100),
        });
      } else {
        setStats({ present: 0, absent: 0, late: 0 });
      }
    } catch (err) {
      console.error('Attendance data fetch failed:', err);
      showToast('Failed to load attendance data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkStatus = async (studentId: string, nextStatus: 'present' | 'absent' | 'late') => {
    try {
      if (!institutionId || !selectedCourseId) return;
      await cfApi.markAttendance(institutionId, selectedCourseId, studentId, nextStatus);
      setAttendanceRecords((prev) => {
        const idx = prev.findIndex((r) => r.student_id === studentId || r.studentId === studentId);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], status: nextStatus, marked_at: new Date().toISOString() };
          return next;
        }
        return [...prev, { student_id: studentId, status: nextStatus, marked_at: new Date().toISOString() } as AttendanceRecord];
      });
      showToast('Attendance marked successfully.', 'success');
      fetchAttendanceHistory();
    } catch (err) {
      console.error('Failed to mark attendance:', err);
      showToast('Unable to save attendance. Try again.', 'error');
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ studentId: '', courseId: '', teacherId: '', startDate: '', endDate: '' });
  };

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  );

  const viewMeta = VIEW_TITLES[initialView] || VIEW_TITLES.dashboard;
  const lateOnly = initialView === 'late';
  const reportHistory = useMemo(() => {
    if (!lateOnly) return allAttendanceRecords;
    return allAttendanceRecords.filter((record) => record.status === 'late');
  }, [allAttendanceRecords, lateOnly]);

  useEffect(() => {
    if (selectedCourse) {
      setSelectedCourseName(selectedCourse.course_name || selectedCourse.title || 'Course');
    }
  }, [selectedCourse]);

  if (profile?.role === 'student') {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Attendance Report</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Monitor your presence and overall punctuality.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AttendanceAnalytics stats={stats} selectedCourseName="Overall" />
          </div>
          <div className="lg:col-span-2">
            <AttendanceReport
              history={attendanceRecords}
              students={students}
              courses={courses}
              teachers={teachers}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />
          </div>
        </div>
      </div>
    );
  }

  const showCoursePicker = initialView !== 'reports' && initialView !== 'late';
  const showAnalytics = initialView === 'dashboard' || initialView === 'record';
  const showSession = initialView === 'dashboard' || initialView === 'record';
  const showReport = initialView === 'dashboard' || initialView === 'reports' || initialView === 'late';

  return (
    <div className="relative p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-2xl p-4 shadow-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-700'
            : toast.type === 'warning'
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {toast.message}
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{viewMeta.title}</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">{viewMeta.description}</p>
        </div>
        {showSession && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm font-semibold"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {showCoursePicker && (
          <div className="lg:col-span-1 space-y-6">
            <Card title="Select Course">
              <div className="space-y-2 mt-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      setSelectedCourseName(course.course_name || course.title || 'Course');
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedCourseId === course.id ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className="font-bold text-sm text-gray-900">{course.course_name || course.title}</p>
                  </div>
                ))}
              </div>
            </Card>
            {showAnalytics && (
              <AttendanceAnalytics stats={stats} selectedCourseName={selectedCourseName || 'Course'} />
            )}
          </div>
        )}

        <div className={`space-y-6 ${showCoursePicker ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {showSession && (
            <AttendanceSession
              students={students}
              attendanceRecords={attendanceRecords}
              onMark={handleMarkStatus}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              loading={loading}
              selectedCourseName={selectedCourseName}
            />
          )}
          {showReport && (
            <AttendanceReport
              history={reportHistory}
              students={students}
              courses={courses}
              teachers={teachers}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />
          )}
        </div>
      </div>
    </div>
  );
}
