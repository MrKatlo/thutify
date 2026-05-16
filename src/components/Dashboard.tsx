import { useAuth } from '../hooks/useAuth';
import { Card } from './ui/Card';
import { BookOpen, Users, Calendar, TrendingUp, Plus, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export function Dashboard() {
  const { profile } = useAuth();

  const getStats = () => {
    if (profile?.role === 'admin') {
      return [
        { label: 'Total Students', value: '156', icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: 'Total Teachers', value: '12', icon: BookOpen, color: 'bg-green-50 text-green-600' },
        { label: 'Revenue (MTD)', value: '$12,450', icon: DollarSign, color: 'bg-purple-50 text-purple-600' },
        { label: 'Unpaid Fees', value: '$2,100', icon: Clock, color: 'bg-red-50 text-red-600' },
      ];
    } else if (profile?.role === 'teacher') {
      return [
        { label: 'My Courses', value: '4', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
        { label: 'My Students', value: '48', icon: Users, color: 'bg-green-50 text-green-600' },
        { label: 'Lessons Today', value: '3', icon: Calendar, color: 'bg-purple-50 text-purple-600' },
        { label: 'Avg. Progress', value: '74%', icon: TrendingUp, color: 'bg-orange-50 text-orange-600' },
      ];
    } else {
      return [
        { label: 'Enrolled Courses', value: '2', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
        { label: 'Completed Lessons', value: '18', icon: CheckCircle, color: 'bg-green-50 text-green-600' },
        { label: 'Next Session', value: 'Tomorrow', icon: Calendar, color: 'bg-purple-50 text-purple-600' },
        { label: 'Your Progress', value: '65%', icon: TrendingUp, color: 'bg-orange-50 text-orange-600' },
      ];
    }
  };

  const stats = getStats();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
            Welcome back, {profile?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 mt-1 font-medium capitalize">Role: {profile?.role}</p>
        </div>
        {profile?.role !== 'student' && (
          <button className="bg-black text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 w-full md:w-auto">
            <Plus className="w-4 h-4" />
            {profile?.role === 'admin' ? 'Add Student' : 'New Lesson'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="flex items-start justify-between h-full">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card 
            title={profile?.role === 'student' ? 'My Recent Lessons' : 'Recent Activities'} 
            description="Keep track of the latest updates and progress."
          >
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl group cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center border border-gray-200 shadow-sm shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">May</span>
                      <span className="text-lg font-bold leading-none">16</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-black transition-colors">Advanced Calculus</h4>
                      <p className="text-xs text-gray-500 font-medium">2:00 PM • Module 4 • 12 Students</p>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest px-4 py-2 border border-gray-200 rounded-lg bg-white w-full sm:w-auto text-center">View</button>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 text-sm font-semibold text-gray-500 hover:text-black transition-colors">View All Activities</button>
          </Card>

          <Card title="Announcements">
            <div className="space-y-6">
              {[
                { title: 'New Study Materials Available', author: 'Dr. Sarah Smith', date: '2h ago' },
                { title: 'Upcoming Holiday Notice', author: 'Admin Office', date: '5h ago' }
              ].map((ann, i) => (
                <div key={i} className="border-l-4 border-black pl-4 py-1">
                  <h4 className="font-bold text-gray-900">{ann.title}</h4>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">By {ann.author} • {ann.date}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title={profile?.role === 'admin' ? 'Payment Alerts' : 'Learning Progress'}>
             <div className="space-y-6">
               {profile?.role === 'admin' ? (
                 ['Alex Johnson', 'Maria Garcia', 'James Wilson'].map((name, i) => (
                   <div key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                         {name[0]}
                       </div>
                       <div>
                         <p className="text-sm font-bold">{name}</p>
                         <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Unpaid Balance</p>
                       </div>
                     </div>
                     <span className="text-sm font-bold">$250</span>
                   </div>
                 ))
               ) : (
                 [
                   { name: 'Mathematics', progress: 85 },
                   { name: 'Physics', progress: 42 },
                   { name: 'Chemistry', progress: 12 }
                 ].map((course, i) => (
                   <div key={i} className="space-y-2">
                     <div className="flex justify-between text-xs font-bold">
                       <span>{course.name}</span>
                       <span>{course.progress}%</span>
                     </div>
                     <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${course.progress}%` }}
                         className="h-full bg-black"
                       />
                     </div>
                   </div>
                 ))
               )}
             </div>
             <button className="w-full mt-6 py-2 text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest border border-dashed border-gray-200 rounded-xl">
               {profile?.role === 'admin' ? 'View All Financials' : 'View Full Progress'}
             </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
