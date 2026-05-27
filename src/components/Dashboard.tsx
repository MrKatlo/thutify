import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { BookOpen, Users, Calendar, TrendingUp, Plus, DollarSign, CheckCircle, Clock, Video, Bell, PenTool, Award, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as cfApi from '../services/cfApi';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export function Dashboard({ setActiveTab }: DashboardProps) {
  const { profile, isOwner, institutionId } = useAuth();

  // Owner & Teacher stats
  const [stats, setStats] = useState({
    studentsCount: 0,
    teachersCount: 0,
    coursesCount: 0,
    totalRevenue: 0,
    unpaidCount: 0
  });

  // Student metrics
  const [studentStats, setStudentStats] = useState({
    enrolledCount: 0,
    completedCount: 0,
    attendanceRate: 95,
    balance: 1000,
    paymentStatus: 'unpaid'
  });

  // Teacher metrics
  const [teacherStats, setTeacherStats] = useState({
    coursesCount: 0,
    studentsCount: 0,
    lessonsCount: 0,
    avgProgress: 75
  });

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [enrolledCoursesList, setEnrolledCoursesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile, institutionId]);

  const fetchDashboardData = async () => {
    if (!profile || !institutionId) return;
    setLoading(true);
    try {
      if (profile.role === 'student') {
        // --- STUDENT DYNAMIC DASHBOARD ---
        const [enrollments, courses, liveClasses, announcements, payments] = await Promise.all([
          cfApi.listEnrollments(institutionId, undefined, profile.uid),
          cfApi.listCourses(institutionId),
          cfApi.listLiveClasses(institutionId),
          cfApi.listAnnouncements(institutionId),
          cfApi.listPayments(institutionId, profile.uid),
        ]);

        const activeCourseIds = enrollments
          .filter((e: any) => e.status === 'active')
          .map((e: any) => e.course_id);
        const enrolled = courses.filter((c: any) => activeCourseIds.includes(c.id));
        setEnrolledCoursesList(enrolled);

        // Enrolled count
        const enrolledCount = enrolled.length;

        // For now, use placeholder for completed count (would need lesson progress tracking)
        const completedCount = 0;

        // Attendance rate placeholder
        const attendanceRate = 95;

        // Calculate balance from payments
        const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0);
        const totalExpected = enrolled.reduce((sum: number, c: any) => sum + (Number(c.fee) || 1000), 0);
        const balance = Math.max(0, totalExpected - totalPaid);
        const paymentStatus = balance === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

        setStudentStats({
          enrolledCount: enrolledCount,
          completedCount: completedCount,
          attendanceRate,
          balance: balance,
          paymentStatus
        });

        // Upcoming live classes
        const classes = liveClasses
          .filter((lc: any) => activeCourseIds.includes(lc.course_id) || lc.course_id === 'all')
          .slice(0, 3);
        setUpcomingClasses(classes);

        // Announcements for student
        const anns = announcements.slice(0, 3);
        setAnnouncements(anns);

        // Recent activities
        setRecentActivities([
          { type: 'course', title: 'Joined Syllabus Workspace', meta: 'Platform active account synchronized', date: 'Today' },
        ]);

      } else {
        // --- OWNER & TEACHER DASHBOARD ---
        const [dashStats, courses, liveClasses, announcements, enrollments] = await Promise.all([
          cfApi.getDashboardStats(institutionId),
          cfApi.listCourses(institutionId),
          cfApi.listLiveClasses(institutionId),
          cfApi.listAnnouncements(institutionId),
          cfApi.listEnrollments(institutionId),
        ]);

        setStats({
          studentsCount: dashStats.students_count || 0,
          teachersCount: dashStats.teachers_count || 0,
          coursesCount: dashStats.courses_count || 0,
          totalRevenue: dashStats.total_revenue || 0,
          unpaidCount: dashStats.unpaid_count || 0
        });

        // Compute teacher stats dynamically
        const myCourses = courses.filter((c: any) => c.teacher_id === profile.uid || c.author_id === profile.uid);
        const myCoursesIds = myCourses.map((c: any) => c.id);

        let myStudentsCount = 0;
        if (myCoursesIds.length > 0) {
          const myEnrollments = enrollments.filter((e: any) => myCoursesIds.includes(e.course_id));
          myStudentsCount = Array.from(new Set(myEnrollments.map((e: any) => e.student_id))).length;
        }

        // Placeholder for lessons count (would require course structure in D1)
        let myLessonsCount = 0;

        setTeacherStats({
          coursesCount: myCourses.length,
          studentsCount: myStudentsCount,
          lessonsCount: myLessonsCount,
          avgProgress: 82
        });

        // Set live classes list for teachers/owners
        const classes = liveClasses.slice(0, 3);
        setUpcomingClasses(classes);

        // Announcements
        const anns = announcements.slice(0, 3);
        setAnnouncements(anns);

        // Recent activities - placeholder for now
        setRecentActivities(getMockActivities());
      }
    } catch (err) {
      console.warn("Dashboard fetch failed:", err);
      setRecentActivities(getMockActivities());
    } finally {
      setLoading(false);
    }
  };

  const getMockActivities = () => [
    { type: 'student', title: 'Student Enrolled: Alex Johnson', meta: 'Advanced Mathematics • Active', date: 'May 16' },
    { type: 'payment', title: 'Payment Recorded: $500', meta: 'Ref: REF908123 • Card', date: 'May 15' },
    { type: 'student', title: 'Student Enrolled: Maria Garcia', meta: 'Physics 101 • Active', date: 'May 14' }
  ];

  const getOwnerStatsList = () => [
    { label: 'Total Students', value: stats.studentsCount.toString(), icon: Users, color: 'bg-blue-50 text-blue-600', tab: 'students/all' },
    { label: 'Total Teachers', value: stats.teachersCount.toString(), icon: BookOpen, color: 'bg-green-50 text-green-600', tab: 'teachers/all' },
    { label: 'Total Courses', value: stats.coursesCount.toString(), icon: Calendar, color: 'bg-orange-50 text-orange-600', tab: 'courses' },
    { label: 'Payments Received', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-purple-50 text-purple-600', tab: 'financials' },
  ];

  const getTeacherStatsList = () => [
    { label: 'My Courses', value: teacherStats.coursesCount.toString(), icon: BookOpen, color: 'bg-blue-50 text-blue-600', tab: 'courses' },
    { label: 'My Students', value: teacherStats.studentsCount.toString(), icon: Users, color: 'bg-green-50 text-green-600', tab: 'students' },
    { label: 'Total Lessons', value: teacherStats.lessonsCount.toString(), icon: Calendar, color: 'bg-purple-50 text-purple-600', tab: 'assignments/scheduling' },
    { label: 'Avg. Progress', value: `${teacherStats.avgProgress}%`, icon: TrendingUp, color: 'bg-orange-50 text-orange-600', tab: 'reports' },
  ];

  const getStudentStatsList = () => [
    { label: 'Enrolled Courses', value: studentStats.enrolledCount.toString(), icon: BookOpen, color: 'bg-blue-50 text-blue-600', tab: 'courses' },
    { label: 'Completed Lessons', value: studentStats.completedCount.toString(), icon: CheckCircle, color: 'bg-green-50 text-green-600', tab: 'courses' },
    { label: 'Attendance Rate', value: `${studentStats.attendanceRate}%`, icon: Calendar, color: 'bg-purple-50 text-purple-600', tab: 'attendance' },
    { label: 'Payment Balance', value: `$${studentStats.balance.toLocaleString()}`, icon: DollarSign, color: studentStats.balance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600', tab: 'dashboard/overview' },
  ];

  const statsList = isOwner
    ? getOwnerStatsList()
    : profile?.role === 'teacher'
    ? getTeacherStatsList()
    : getStudentStatsList();

  const contentActions = [
    { label: 'Syllabus', icon: BookOpen, tab: 'content/syllabus' },
    { label: 'Modules', icon: Layers, tab: 'content/modules' },
    { label: 'Lessons', icon: FileText, tab: 'content/lessons' },
    { label: 'Upload Materials', icon: Plus, tab: 'content/upload' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
            Welcome back, {profile?.fullName?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 mt-1 font-semibold text-sm capitalize">Role: {profile?.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        {statsList.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setActiveTab(stat.tab)}
            className="cursor-pointer hover:scale-[1.02] transition-all"
          >
            <Card className="flex items-start justify-between h-full hover:shadow-lg transition-shadow">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-2xl font-black tracking-tight">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {(profile?.role === 'teacher' || isOwner) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          {contentActions.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.tab)}
              className="flex items-center gap-3 p-5 bg-white border border-gray-200 rounded-3xl hover:border-black hover:shadow-lg transition-all text-left"
            >
              <div className="w-12 h-12 rounded-3xl bg-black text-white flex items-center justify-center">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Course content</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {profile?.role === 'student' && enrolledCoursesList.length > 0 && (
            <Card title="Continue Learning" description="Instantly jump back into your enrolled courses.">
              <div className="space-y-4">
                {enrolledCoursesList.map((course) => {
                  const lessonCount = course.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0) || 1;
                  const completedLessons = profile.completedLessons || [];
                  const courseLessonIds = course.modules?.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []) || [];
                  const finished = courseLessonIds.filter((id: string) => completedLessons.includes(id)).length;
                  const progress = Math.round((finished / lessonCount) * 100);

                  return (
                    <div key={course.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-bold text-gray-900 text-sm">{course.title}</h4>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 h-1.5 rounded-full overflow-hidden max-w-[200px]">
                            <div className="bg-black h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-gray-500">{progress}% Completed</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => setActiveTab('courses/all')}
                        className="bg-black text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Resume
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card 
            title={profile?.role === 'student' ? 'My Upcoming Tasks' : 'Recent Activities'} 
            description={profile?.role === 'student' ? 'Complete outstanding homework and assignments due.' : 'Keep track of the latest updates and progress.'}
          >
            <div className="space-y-4">
              {profile?.role === 'student' ? (
                upcomingAssignments.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 font-medium italic text-xs">
                    🎉 Excellent! No pending assignments due.
                  </div>
                ) : (
                  upcomingAssignments.map((act, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl group cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center border border-gray-200 shadow-sm shrink-0">
                          <PenTool className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 group-hover:text-black transition-colors text-sm">{act.title}</h4>
                          <p className="text-xs text-gray-500 font-medium">Course: {act.courseName} • Due: {act.dueDate}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('assignments/submissions')}
                        className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest px-4 py-2 border border-gray-200 rounded-xl bg-white w-full sm:w-auto text-center"
                      >
                        Submit
                      </button>
                    </div>
                  ))
                )
              ) : (
                recentActivities.map((act, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl group cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center border border-gray-200 shadow-sm shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-0.5">May</span>
                        <span className="text-lg font-bold leading-none">{act.date.split('/')[1] || '16'}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-black transition-colors text-sm">{act.title}</h4>
                        <p className="text-xs text-gray-500 font-medium">{act.meta}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab(act.type === 'payment' ? 'finance/payments' : 'students/all')}
                      className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest px-4 py-2 border border-gray-200 rounded-xl bg-white w-full sm:w-auto text-center"
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Bulletins & Notices" description="System announcements and notifications.">
            <div className="space-y-6 mt-4">
              {announcements.length === 0 ? (
                <div className="py-4 text-center text-gray-400 text-xs italic font-medium">
                  No active announcements.
                </div>
              ) : (
                announcements.map((ann, i) => (
                  <div key={i} className="border-l-4 border-black pl-4 py-1">
                    <h4 className="font-bold text-gray-900 text-sm">{ann.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{ann.message}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Course: {ann.courseName || 'General'}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="Virtual Classes">
            <div className="space-y-4">
              {upcomingClasses.length === 0 ? (
                <p className="text-xs text-gray-400 font-medium italic text-center py-6">No classes scheduled.</p>
              ) : (
                upcomingClasses.map((item, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded">
                        {item.platform}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">Course: {item.courseName || 'Classroom'}</p>
                    <p className="text-xs text-gray-400 font-semibold">{item.dateTime}</p>
                    <a 
                      href={item.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-black hover:bg-gray-800 text-white font-bold text-xs py-2 px-4 rounded-xl text-center flex items-center justify-center gap-2 mt-2 transition-all active:scale-95"
                    >
                      <Video className="w-3.5 h-3.5" /> Join Room
                    </a>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title={isOwner ? 'Unpaid Balance Alerts' : 'Learning Progress'}>
             <div className="space-y-6 mt-4">
               {isOwner ? (
                 <>
                   {[
                     { name: 'Alex Johnson', balance: 250 },
                     { name: 'Maria Garcia', balance: 200 },
                     { name: 'James Wilson', balance: 400 }
                   ].map((item, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                           {item.name[0]}
                         </div>
                         <div>
                           <p className="text-sm font-bold">{item.name}</p>
                           <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Unpaid Balance</p>
                         </div>
                       </div>
                       <span className="text-sm font-black text-red-600">${item.balance}</span>
                     </div>
                   ))}
                   <button 
                     onClick={() => setActiveTab('finance/payments')}
                     className="w-full mt-6 py-2.5 text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest border border-dashed border-gray-200 rounded-xl transition-all"
                   >
                     View All Financials
                   </button>
                 </>
               ) : (
                 <>
                   {enrolledCoursesList.map((course, i) => {
                     const lessonCount = course.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0) || 1;
                     const completedLessons = profile.completedLessons || [];
                     const courseLessonIds = course.modules?.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []) || [];
                     const finished = courseLessonIds.filter((id: string) => completedLessons.includes(id)).length;
                     const progress = Math.round((finished / lessonCount) * 100);

                     return (
                       <div key={i} className="space-y-2">
                         <div className="flex justify-between text-xs font-bold">
                           <span>{course.title}</span>
                           <span>{progress}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${progress}%` }}
                             className="h-full bg-black"
                           />
                         </div>
                       </div>
                     );
                   })}
                   <button 
                     onClick={() => setActiveTab('courses/all')}
                     className="w-full mt-6 py-2.5 text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest border border-dashed border-gray-200 rounded-xl transition-all"
                   >
                     View Full Syllabus
                   </button>
                 </>
               )}
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
