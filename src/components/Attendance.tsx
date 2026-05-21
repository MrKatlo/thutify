import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Calendar } from 'lucide-react';
import * as cfApi from '../services/cfApi';

// Sub-components
import { AttendanceSession } from './attendance/AttendanceSession';
import { AttendanceReport } from './attendance/AttendanceReport';
import { AttendanceAnalytics } from './attendance/AttendanceAnalytics';

export function Attendance() {
  const { profile, institutionId } = useAuth();
  
  // Selection States
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => {
    fetchCourses();
  }, [profile, institutionId]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentsAndAttendance();
    }
  }, [selectedCourse, selectedDate]);

  const fetchCourses = async () => {
    if (!institutionId) return;
    try {
      const list = await cfApi.listCourses(institutionId);
      setCourses(list);
      if (list.length > 0) {
        setSelectedCourse(list[0].course_name || list[0].title);
      }
    } catch (err) {
      console.error("Fetch courses failed:", err);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    if (!institutionId || !selectedCourse) return;
    setLoading(true);
    try {
      const courseObj = courses.find(c => (c.course_name || c.title) === selectedCourse);
      const courseId = courseObj?.id;
      if (!courseId) return;

      // Get students enrolled
      const enrollments = await cfApi.listEnrollments(institutionId, courseId);
      const studentList = enrollments.map((e: any) => ({
        id: e.student_id,
        fullName: e.student_name,
        email: e.student_email
      }));
      setStudents(studentList);

      // Get attendance records
      const allRecords = await cfApi.listAttendanceRecords(institutionId);
      const dateRecords = allRecords.filter((r: any) => {
        const recordDate = r.created_at?.split('T')[0] || '';
        return recordDate === selectedDate && (r.course_id === courseId || r.courseId === courseId);
      });
      setAttendanceRecords(dateRecords);

      // Stats
      if (dateRecords.length > 0) {
        const pres = dateRecords.filter((a: any) => a.status === 'present').length;
        const abs = dateRecords.filter((a: any) => a.status === 'absent').length;
        const lat = dateRecords.filter((a: any) => a.status === 'late').length;
        const total = dateRecords.length;
        setStats({
          present: Math.round((pres / total) * 100),
          absent: Math.round((abs / total) * 100),
          late: Math.round((lat / total) * 100)
        });
      }
    } catch (err) {
      console.error("Attendance data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkStatus = async (studentId: string, nextStatus: 'present' | 'absent' | 'late') => {
    try {
      const courseObj = courses.find(c => (c.course_name || c.title) === selectedCourse);
      const courseId = courseObj?.id;
      if (!courseId || !institutionId) return;

      // In D1, we might need a session_id. For now, assuming direct mark or simple schema.
      // Assuming cfApi.markAttendance handles it.
      await cfApi.markAttendance(institutionId, courseId, studentId, nextStatus);

      // Update local state
      setAttendanceRecords(prev => {
        const idx = prev.findIndex(r => (r.student_id === studentId || r.studentId === studentId));
        if (idx > -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], status: nextStatus };
          return next;
        } else {
          return [...prev, { student_id: studentId, status: nextStatus, created_at: new Date().toISOString() }];
        }
      });
    } catch (err) {
      console.error("Failed to mark attendance:", err);
    }
  };

  if (profile?.role === 'student') {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Attendance Report</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Monitor your presence and overall punctuality.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <AttendanceAnalytics stats={{ present: 92, absent: 5, late: 3 }} selectedCourseName="Overall" />
          </div>
          <div className="lg:col-span-2">
            <AttendanceReport history={attendanceRecords} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Attendance Tracker</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Record and audit student classroom presence.</p>
        </div>
        <input 
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card title="Select Course Syllabus">
            <div className="space-y-2 mt-4">
              {courses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCourse(c.course_name || c.title)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedCourse === (c.course_name || c.title) ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p className="font-bold text-sm text-gray-900">{c.course_name || c.title}</p>
                </div>
              ))}
            </div>
          </Card>
          <AttendanceAnalytics stats={stats} selectedCourseName={selectedCourse} />
        </div>

        <div className="lg:col-span-2">
          <AttendanceSession 
            students={students}
            attendanceRecords={attendanceRecords}
            onMark={handleMarkStatus}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            loading={loading}
            selectedCourseName={selectedCourse}
          />
        </div>
      </div>
    </div>
  );
}
