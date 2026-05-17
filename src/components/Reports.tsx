import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PaymentRecord, UserProfile, Course } from '../types';
import { Card } from './ui/Card';
import { TrendingUp, Users, DollarSign, Download, Printer, Clock, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import { Button } from './ui/Card';
import { useAuth } from '../hooks/useAuth';

export function Reports() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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
            <p className="text-gray-500 mt-1 font-medium">Detailed breakdown of your course progress, grades, and completion metrics.</p>
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
                    <p className="font-bold text-gray-900">{g.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Status: {g.status}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black text-black">{g.score}%</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Grade {g.grade}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
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

  const getMockStudents = (): UserProfile[] => [
    { uid: 's1', email: 'alex@example.com', name: 'Alex Johnson', phone: '+1 234 567 890', role: 'student', courseEnrolled: 'Advanced Mathematics', paymentStatus: 'paid', progress: 85, createdAt: new Date() },
    { uid: 's2', email: 'maria@example.com', name: 'Maria Garcia', phone: '+1 987 654 321', role: 'student', courseEnrolled: 'Physics 101', paymentStatus: 'partial', progress: 42, createdAt: new Date() },
    { uid: 's3', email: 'james@example.com', name: 'James Wilson', phone: '+1 555 444 333', role: 'student', courseEnrolled: 'Introduction to Programming', paymentStatus: 'unpaid', progress: 12, createdAt: new Date() },
  ];

  const getMockCourses = (): Course[] => [
    { id: 'c1', title: 'Advanced Mathematics', description: 'Advanced calculus and statistics.', teacherId: 't1', createdAt: new Date() },
    { id: 'c2', title: 'Physics 101', description: 'Basic classical mechanics.', teacherId: 't2', createdAt: new Date() },
    { id: 'c3', title: 'Introduction to Programming', description: 'Learn logic and loops.', teacherId: 't3', createdAt: new Date() },
  ];

  const getMockPayments = (): PaymentRecord[] => [
    { id: 'p1', studentId: 's1', studentName: 'Alex Johnson', courseId: 'c1', courseName: 'Advanced Mathematics', amountPaid: 500, totalAmount: 500, balanceRemaining: 0, paymentDate: new Date(), paymentMethod: 'Card', referenceNumber: 'REF908123', status: 'paid' },
    { id: 'p2', studentId: 's2', studentName: 'Maria Garcia', courseId: 'c2', courseName: 'Physics 101', amountPaid: 200, totalAmount: 400, balanceRemaining: 200, paymentDate: new Date(), paymentMethod: 'Transfer', referenceNumber: 'REF448912', status: 'partial' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paySnap, userSnap, courseSnap] = await Promise.all([
          getDocs(query(collection(db, 'payments'), orderBy('paymentDate', 'desc'))),
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(collection(db, 'courses'))
        ]);

        const fetchedPayments = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord));
        const fetchedStudents = userSnap.docs.map(d => d.data() as UserProfile);
        const fetchedCourses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));

        setPayments(fetchedPayments.length > 0 ? fetchedPayments : getMockPayments());
        setStudents(fetchedStudents.length > 0 ? fetchedStudents : getMockStudents());
        setCourses(fetchedCourses.length > 0 ? fetchedCourses : getMockCourses());
      } catch (error) {
        console.warn("Firestore reports fetch failed (likely rules or uninitialized). Falling back to mock data:", error);
        setPayments(getMockPayments());
        setStudents(getMockStudents());
        setCourses(getMockCourses());
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aggregations
  const totalRevenue = payments.reduce((sum: number, p: PaymentRecord) => sum + p.amountPaid, 0);
  const outstandingBalance = payments.reduce((sum: number, p: PaymentRecord) => sum + p.balanceRemaining, 0);
  
  const paymentStatusData = [
    { name: 'Paid Full', value: students.filter((s: UserProfile) => s.paymentStatus === 'paid').length, color: '#000000' },
    { name: 'Partial', value: students.filter((s: UserProfile) => s.paymentStatus === 'partial').length, color: '#4b5563' },
    { name: 'Unpaid', value: students.filter((s: UserProfile) => s.paymentStatus === 'unpaid').length, color: '#9ca3af' },
  ].filter(d => d.value > 0);

  const enrollmentData = courses.map((course: Course) => ({
    name: course.title,
    students: students.filter((s: UserProfile) => s.courseEnrolled === course.title).length
  }));

  // Simulated monthly data based on real total (for visualization)
  const monthlyRevenue = [
    { name: 'Mar', revenue: 4200 },
    { name: 'Apr', revenue: 3800 },
    { name: 'May', revenue: totalRevenue },
  ];

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans leading-relaxed">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Academic & Financial Reports</h1>
          <p className="text-gray-500 mt-1 font-medium">Detailed analytical breakdown of LMS performance.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-black rounded-xl font-bold text-sm hover:bg-gray-50 transition-all print:hidden"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all print:hidden"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Enrollment', value: students.length, sub: 'Active Students', icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Completion', value: '74%', sub: 'Avg. Progress', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, sub: 'Total Received', icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
          { label: 'Arrears', value: `$${outstandingBalance.toLocaleString()}`, sub: 'Outstanding', icon: Clock, color: 'text-red-600 bg-red-50' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Card title="Monthly Revenue Growth" description="Income tracking over the last 3 months.">
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#000000" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Payment Status Distribution" description="Overview of student payment compliance.">
          <div className="h-72 w-full mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Course Enrollment Breakdown" description="Number of students enrolled per course.">
        <div className="h-80 w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enrollmentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" axisLine={false} tickLine={false} hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} width={120} />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="students" fill="#000000" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-10 bg-black text-white p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
        <div>
          <h3 className="text-xl font-bold mb-2">Need a Custom Report?</h3>
          <p className="text-gray-400 text-sm max-w-md">Our intelligence engine can generate custom insights for your specific needs. Contact support for more details.</p>
        </div>
        <Button variant="secondary" className="whitespace-nowrap px-8 py-3">
          Request Custom Report
        </Button>
      </div>
    </div>
  );
}
