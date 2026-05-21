import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from './ui/Card';
import { Calendar as CalendarIcon, Clock, BookOpen, Bell, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import * as cfApi from '../services/cfApi';

export function ScheduleCalendar() {
  const { profile, institutionId } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const list = await cfApi.getTimetable(institutionId, profile?.role === 'teacher' ? profile.uid : undefined);
      setSchedule(list);
    } catch (err) {
      console.error("Fetch timetable failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (day: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Academic Calendar</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Review your weekly lecture schedule and upcoming institutional events.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Your Weekly Roster">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                 <Loader2 className="w-8 h-8 text-black animate-spin" />
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading agenda...</p>
              </div>
            ) : schedule.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl">
                <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-900">No classes scheduled.</p>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {schedule.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 border-l-4 rounded-r-2xl border-black bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-black text-gray-400 w-24 shrink-0 uppercase">{getDayName(item.day_of_week)}</div>
                      <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/40">{item.start_time} - {item.end_time}</span>
                        <h4 className="font-bold text-gray-900 mt-0.5">{item.course_name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Room: {item.room || 'Virtual'}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase shrink-0">
                      <Clock className="w-3.5 h-3.5" /> 1.5 Hrs
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="May 2026">
          <div className="mt-4 border border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-gray-300 mb-2 uppercase">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
              {Array.from({ length: 31 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`p-1.5 rounded-lg transition-all ${
                    i + 1 === 17 ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 space-y-3">
             <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                <Bell className="w-4 h-4 text-blue-600" />
                <div>
                   <p className="text-xs font-black text-blue-900">Exam Window</p>
                   <p className="text-[10px] text-blue-700 font-medium">May 24 - May 28</p>
                </div>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
