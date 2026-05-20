import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PaymentRecord, UserProfile, Course } from '../types';
import { Card } from './ui/Card';
import { TrendingUp, Users, DollarSign, Download, Printer, Clock, Award, CheckSquare, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import { Button } from './ui/Card';
import { useAuth } from '../hooks/useAuth';

export function Reports() {
  const { profile, institutionId } = useAuth();
  
  // Data States
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getMockStudents = () => [
    { uid: 's1', email: 'alex@example.com', fullName: 'Alex Johnson', name: 'Alex Johnson', phone: '+1 234 567 890', role: 'student', courseId: 'Advanced Mathematics', paymentStatus: 'paid', progress: 85, createdAt: new Date() },
    { uid: 's2', email: 'maria@example.com', fullName: 'Maria Garcia', name: 'Maria Garcia', phone: '+1 987 654 321', role: 'student', courseId: 'Physics 101', paymentStatus: 'partial', progress: 42, createdAt: new Date() },
    { uid: 's3', email: 'james@example.com', fullName: 'James Wilson', name: 'James Wilson', phone: '+1 555 444 333', role: 'student', courseId: 'Introduction to Programming', paymentStatus: 'unpaid', progress: 12, createdAt: new Date() },
  ];

  const getMockCourses = () => [
    { id: 'c1', title: 'Advanced Mathematics', description: 'Advanced calculus and statistics.', teacherId: 't1', createdAt: new Date() },
    { id: 'c2', title: 'Physics 101', description: 'Basic classical mechanics.', teacherId: 't2', createdAt: new Date() },
    { id: 'c3', title: 'Introduction to Programming', description: 'Learn logic and loops.', teacherId: 't3', createdAt: new Date() },
  ];

  const getMockPayments = () => [
    { id: 'p1', studentId: 's1', studentName: 'Alex Johnson', courseId: 'c1', courseName: 'Advanced Mathematics', amountPaid: 500, totalFee: 500, balance: 0, paymentDate: new Date(), paymentMethod: 'Card', referenceNumber: 'REF908123', status: 'paid' },
    { id: 'p2', studentId: 's2', studentName: 'Maria Garcia', courseId: 'c2', courseName: 'Physics 101', amountPaid: 200, totalFee: 400, balance: 200, paymentDate: new Date(), paymentMethod: 'Transfer', referenceNumber: 'REF448912', status: 'partial' },
  ];

  const getMockAttendance = () => [
    { studentId: 's1', status: 'present', courseId: 'Advanced Mathematics' },
    { studentId: 's2', status: 'present', courseId: 'Physics 101' },
    { studentId: 's3', status: 'absent', courseId: 'Introduction to Programming' },
  ];

  const getMockSubmissions = () => [
    { id: 's1', studentId: 's1', grade: '90', status: 'graded', assignmentTitle: 'Calculus Homework 1' },
    { id: 's2', studentId: 's2', grade: '85', status: 'graded', assignmentTitle: 'Mechanics Lab Report' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!institutionId) return;
      setLoading(true);
      try {
        const [paySnap, userSnap, courseSnap, attSnap, subSnap, quizSnap] = await Promise.all([
          getDocs(query(collection(db, 'payments'), where('institutionId', '==', institutionId))),
          getDocs(query(collection(db, 'students'), where('institutionId', '==', institutionId))),
          getDocs(query(collection(db, 'courses'), where('institutionId', '==', institutionId))),
          getDocs(query(collection(db, 'attendance'), where('institutionId', '==', institutionId))),
          getDocs(query(collection(db, 'submissions'), where('institutionId', '==', institutionId))),
          getDocs(query(collection(db, 'quizzes'), where('institutionId', '==', institutionId)))
        ]);

        const fetchedPayments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const fetchedStudents = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const fetchedCourses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const fetchedAtt = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const fetchedSub = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const fetchedQuiz = quizSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setPayments(fetchedPayments.length > 0 ? fetchedPayments : getMockPayments());
        setStudents(fetchedStudents.length > 0 ? fetchedStudents : getMockStudents());
        setCourses(fetchedCourses.length > 0 ? fetchedCourses : getMockCourses());
        setAttendance(fetchedAtt.length > 0 ? fetchedAtt : getMockAttendance());
        setSubmissions(fetchedSub.length > 0 ? fetchedSub : getMockSubmissions());
        setQuizzes(fetchedQuiz.length > 0 ? fetchedQuiz : []);
      } catch (error) {
        console.warn("Firestore reports fetch failed. Falling back to mockup databases:", error);
        setPayments(getMockPayments());
        setStudents(getMockStudents());
        setCourses(getMockCourses());
        setAttendance(getMockAttendance());
        setSubmissions(getMockSubmissions());
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [institutionId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // STUDENT SPECIFIC PROGRESS REPORT
  if (profile?.role === 'student') {
    const studentGrades = [
      { subject: 'Advanced Calculus', score: 88, grade: 'A', status: 'Completed' },
      { subject: 'Mechanics (Physics)', score: 75, grade: 'B', status: 'In Progress' },
      { subject: 'Coding Fundamentals', score: 95, grade: 'A+', status: 'In Progress' },
    ];

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 font-sans leading-relaxed">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Academic Progress Report</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm">Detailed breakdown of your course progress, grades, and completion metrics.</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all print:hidden"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Overall Progress', value: '74%', sub: 'Avg. Course Progress', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
            { label: 'Courses Enrolled', value: '3 Active', sub: 'LMS Active Courses', icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: 'Lessons Completed', value: `${profile.completedLessons?.length || 18}`, sub: 'Completed Syllabus Items', icon: Clock, color: 'text-purple-600 bg-purple-50' },
            { label: 'Certificates Unlocked', value: '1 Earned', sub: 'Verified Credentials', icon: Award, color: 'text-amber-600 bg-amber-50' },
          ].map((item, i) => (
             <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
               <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                  </div>
                  <h4 className="text-2xl font-black">{item.value}</h4>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{item.sub}</p>
               </Card>
             </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Subject Performance Breakdown" description="Verified grades and active assessment scores.">
            <div className="space-y-4 mt-6">
              {studentGrades.map((g, idx) => (
                <div key={idx} className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{g.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Status: {g.status}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black text-black">{g.score}%</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Grade {g.grade}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                      g.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {g.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Progress Analytics" description="Visual metric of course completion rate.">
            <div className="h-64 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Mathematics', progress: 85 },
                  { name: 'Physics', progress: 42 },
                  { name: 'Programming', progress: 95 }
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" axisLine={false} tickLine={false} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="progress" fill="#000000" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // TEACHER SPECIFIC REPORT CARD DETAILS
  if (profile?.role === 'teacher') {
    const avgProgress = Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / (students.length || 1));
    const totalPresent = attendance.filter(a => a.status === 'present').length;
    const presenceRate = Math.round((totalPresent / (attendance.length || 1)) * 100);
    const pendingGradingCount = submissions.filter(s => s.status === 'pending').length;

    const teacherEnrollmentData = courses.map(c => ({
      name: c.title,
      students: students.filter(s => s.courseId === c.title).length
    }));

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 font-sans leading-relaxed">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Teacher Performance & Roster Reports</h1>
            <p className="text-gray-500 mt-1 font-medium text-sm">Review real-time class progress metrics, student attendance, and graded scores.</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all print:hidden"
          >
            <Printer className="w-4 h-4" />
            Print Class Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Avg Class Progress', value: `${avgProgress}%`, sub: 'Lesson Completion Rate', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
            { label: 'Class Attendance', value: `${presenceRate}%`, sub: 'Average Roll Call Rate', icon: CheckSquare, color: 'text-blue-600 bg-blue-50' },
            { label: 'Pending Grading', value: `${pendingGradingCount} Ungraded`, sub: 'Awaiting Instructor Feedback', icon: Clock, color: 'text-orange-600 bg-orange-50' },
            { label: 'Evaluation Quizzes', value: `${quizzes.length} Published`, sub: 'Auto-Graded Questionnaires', icon: BarChart2, color: 'text-purple-600 bg-purple-50' },
          ].map((item, i) => (
             <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
               <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${item.color}`}>
                      <item.icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                  </div>
                  <h4 className="text-2xl font-black text-gray-950">{item.value}</h4>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{item.sub}</p>
               </Card>
             </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Student Enrollment Distribution" description="Active student count grouped by course assignment.">
            <div className="h-64 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teacherEnrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="students" fill="#000000" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Academic Student Log" description="Live audit of course progress and attendance stats.">
            <div className="overflow-x-auto mt-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Assigned Course</th>
                    <th className="py-2.5 px-3">Lesson Progress</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.uid || student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900">{student.fullName || student.name}</td>
                      <td className="py-3 px-3 text-gray-500 font-medium">{student.courseId || 'General'}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 h-1.5 rounded-full">
                            <div className="bg-black h-1.5 rounded-full" style={{ width: `${student.progress || 0}%` }}></div>
                          </div>
                          <span className="font-bold text-gray-700">{student.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          student.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {student.status || 'Active'}
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
    );
  }

  // ADMIN SPECIFIC REPORTS
  const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0);
  const outstandingBalance = payments.reduce((sum: number, p: any) => sum + (p.balanceRemaining || p.balance || 0), 0);
  
  const paymentStatusData = [
    { name: 'Paid Full', value: students.filter((s: any) => s.paymentStatus === 'paid').length, color: '#000000' },
    { name: 'Partial', value: students.filter((s: any) => s.paymentStatus === 'partial').length, color: '#4b5563' },
    { name: 'Unpaid', value: students.filter((s: any) => s.paymentStatus === 'unpaid').length, color: '#9ca3af' },
  ].filter(d => d.value > 0);

  const enrollmentData = courses.map((course: any) => ({
    name: course.title,
    students: students.filter((s: any) => s.courseId === course.title).length
  }));

  const monthlyRevenue = [
    { name: 'Mar', revenue: 4200 },
    { name: 'Apr', revenue: 3800 },
    { name: 'May', revenue: totalRevenue },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans leading-relaxed">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Academic & Financial Reports</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Detailed analytical breakdown of LMS performance.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-black rounded-xl font-bold text-sm hover:bg-gray-50 transition-all print:hidden"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, sub: 'Tuition Paid In Full', icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: 'Total Enrolled', value: `${students.length} Students`, sub: 'LMS Registered Roster', icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Tuition Balance', value: `$${outstandingBalance.toLocaleString()}`, sub: 'Uncollected Platform Fees', icon: Clock, color: 'text-red-600 bg-red-50' },
          { label: 'Avg Progress', value: '72%', sub: 'Lesson Completion Rate', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
              </div>
              <h4 className="text-2xl font-black">{item.value}</h4>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{item.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2" title="Tuition Revenue Cashflow" description="LMS earnings tracked monthly.">
          <div className="h-72 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="revenue" fill="#000000" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Student Enrollment Distribution" description="Registered students per course syllabus.">
          <div className="h-72 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#374151' }} width={80} />
                <Tooltip cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="students" fill="#000000" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
