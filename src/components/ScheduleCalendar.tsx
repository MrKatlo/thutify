import { Card } from './ui/Card';
import { Calendar as CalendarIcon, Clock, BookOpen, Bell } from 'lucide-react';
import { motion } from 'motion/react';

export function ScheduleCalendar() {
  const schedule = [
    { time: '09:00 AM', type: 'Class', title: 'Classical Physics 101', duration: '1.5 hrs', color: 'border-blue-500 bg-blue-50/50' },
    { time: '11:30 AM', type: 'Office Hours', title: 'Student Progress Reviews', duration: '1 hr', color: 'border-purple-500 bg-purple-50/50' },
    { time: '02:00 PM', type: 'Exam', title: 'Advanced Calculus Midterm', duration: '2 hrs', color: 'border-red-500 bg-red-50/50' },
    { time: '04:30 PM', type: 'Live Session', title: 'Web Development QA', duration: '1 hr', color: 'border-green-500 bg-green-50/50' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Teaching Calendar</h1>
          <p className="text-gray-500 mt-1 font-medium">Keep track of your live lectures, office hours, assignment deadlines, and exam schedules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2" title="Daily Agenda">
          <div className="space-y-4 mt-6">
            {schedule.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-4 border-l-4 rounded-r-2xl border ${item.color} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm font-bold text-gray-500 w-20 shrink-0">{item.time}</div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.type}</span>
                    <h4 className="font-bold text-gray-900 mt-0.5">{item.title}</h4>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium shrink-0">
                  <Clock className="w-3.5 h-3.5" /> {item.duration}
                </span>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card title="Monthly Overview">
          <div className="mt-4 border border-gray-100 rounded-2xl p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
              <span className="font-bold text-sm">May 2026</span>
              <CalendarIcon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 mb-2">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold">
              {Array.from({ length: 31 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`p-1.5 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors ${
                    i + 1 === 17 ? 'bg-black text-white' : i + 1 === 18 ? 'bg-red-100 text-red-700' : ''
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
