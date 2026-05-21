import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as cfApi from '../../services/cfApi';
import { Card, Button } from '../ui/Card';
import { BookOpen, Clock, Award, Bell, ChevronRight, User } from 'lucide-react';
import { motion } from 'motion/react';

export function StudentDashboard({ setActiveTab }: { setActiveTab: (t: string) => void }) {
  const { profile, institutionId } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [profile, institutionId]);

  const fetchData = async () => {
    if (!institutionId || !profile) return;
    setLoading(true);
    try {
      const [allCourses, allEnrolls, allAnnounce] = await Promise.all([
        cfApi.listCourses(institutionId),
        cfApi.listEnrollments(institutionId, undefined, profile.uid),
        cfApi.listAnnouncements(institutionId)
      ]);

      const enrolledIds = allEnrolls.map((e: any) => e.course_id);
      setCourses(allCourses.filter((c: any) => enrolledIds.includes(c.id)));
      setAnnouncements(allAnnounce.slice(0, 3));
    } catch (err) {
      console.error("Student dashboard fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Academic Portal</span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Welcome back, {profile?.fullName}!</h1>
          <p className="text-gray-400 font-medium max-w-lg">Your academic journey continues. Track your progress, attend live classes, and complete your modules.</p>
        </div>
        <div className="relative z-10 flex gap-3">
          <Button onClick={() => setActiveTab('courses/all')} className="bg-white text-black hover:bg-gray-100 font-black px-6">My Courses</Button>
          <Button onClick={() => setActiveTab('communication/chat')} variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold">Messages</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900">Active Learning</h2>
            <button onClick={() => setActiveTab('courses/all')} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">View All</button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-3xl animate-pulse" />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium italic">You are not currently enrolled in any active courses.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="p-6 bg-white border border-gray-100 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg hover:border-black/5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg shadow-black/10 transition-transform group-hover:scale-105">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900">{course.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <User className="w-3 h-3" /> {course.teacher_name || 'Instructor'}
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3" /> Next Class: Tomorrow
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex-1 md:w-32">
                      <div className="flex justify-between items-center mb-1.5">
                         <span className="text-[10px] font-black text-gray-400 uppercase">Progress</span>
                         <span className="text-[10px] font-black text-black">65%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black w-[65%]" />
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('courses/all')}
                      className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Stats & Announce */}
        <div className="space-y-6">
          <Card title="Academic Summary" className="bg-gray-50/50 border-gray-100">
             <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-white rounded-2xl border border-gray-100">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">GPA</p>
                   <p className="text-xl font-black text-gray-900">3.8</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Certs</p>
                   <p className="text-xl font-black text-gray-900">12</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 col-span-2 flex items-center justify-between">
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Attendance</p>
                     <p className="text-xl font-black text-green-600">98%</p>
                   </div>
                   <Award className="w-8 h-8 text-gray-200" />
                </div>
             </div>
          </Card>

          <Card title="Latest Board Postings">
            <div className="space-y-4 mt-6">
               {announcements.map((a, i) => (
                 <div key={i} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                       <Bell className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                       <p className="text-xs font-black text-gray-900 truncate">{a.title}</p>
                       <p className="text-[10px] text-gray-400 font-medium line-clamp-2 mt-0.5">{a.content}</p>
                    </div>
                 </div>
               ))}
               <Button onClick={() => setActiveTab('communication/announcements')} variant="outline" className="w-full text-[10px] py-2 border-dashed border-gray-200 text-gray-400 hover:text-black hover:border-black">Browse Notice Board</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
