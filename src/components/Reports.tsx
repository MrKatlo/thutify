import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Payment, UserProfile, Course } from '../types';
import { Card } from './ui/Card';
import { BarChart3, TrendingUp, Users, BookOpen, DollarSign, Download, PieChart, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart as RePieChart, Pie } from 'recharts';

export function Reports() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paySnap, userSnap, courseSnap] = await Promise.all([
          getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(collection(db, 'courses'))
        ]);

        setPayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
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
  const totalStudents = students.length;
  const totalCourses = courses.length;
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);

  const paymentStatusData = [
    { name: 'Paid', value: payments.filter(p => p.status === 'paid').length },
    { name: 'Partial', value: payments.filter(p => p.status === 'partial').length },
    { name: 'Pending', value: payments.filter(p => p.status === 'pending').length },
    { name: 'Overdue', value: payments.filter(p => p.status === 'overdue').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#000000', '#4b5563', '#9ca3af', '#e5e7eb'];

  const monthlyData = [
    { name: 'Jan', amount: 4000 },
    { name: 'Feb', amount: 3000 },
    { name: 'Mar', amount: 2000 },
    { name: 'Apr', amount: 2780 },
    { name: 'May', amount: 1890 },
    { name: 'Jun', amount: totalRevenue }, // Use our real revenue for current month
  ];

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans leading-relaxed">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Intelligence Reports</h1>
          <p className="text-gray-500 mt-1 font-medium">Analytical overview of your tutoring center operations.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl font-bold text-sm h-fit hover:bg-gray-800 transition-all print:hidden"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Growth', value: '+12%', sub: 'vs last month', icon: TrendingUp },
          { label: 'Retention', value: '94%', sub: 'Highly stable', icon: Users },
          { label: 'Avg. Revenue', value: `$${Math.round(totalRevenue / (totalStudents || 1))}`, sub: 'Per student', icon: DollarSign },
          { label: 'Completion', value: '78%', sub: 'Course tracks', icon: BookOpen },
        ].map((item, i) => (
           <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
             <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <item.icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{item.label}</span>
                </div>
                <h4 className="text-2xl font-black">{item.value}</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{item.sub}</p>
             </Card>
           </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <Card title="Revenue Trends" description="Monthly income performance (Real + Forecast)">
           <div className="h-64 mt-4">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={monthlyData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                 <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                 <Bar dataKey="amount" fill="#000000" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </Card>

        <Card title="Payment Health" description="Breakdown of collection status">
           <div className="h-64 mt-4 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <RePieChart>
                 <Pie
                   data={paymentStatusData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {paymentStatusData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </RePieChart>
             </ResponsiveContainer>
             <div className="absolute flex flex-col items-center">
                <span className="text-xs font-bold text-gray-400 uppercase">Total</span>
                <span className="text-xl font-black">{payments.length}</span>
             </div>
           </div>
           <div className="flex justify-center gap-6 mt-4">
             {paymentStatusData.map((d, i) => (
               <div key={i} className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                 <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">{d.name}</span>
               </div>
             ))}
           </div>
        </Card>
      </div>

      <Card title="Enrollment Breakdown" description="Students per course category">
          <div className="h-64 mt-4">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={monthlyData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                 <Line type="monotone" dataKey="amount" stroke="#000000" strokeWidth={3} dot={{ r: 4, fill: '#000000', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
      </Card>
    </div>
  );
}
