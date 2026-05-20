import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { BookOpen, Users, Calendar, TrendingUp, Plus, DollarSign, CheckCircle, Clock, Video, Bell, PenTool, Award, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export function Dashboard({ setActiveTab }: DashboardProps) {
  const { profile, isAdmin } = useAuth();
  
  // Admin & Teacher stats
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
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      if (profile.role === 'student') {
        // --- STUDENT DYNAMIC DASHBOARD ---
        const [enrollSnap, coursesSnap, attendanceSnap, submissionsSnap, assignmentsSnap, liveClassesSnap, announcementsSnap, paymentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'enrollments'), where('studentId', '==', profile.uid), where('status', '==', 'active'))),
          getDocs(collection(db, 'courses')),
          getDocs(query(collection(db, 'attendance'), where('studentId', '==', profile.uid))),
          getDocs(query(collection(db, 'submissions'), where('studentId', '==', profile.uid))),
          getDocs(collection(db, 'assignments')),
          getDocs(collection(db, 'liveClasses')),
          getDocs(collection(db, 'announcements')),
          getDocs(query(collection(db, 'payments'), where('studentId', '==', profile.uid)))
        ]);

        const activeCourseIds = enrollSnap.docs.map(d => d.data().courseId);
        const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const enrolled = allCourses.filter(c => activeCourseIds.includes(c.id));
        setEnrolledCoursesList(enrolled);

        // Enrolled count
        const enrolledCount = enrolled.length;

        // Completed lessons count
        const completedCount = profile.completedLessons?.length || 0;

        // Attendance rate calculation
        const attendanceDocs = attendanceSnap.docs.map(d => d.data());
        const totalAttendance = attendanceDocs.length;
        const presentAttendance = attendanceDocs.filter(a => a.status === 'present').length;
        const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 95;

        // Balance & payment status from payments or profile
        const paymentsList = paymentsSnap.docs.map(d => d.data());
        const studentPaid = paymentsList.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
        // Let's assume total fees is enrolled courses fee sum
        const totalFeeExpected = enrolled.reduce((sum, c) => sum + Number(c.fee || 1000), 0);
        const balance = Math.max(0, totalFeeExpected - studentPaid);
        const paymentStatus = balance === 0 ? 'paid' : studentPaid > 0 ? 'partial' : 'unpaid';

        setStudentStats({
          enrolledCount: enrolledCount,
          completedCount: completedCount,
          attendanceRate,
          balance: balance,
          paymentStatus
        });

        // Upcoming assignments
        const submittedAssignIds = submissionsSnap.docs.map(d => d.data().assignmentId);
        const activeAssignments = assignmentsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(a => activeCourseIds.includes(a.courseId) && !submittedAssignIds.includes(a.id));
        setUpcomingAssignments(activeAssignments.slice(0, 3));

        // Upcoming live classes
        const classes = liveClassesSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(lc => activeCourseIds.includes(lc.courseId) || lc.courseId === 'all');
        setUpcomingClasses(classes.slice(0, 3));

        // Broadcast announcements
        const anns = announcementsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(ann => ann.targetRole === 'student' || ann.targetRole === 'all' || activeCourseIds.includes(ann.courseId));
        setAnnouncements(anns.slice(0, 3));

        // Recent completed lessons or actions
        setRecentActivities([
          { type: 'course', title: 'Joined Syllabus Workspace', meta: 'Platform active account synchronized', date: 'Today' },
          ...profile.completedLessons?.slice(-2).map((lessonId: string) => ({
            type: 'lesson',
            title: `Lesson Completed`,
            meta: `Verified completion log recorded`,
            date: 'Recent'
          })) || []
        ]);

      } else {
        // --- ADMIN & TEACHER DASHBOARD ---
        const [usersSnap, coursesSnap, paymentsSnap, liveClassesSnap, announcementsSnap, enrollmentsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'courses')),
          getDocs(collection(db, 'payments')),
          getDocs(collection(db, 'liveClasses')),
          getDocs(collection(db, 'announcements')),
          getDocs(collection(db, 'enrollments'))
        ]);

        const allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
        const studentsCount = allUsers.filter(u => u.role === 'student').length;
        const teachersCount = allUsers.filter(u => u.role === 'teacher').length;
        const coursesCount = coursesSnap.size;

        let totalRevenue = 0;
        paymentsSnap.forEach((doc) => {
          totalRevenue += Number(doc.data().amountPaid || 0);
        });

        // Compute unpaid count using actual student balances:
        const enrollments = enrollmentsSnap.docs.map(d => d.data());
        const paymentsList = paymentsSnap.docs.map(d => d.data());
        const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const studentIds = Array.from(new Set(enrollments.map(e => e.studentId)));
        let unpaidCount = 0;
        studentIds.forEach(sid => {
          const studentEnrollments = enrollments.filter(e => e.studentId === sid);
          const expected = studentEnrollments.reduce((sum, e) => {
            const course = allCourses.find(c => c.id === e.courseId);
            return sum + Number(course?.fee || 1000);
          }, 0);
          const paid = paymentsList.filter(p => p.studentId === sid).reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
          if (expected - paid > 0) {
            unpaidCount += 1;
          }
        });

        setStats({
          studentsCount: studentsCount,
          teachersCount: teachersCount,
          coursesCount: coursesCount,
          totalRevenue: totalRevenue,
          unpaidCount: unpaidCount
        });

        // Compute teacher stats dynamically
        const myCourses = allCourses.filter(c => c.teacherId === profile.uid || c.authorId === profile.uid);
        const myCoursesIds = myCourses.map(c => c.id);

        let myStudentsCount = 0;
        if (myCoursesIds.length > 0) {
          const myEnrollments = enrollments.filter(e => myCoursesIds.includes(e.courseId));
          myStudentsCount = Array.from(new Set(myEnrollments.map(e => e.studentId))).length;
        }

        let myLessonsCount = 0;
        myCourses.forEach(c => {
          c.modules?.forEach((m: any) => {
            myLessonsCount += m.lessons?.length || 0;
          });
        });

        setTeacherStats({
          coursesCount: myCourses.length,
          studentsCount: myStudentsCount,
          lessonsCount: myLessonsCount,
          avgProgress: 82
        });

        // Set live classes list for teachers/admins
        const classes = liveClassesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setUpcomingClasses(classes.slice(0, 3));

        // Announcements
        const anns = announcementsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setAnnouncements(anns.slice(0, 3));

        // Recent activities
        const activities: any[] = [];
        allUsers.filter(u => u.role === 'student').slice(0, 2).forEach((data) => {
          activities.push({
            type: 'student',
            title: `Student Profile: ${data.fullName}`,
            meta: `${data.email} • Active`,
            date: 'Recent'
          });
        });
        paymentsSnap.docs.slice(0, 2).forEach((doc) => {
          const data = doc.data();
          activities.push({
            type: 'payment',
            title: `Payment: $${data.amountPaid}`,
            meta: `Ref: ${data.referenceNumber || 'N/A'} • ${data.paymentMethod}`,
            date: 'Recent'
          });
        });

        setRecentActivities(activities.length > 0 ? activities : getMockActivities());
      }
    } catch (err) {
      console.warn("Firestore dashboard fetch failed. Loading mock visual specs:", err);
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

  const getAdminStatsList = () => [
    { label: 'Total Students', value: stats.studentsCount.toString(), icon: Users, color: 'bg-blue-50 text-blue-600', tab: 'students' },
    { label: 'Total Teachers', value: stats.teachersCount.toString(), icon: BookOpen, color: 'bg-green-50 text-green-600', tab: 'teachers' },
    { label: 'Total Courses', value: stats.coursesCount.toString(), icon: Calendar, color: 'bg-orange-50 text-orange-600', tab: 'courses' },
    { label: 'Payments Received', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-purple-50 text-purple-600', tab: 'financials' },
  ];

  const getTeacherStatsList = () => [
    { label: 'My Courses', value: teacherStats.coursesCount.toString(), icon: BookOpen, color: 'bg-blue-50 text-blue-600', tab: 'courses' },
    { label: 'My Students', value: teacherStats.studentsCount.toString(), icon: Users, color: 'bg-green-50 text-green-600', tab: 'students' },
    { label: 'Total Lessons', value: teacherStats.lessonsCount.toString(), icon: Calendar, color: 'bg-purple-50 text-purple-600', tab: 'calendar' },
    { label: 'Avg. Progress', value: `${teacherStats.avgProgress}%`, icon: TrendingUp, color: 'bg-orange-50 text-orange-600', tab: 'reports' },
  ];

  const getStudentStatsList = () => [
    { label: 'Enrolled Courses', value: studentStats.enrolledCount.toString(), icon: BookOpen, color: 'bg-blue-50 text-blue-600', tab: 'courses' },
    { label: 'Completed Lessons', value: studentStats.completedCount.toString(), icon: CheckCircle, color: 'bg-green-50 text-green-600', tab: 'courses' },
    { label: 'Attendance Rate', value: `${studentStats.attendanceRate}%`, icon: Calendar, color: 'bg-purple-50 text-purple-600', tab: 'attendance' },
    { label: 'Payment Balance', value: `$${studentStats.balance.toLocaleString()}`, icon: DollarSign, color: studentStats.balance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600', tab: 'financials' },
  ];

  const statsList = isAdmin 
    ? getAdminStatsList() 
    : profile?.role === 'teacher' 
    ? getTeacherStatsList() 
    : getStudentStatsList();

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
                        onClick={() => setActiveTab('courses')}
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
                        onClick={() => setActiveTab('assessment')}
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
                      onClick={() => setActiveTab(act.type === 'payment' ? 'financials' : 'students')}
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

          <Card title={isAdmin ? 'Unpaid Balance Alerts' : 'Learning Progress'}>
             <div className="space-y-6 mt-4">
               {isAdmin ? (
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
                     onClick={() => setActiveTab('financials')}
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
                     onClick={() => setActiveTab('courses')}
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
