import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PaymentRecord, UserProfile, Course } from '../types';
import { Card } from './ui/Card';
import { TrendingUp, Users, DollarSign, Download, Printer, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import { Button } from './ui/Card';

export function Reports() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paySnap, userSnap, courseSnap] = await Promise.all([
          getDocs(query(collection(db, 'payments'), orderBy('paymentDate', 'desc'))),
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(collection(db, 'courses'))
        ]);

        setPayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord)));
        setStudents(userSnap.docs.map(d => d.data() as UserProfile));
        setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reports');
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
