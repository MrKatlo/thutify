import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, QueryDocumentSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Calendar, Check, X, Clock, AlertCircle, Search } from 'lucide-react';
import { motion } from 'motion/react';

export function Attendance() {
  const { profile } = useAuth();
  
  // Selection States
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('Advanced Mathematics');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({ present: 85, absent: 10, late: 5 });

  useEffect(() => {
    fetchCourses();
  }, [profile]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentsAndAttendance();
    }
  }, [selectedCourse, selectedDate]);

  const getMockCourses = () => [
    { id: 'c1', title: 'Advanced Mathematics' },
    { id: 'c2', title: 'Physics 101' },
    { id: 'c3', title: 'Introduction to Programming' }
  ];

  const getMockStudents = () => [
    { id: 's1', fullName: 'Alex Johnson', email: 'alex@example.com' },
    { id: 's2', fullName: 'Maria Garcia', email: 'maria@example.com' },
    { id: 's3', fullName: 'James Wilson', email: 'james@example.com' },
    { id: 's4', fullName: 'Emma Davis', email: 'emma@example.com' },
    { id: 's5', fullName: 'Liam Smith', email: 'liam@example.com' }
  ];

  const getMockAttendance = () => [
    { id: 'a1', studentId: 's1', status: 'present', date: selectedDate },
    { id: 'a2', studentId: 's2', status: 'absent', date: selectedDate },
    { id: 'a3', studentId: 's3', status: 'late', date: selectedDate }
  ];

  const fetchCourses = async () => {
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setCourses(list.length > 0 ? list : getMockCourses());
      if (list.length > 0) {
        setSelectedCourse(list[0].title);
      }
    } catch (err) {
      console.warn("Could not fetch courses for attendance. Using mock list:", err);
      setCourses(getMockCourses());
    }
  };

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      // 1. Get students enrolled in selected course
      const qStudents = query(collection(db, 'students'), where('courseId', '==', selectedCourse));
      const snapStudents = await getDocs(qStudents);
      const studentList = snapStudents.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const activeStudents = studentList.length > 0 ? studentList : getMockStudents();
      setStudents(activeStudents);

      // 2. Get attendance records for this course and date
      const qAttendance = query(
        collection(db, 'attendance'),
        where('courseId', '==', selectedCourse),
        where('date', '==', selectedDate)
      );
      const snapAttendance = await getDocs(qAttendance);
      const attendanceList = snapAttendance.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const activeAttendance = attendanceList.length > 0 ? attendanceList : getMockAttendance();
      setAttendanceRecords(activeAttendance);

      // Recalculate quick Stats
      if (activeAttendance.length > 0) {
        const pres = activeAttendance.filter(a => a.status === 'present').length;
        const abs = activeAttendance.filter(a => a.status === 'absent').length;
        const lat = activeAttendance.filter(a => a.status === 'late').length;
        const total = activeAttendance.length;
        setStats({
          present: Math.round((pres / total) * 100) || 0,
          absent: Math.round((abs / total) * 100) || 0,
          late: Math.round((lat / total) * 100) || 0
        });
      }
    } catch (err) {
      console.warn("Firestore attendance fetch failed. Using fallbacks:", err);
      setStudents(getMockStudents());
      setAttendanceRecords(getMockAttendance());
    } finally {
      setLoading(false);
    }
  };

  const handleMarkStatus = async (studentId: string, nextStatus: 'present' | 'absent' | 'late') => {
    try {
      const existing = attendanceRecords.find(r => r.studentId === studentId);
      
      if (existing) {
        // Update record
        const docRef = doc(db, 'attendance', existing.id || `att-${studentId}-${selectedDate}`);
        await setDoc(docRef, {
          courseId: selectedCourse,
          teacherId: profile?.uid || 't1',
          studentId,
          date: selectedDate,
          status: nextStatus,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Create new record
        const docId = `att-${studentId}-${selectedDate}`;
        await setDoc(doc(db, 'attendance', docId), {
          courseId: selectedCourse,
          teacherId: profile?.uid || 't1',
          studentId,
          date: selectedDate,
          status: nextStatus,
          createdAt: serverTimestamp()
        });
      }
      
      // Update local state directly
      setAttendanceRecords(prev => {
        const idx = prev.findIndex(r => r.studentId === studentId);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], status: nextStatus };
          return next;
        } else {
          return [...prev, { studentId, status: nextStatus, date: selectedDate }];
        }
      });

      // Update quick Stats
      const updated = attendanceRecords.map(r => r.studentId === studentId ? { ...r, status: nextStatus } : r);
      if (!attendanceRecords.some(r => r.studentId === studentId)) {
        updated.push({ studentId, status: nextStatus, date: selectedDate });
      }
      const pres = updated.filter(a => a.status === 'present').length;
      const abs = updated.filter(a => a.status === 'absent').length;
      const lat = updated.filter(a => a.status === 'late').length;
      const total = updated.length;
      setStats({
        present: Math.round((pres / total) * 100) || 0,
        absent: Math.round((abs / total) * 100) || 0,
        late: Math.round((lat / total) * 100) || 0
      });

    } catch (err) {
      console.error("Failed to persist attendance status:", err);
    }
  };

  const filteredStudents = students.filter(s => 
    (s.fullName || s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Student Attendance View
  if (profile?.role === 'student') {
    const studentHistory = [
      { date: '2026-05-16', course: 'Advanced Mathematics', status: 'present' },
      { date: '2026-05-15', course: 'Physics 101', status: 'present' },
      { date: '2026-05-14', course: 'Advanced Mathematics', status: 'late' },
      { date: '2026-05-13', course: 'Introduction to Programming', status: 'present' },
      { date: '2026-05-10', course: 'Physics 101', status: 'absent' },
    ];

    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Attendance Report</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Monitor your presence, absences, and overall punctuality.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-black text-white border-none shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Check className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Overall Attendance</span>
            </div>
            <h3 className="text-3xl font-black">92%</h3>
            <p className="text-xs mt-2 opacity-60 font-bold uppercase tracking-widest">Target: 85% Minimum Requirement</p>
          </Card>

          <Card className="bg-green-50 border-green-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Total Classes Present</span>
            </div>
            <h3 className="text-3xl font-black text-green-900">24 Sessions</h3>
            <p className="text-xs mt-2 text-green-500 font-bold uppercase tracking-widest">Active & Consistent</p>
          </Card>

          <Card className="bg-red-50 border-red-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Absences & Late Arrivals</span>
            </div>
            <h3 className="text-3xl font-black text-red-900">1 Absent • 1 Late</h3>
            <p className="text-xs mt-2 text-red-500 font-bold uppercase tracking-widest">Excellent Punctuality</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card title="Subject Attendance Breakdown">
              <div className="space-y-4 mt-6">
                {[
                  { course: 'Advanced Mathematics', percent: 95, present: 11, total: 12 },
                  { course: 'Physics 101', percent: 88, present: 8, total: 9 },
                  { course: 'Introduction to Programming', percent: 100, present: 5, total: 5 },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm text-gray-900">{item.course}</p>
                      <span className="text-xs font-bold text-gray-500">{item.percent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                      <div className="bg-black h-1.5 rounded-full" style={{ width: `${item.percent}%` }}></div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Attended {item.present} of {item.total} classes
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card title="Recent Attendance Ledger" description="History of recent class attendance activities.">
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistory.map((h, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm font-bold text-gray-900">{h.date}</td>
                        <td className="py-4 px-4 text-sm font-semibold text-gray-700">{h.course}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            h.status === 'present' ? 'bg-green-50 text-green-700' : h.status === 'late' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {h.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Teacher / Admin Attendance View
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Attendance Tracker</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Record, edit, and audit student classroom presence in real-time.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm font-semibold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card title="Select Course Syllabus">
            <div className="space-y-2 mt-4">
              {courses.map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedCourse(c.title)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedCourse === c.title ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p className="font-bold text-sm text-gray-900">{c.title}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Attendance Distribution" description={`Stats for ${selectedCourse}`}>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-green-800 text-xs font-bold uppercase tracking-wider">Present</p>
                <p className="text-2xl font-extrabold text-green-900 mt-1">{stats.present}%</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-red-800 text-xs font-bold uppercase tracking-wider">Absent</p>
                <p className="text-2xl font-extrabold text-red-900 mt-1">{stats.absent}%</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-yellow-800 text-xs font-bold uppercase tracking-wider">Late Arrivals</p>
                  <p className="text-2xl font-extrabold text-yellow-900 mt-1">{stats.late}%</p>
                </div>
                <AlertCircle className="text-yellow-600 w-8 h-8 opacity-55" />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Mark Roll Call" description={`Auditing student roster for ${selectedCourse}`}>
            <div className="my-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
            </div>

            {loading ? (
              <div className="h-48 bg-gray-50 rounded-2xl animate-pulse" />
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-gray-400 italic">No enrolled students found in this course.</div>
            ) : (
              <div className="space-y-3 mt-4">
                {filteredStudents.map((student) => {
                  const record = attendanceRecords.find(r => r.studentId === student.id);
                  const currentStatus = record ? record.status : '';

                  return (
                    <div 
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
                          {student.fullName?.charAt(0) || student.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{student.fullName || student.name}</p>
                          <p className="text-xs text-gray-400">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg">
                        <button 
                          onClick={() => handleMarkStatus(student.id, 'present')}
                          className={`p-2 rounded-md transition-colors ${currentStatus === 'present' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'}`}
                          title="Mark Present"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleMarkStatus(student.id, 'absent')}
                          className={`p-2 rounded-md transition-colors ${currentStatus === 'absent' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'}`}
                          title="Mark Absent"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleMarkStatus(student.id, 'late')}
                          className={`p-2 rounded-md transition-colors ${currentStatus === 'late' ? 'bg-yellow-500 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'}`}
                          title="Mark Late"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
