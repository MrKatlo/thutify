import { useAuth } from '../hooks/useAuth';
import { Card } from './ui/Card';
import { BookOpen, Users, Calendar, TrendingUp, Plus } from 'lucide-react';
import { motion } from 'motion/react';

export function Dashboard() {
  const { profile } = useAuth();

  const stats = [
    { label: 'Active Courses', value: '12', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Students', value: '48', icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Sessions Today', value: '8', icon: Calendar, color: 'bg-purple-50 text-purple-600' },
    { label: 'Avg. Progress', value: '74%', icon: TrendingUp, color: 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Welcome back, {profile?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Here's what's happening at your center today.</p>
        </div>
        {profile?.role !== 'student' && (
          <button className="bg-black text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            New Course
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
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
            title="Upcoming Sessions" 
            description="Your scheduled tutoring sessions for the next 24 hours."
          >
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center border border-gray-200 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">May</span>
                      <span className="text-lg font-bold leading-none">16</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-black transition-colors">Advanced Calculus</h4>
                      <p className="text-xs text-gray-500 font-medium">2:00 PM • Room 402 • 12 Students</p>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest px-3 py-1 border border-gray-200 rounded-lg bg-white">View</button>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 text-sm font-semibold text-gray-500 hover:text-black transition-colors">View All Sessions</button>
          </Card>

          <Card title="Recent Announcements">
            <div className="space-y-6">
              {[
                { title: 'New Study Materials', author: 'Dr. Sarah Smith', date: '2h ago' },
                { title: 'Holiday Schedule Update', author: 'Admin Office', date: '5h ago' }
              ].map((ann, i) => (
                <div key={i} className="border-l-2 border-black pl-4 py-1">
                  <h4 className="font-bold text-gray-900">{ann.title}</h4>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">By {ann.author} • {ann.date}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="Top Students">
             <div className="space-y-4">
               {[
                 { name: 'Alex Johnson', progress: 98, avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
                 { name: 'Maria Garcia', progress: 95, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
                 { name: 'Liam Wilson', progress: 92, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }
               ].map((student, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <img src={student.avatar} className="w-8 h-8 rounded-full border border-gray-100" />
                     <p className="text-sm font-bold text-gray-800">{student.name}</p>
                   </div>
                   <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{student.progress}%</span>
                 </div>
               ))}
             </div>
          </Card>

          <Card title="Quick Tasks" className="bg-black text-white border-none shadow-xl shadow-black/20">
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-white/30 flex items-center justify-center"></div>
                  <span className="text-sm font-medium text-white/80">Grade Physics Quiz 4</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-white/30 flex items-center justify-center"></div>
                  <span className="text-sm font-medium text-white/80">Send Monthly Reports</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-5 h-5 rounded bg-white flex items-center justify-center text-black">
                     <Plus className="w-3 h-3" />
                   </div>
                   <span className="text-sm font-bold">Add new task</span>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
