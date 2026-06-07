import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { BookOpen, Users, Calendar, TrendingUp, Plus, DollarSign, CheckCircle, Video, PenTool, Play, Layers, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import * as cfApi from '../services/cfApi';
import type { AuditLogEntry } from '../services/cfApi';
import type { StudentSummary } from '../types';
import { formatMoney } from '../lib/currency';
import { PageSkeleton } from './ui/PageSkeleton';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  initialView?: string;
}

const TEACHER_VIEW_META: Record<string, { title: string; description: string }> = {
  overview: { title: 'Teaching Overview', description: 'Your classes, students, and upcoming sessions at a glance.' },
  'my-classes': { title: 'My Classes', description: 'Courses you are assigned to teach.' },
  'my-schedule': { title: 'My Schedule', description: 'Timetable entries and upcoming live classes.' },
  'pending-grading': { title: 'Pending Grading', description: 'Student submissions awaiting your review.' },
};

interface ActivityItem {
  type: string;
  title: string;
  meta: string;
  date: string;
}

function formatAuditActivity(entry: AuditLogEntry): ActivityItem {
  const labels: Record<string, string> = {
    'teacher.account.created': 'Teacher account created',
    'teacher.profile.updated': 'Teacher profile updated',
    'teacher.courses.assigned': 'Teacher courses assigned',
    'teacher.attendance.marked': 'Teacher attendance marked',
    'student.profile.updated': 'Student profile updated',
    'student.status.updated': 'Student status updated',
  };
  const action = String(entry.action || '');
  const actor = entry.actorName || entry.actor_name || 'System';
  const metadata =
    entry.metadata && typeof entry.metadata === 'object' ? (entry.metadata as Record<string, unknown>) : {};
  const detail = [metadata.email, metadata.status, metadata.attendanceDate]
    .filter(Boolean)
    .map(String)
    .join(' • ');
  const createdAt = String(entry.createdAt || entry.created_at || '');
  return {
    type: action.includes('payment') ? 'payment' : action.includes('student') ? 'student' : 'system',
    title: labels[action] || action.replace(/\./g, ' '),
    meta: detail ? `${actor} • ${detail}` : actor,
    date: createdAt
      ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
      : 'Recently',
  };
}

export function Dashboard({ setActiveTab, initialView = 'overview' }: DashboardProps) {
  const { profile, canManageInstitution, isTeacher, institutionId, institution } = useAuth();
  const currency = institution?.currency || 'USD';

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
    attendanceRate: 0,
    balance: 0,
    paymentStatus: 'paid',
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
  const [unpaidStudents, setUnpaidStudents] = useState<StudentSummary[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([]);
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
        const [enrollments, courses, liveClasses, announcements, payments, assignments, attendanceRecords] = await Promise.all([
          cfApi.listEnrollments(institutionId, undefined, profile.uid),
          cfApi.listCourses(institutionId),
          cfApi.listLiveClasses(institutionId),
          cfApi.listAnnouncements(institutionId),
          cfApi.listPayments(institutionId, profile.uid),
          cfApi.listAssignments(institutionId),
          cfApi.listAttendanceRecords(institutionId),
        ]);

        const activeEnrollments = enrollments.filter((e: any) => e.status === 'active' || !e.status);
        const activeCourseIds = activeEnrollments.map((e: any) => e.course_id);
        const enrolled = courses.filter((c: any) => activeCourseIds.includes(c.id));
        setEnrolledCoursesList(enrolled);

        const completedCount = Array.isArray(profile.completedLessons) ? profile.completedLessons.length : 0;

        const studentAttendanceRecords = attendanceRecords.filter((record: any) =>
          (record.student_id === profile.uid || record.studentId === profile.uid)
        );
        const attendedCount = studentAttendanceRecords.filter((record: any) => record.status === 'present').length;
        const attendanceRate = studentAttendanceRecords.length > 0
          ? Math.round((attendedCount / studentAttendanceRecords.length) * 100)
          : 0;

        const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount_paid || p.amountPaid) || 0), 0);
        const totalExpected = enrolled.reduce((sum: number, c: any) => sum + (Number(c.fee) || 0), 0);
        const balance = Math.max(0, totalExpected - totalPaid);
        const paymentStatus = balance === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

        setStudentStats({
          enrolledCount: enrolled.length,
          completedCount,
          attendanceRate,
          balance,
          paymentStatus,
        });

        const classes = liveClasses
          .filter((lc: any) => activeCourseIds.includes(lc.course_id) || lc.course_id === 'all')
          .slice(0, 3);
        setUpcomingClasses(classes);

        const dueAssignments = assignments
          .filter((assignment: any) => activeCourseIds.includes(assignment.course_id || assignment.courseId))
          .map((assignment: any) => ({
            id: assignment.id,
            title: assignment.title,
            courseName: assignment.courseName || assignment.course_name || 'Course',
            dueDate: assignment.dueDate || assignment.due_date || 'No due date',
          }))
          .filter((assignment: any) => assignment.dueDate !== 'No due date')
          .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5);
        setUpcomingAssignments(dueAssignments);

        const anns = announcements.slice(0, 3);
        setAnnouncements(anns);

        setRecentActivities([
          { type: 'course', title: 'Course progress synced', meta: `${completedCount} lessons completed so far`, date: 'Today' },
        ]);

      } else {
        // --- OWNER & TEACHER DASHBOARD ---
        const ownerFetches = canManageInstitution
          ? [
              cfApi.listAuditLog(institutionId, { limit: 10 }),
              cfApi.listStudents(institutionId, {
                status: 'approved',
                pagination: { limit: 200, offset: 0 },
              }),
            ]
          : [Promise.resolve([]), Promise.resolve({ results: [], total: 0, limit: 0, offset: 0 })];

        const [dashStats, courses, liveClasses, announcements, enrollments, auditLog, studentsPage] =
          await Promise.all([
            cfApi.getDashboardStats(institutionId),
            cfApi.listCourses(institutionId),
            cfApi.listLiveClasses(institutionId),
            cfApi.listAnnouncements(institutionId),
            cfApi.listEnrollments(institutionId),
            ownerFetches[0] as Promise<AuditLogEntry[]>,
            ownerFetches[1] as Promise<{ results: StudentSummary[] }>,
          ]);

        setStats({
          studentsCount: dashStats.students_count || 0,
          teachersCount: dashStats.teachers_count || 0,
          coursesCount: dashStats.courses_count || 0,
          totalRevenue: dashStats.total_revenue || 0,
          unpaidCount: dashStats.unpaid_count || 0
        });

        if (canManageInstitution) {
          const auditEntries = auditLog as AuditLogEntry[];
          setRecentActivities(
            auditEntries.length > 0 ? auditEntries.map(formatAuditActivity) : [],
          );
          const withBalance = (studentsPage.results || [])
            .filter((student) => Number(student.balance ?? 0) > 0)
            .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
            .slice(0, 5);
          setUnpaidStudents(withBalance);
        }

        const myCourses = isTeacher && !canManageInstitution
          ? courses
          : courses.filter((c: any) => c.teacher_id === profile.uid || c.author_id === profile.uid);
        const myCoursesIds = myCourses.map((c: any) => c.id);
        setTeacherCourses(myCourses);

        let myStudentsCount = 0;
        if (myCoursesIds.length > 0) {
          const myEnrollments = enrollments.filter((e: any) => myCoursesIds.includes(e.course_id || e.courseId));
          myStudentsCount = Array.from(new Set(myEnrollments.map((e: any) => e.student_id || e.studentId))).length;
        }

        let myLessonsCount = 0;
        if (isTeacher && myCoursesIds.length > 0) {
          const lessonLists = await Promise.all(
            myCoursesIds.slice(0, 5).map(async (courseId: string) => {
              const modules = await cfApi.listModules(courseId);
              const perModule = await Promise.all(modules.map((m) => cfApi.listLessons(m.id)));
              return perModule.reduce((sum, lessons) => sum + lessons.length, 0);
            }),
          );
          myLessonsCount = lessonLists.reduce((sum, count) => sum + count, 0);
        }

        let avgProgress = 0;
        if (isTeacher && !canManageInstitution) {
          const [submissions, timetable, performance] = await Promise.all([
            cfApi.listSubmissions(institutionId),
            cfApi.getTimetable(institutionId, profile.uid),
            cfApi.getMyTeacherPerformance(institutionId).catch(() => null),
          ]);
          setPendingSubmissions(
            submissions.filter(
              (submission: any) =>
                submission.status === 'pending' || submission.status === 'submitted' || submission.grade == null,
            ),
          );
          setScheduleEntries(timetable);

          const courseEnrollments = enrollments.filter((e: any) => myCoursesIds.includes(e.course_id || e.courseId));
          const completedEnrollments = courseEnrollments.filter((e: any) => String(e.status || '') === 'completed').length;
          const enrollmentProgress = courseEnrollments.length > 0
            ? Math.round((completedEnrollments / courseEnrollments.length) * 100)
            : 0;
          const myAssignmentIds = new Set(
            (await cfApi.listAssignments(institutionId))
              .filter((a: any) => myCoursesIds.includes(a.course_id || a.courseId))
              .map((a: any) => a.id),
          );
          const mySubmissions = submissions.filter((s: any) => myAssignmentIds.has(s.assignment_id || s.assignmentId));
          const gradedSubmissions = mySubmissions.filter((s: any) => s.status === 'graded' || s.grade != null).length;
          const submissionProgress = mySubmissions.length > 0
            ? Math.round((gradedSubmissions / mySubmissions.length) * 100)
            : 0;
          avgProgress = performance?.courseCompletionRate ?? Math.round((enrollmentProgress + submissionProgress) / 2);
        }

        setTeacherStats({
          coursesCount: myCourses.length,
          studentsCount: myStudentsCount,
          lessonsCount: myLessonsCount,
          avgProgress,
        });

        const classes = (isTeacher && !canManageInstitution
          ? liveClasses.filter((lc: any) => lc.teacher_id === profile.uid)
          : liveClasses
        ).slice(0, 3);
        setUpcomingClasses(classes);

        // Announcements
        const anns = announcements.slice(0, 3);
        setAnnouncements(anns);

        if (!canManageInstitution) {
          setRecentActivities([]);
        }
      }
    } catch (err) {
      console.warn("Dashboard fetch failed:", err);
      if (canManageInstitution) {
        setRecentActivities([]);
        setUnpaidStudents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getOwnerStatsList = () => [
    { label: 'Total Students', value: stats.studentsCount.toString(), icon: Users, color: 'bg-blue-50 text-blue-600', tab: 'students/all' },
    { label: 'Total Teachers', value: stats.teachersCount.toString(), icon: BookOpen, color: 'bg-green-50 text-green-600', tab: 'teachers/all' },
    { label: 'Total Courses', value: stats.coursesCount.toString(), icon: Calendar, color: 'bg-orange-50 text-orange-600', tab: 'courses' },
    { label: 'Payments Received', value: formatMoney(stats.totalRevenue, currency), icon: DollarSign, color: 'bg-purple-50 text-purple-600', tab: 'financials' },
  ];

  const getTeacherStatsList = () => [
    { label: 'My Courses', value: teacherStats.coursesCount.toString(), icon: BookOpen, color: 'bg-blue-50 text-blue-600', tab: 'courses' },
    { label: 'My Students', value: teacherStats.studentsCount.toString(), icon: Users, color: 'bg-green-50 text-green-600', tab: 'students' },
    { label: 'Total Lessons', value: teacherStats.lessonsCount.toString(), icon: Calendar, color: 'bg-purple-50 text-purple-600', tab: 'assignments/scheduling' },
    { label: 'Avg. Progress', value: `${teacherStats.avgProgress}%`, icon: TrendingUp, color: 'bg-orange-50 text-orange-600', tab: 'dashboard/my-classes' },
  ];

  const getStudentStatsList = () => [
    { label: 'Enrolled Courses', value: studentStats.enrolledCount.toString(), icon: BookOpen, color: 'bg-blue-50 text-blue-600', tab: 'courses' },
    { label: 'Completed Lessons', value: studentStats.completedCount.toString(), icon: CheckCircle, color: 'bg-green-50 text-green-600', tab: 'courses' },
    { label: 'Attendance Rate', value: `${studentStats.attendanceRate}%`, icon: Calendar, color: 'bg-purple-50 text-purple-600', tab: 'student/attendance' },
    { label: 'Payment Balance', value: formatMoney(studentStats.balance, currency), icon: DollarSign, color: studentStats.balance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600', tab: 'finance/payments' },
  ];

  const statsList = canManageInstitution
    ? getOwnerStatsList()
    : isTeacher
    ? getTeacherStatsList()
    : getStudentStatsList();

  const contentActions = [
    { label: 'All Courses', icon: BookOpen, tab: 'courses/all' },
    { label: 'Materials', icon: FileText, tab: 'courses/materials' },
    { label: 'Curriculum', icon: Layers, tab: 'courses/categories' },
    { label: 'Enrollment', icon: Users, tab: 'courses/enrollment' },
  ];

  const teacherOnlyView = isTeacher && !canManageInstitution;
  const teacherView = teacherOnlyView ? (TEACHER_VIEW_META[initialView] ? initialView : 'overview') : 'overview';
  const teacherHeading = teacherOnlyView ? TEACHER_VIEW_META[teacherView] : null;

  if (teacherOnlyView && teacherView === 'my-classes') {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">{teacherHeading?.title}</h1>
          <p className="text-gray-500 mt-1 font-semibold text-sm">{teacherHeading?.description}</p>
        </div>
        {loading ? (
          <div className="h-48 bg-gray-50 rounded-3xl animate-pulse" />
        ) : teacherCourses.length === 0 ? (
          <Card className="p-8 text-center text-sm text-gray-500">No courses assigned yet.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teacherCourses.map((course) => (
              <Card key={course.id} className="p-5">
                <h3 className="font-bold text-gray-900">{course.title || course.course_name}</h3>
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{course.description || 'No description'}</p>
                <Button onClick={() => setActiveTab('courses/all')} className="mt-4 bg-black text-white text-xs">
                  Open Course
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (teacherOnlyView && teacherView === 'my-schedule') {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">{teacherHeading?.title}</h1>
          <p className="text-gray-500 mt-1 font-semibold text-sm">{teacherHeading?.description}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Timetable">
            {scheduleEntries.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4">No timetable entries yet.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {scheduleEntries.map((entry: any) => (
                  <div key={entry.id} className="p-3 border border-gray-100 rounded-xl text-sm">
                    <p className="font-bold">{entry.course_name || entry.courseName || 'Course'}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Day {entry.day_of_week ?? entry.dayOfWeek} • {entry.start_time || entry.startTime} – {entry.end_time || entry.endTime}
                      {entry.room ? ` • ${entry.room}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Upcoming Live Classes">
            {upcomingClasses.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4">No live classes scheduled.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {upcomingClasses.map((item: any) => (
                  <div key={item.id} className="p-3 border border-gray-100 rounded-xl text-sm">
                    <p className="font-bold">{item.title}</p>
                    <p className="text-gray-500 text-xs mt-1">{item.courseName || item.course_name || 'Classroom'}</p>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => setActiveTab('assignments/scheduling')} variant="outline" className="mt-4 text-xs">
              Open Exam Scheduling
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (teacherOnlyView && teacherView === 'pending-grading') {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">{teacherHeading?.title}</h1>
          <p className="text-gray-500 mt-1 font-semibold text-sm">{teacherHeading?.description}</p>
        </div>
        <Card title="Submissions Awaiting Review">
          {loading ? (
            <div className="h-32 bg-gray-50 rounded-2xl animate-pulse mt-4" />
          ) : pendingSubmissions.length === 0 ? (
            <p className="text-sm text-gray-500 mt-4">No pending submissions.</p>
          ) : (
            <div className="space-y-3 mt-4">
              {pendingSubmissions.slice(0, 20).map((submission: any) => (
                <div key={submission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-sm">{submission.assignment_title || submission.assignmentTitle || 'Assignment'}</p>
                    <p className="text-xs text-gray-500">{submission.student_name || submission.studentName || 'Student'}</p>
                  </div>
                  <Button onClick={() => setActiveTab('assignments/manual-grading')} className="text-xs bg-black text-white">
                    Grade
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (loading && !canManageInstitution && !isTeacher && profile?.role === 'student') {
    return <PageSkeleton cards={4} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
            Welcome back, {profile?.fullName?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-500 mt-1 font-semibold text-sm capitalize">
            {teacherHeading ? teacherHeading.description : `Role: ${profile?.role}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-gray-100 animate-pulse" />
          ))
        ) : statsList.map((stat, i) => (
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

      {(isTeacher || canManageInstitution) && !loading && (
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
                <p className="text-xs text-gray-400 uppercase tracking-widest">Courses</p>
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
                  const courseLessonIds = course.modules?.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []) || [];
                  const lessonCount = courseLessonIds.length;
                  const completedLessons = profile.completedLessons || [];
                  const finished = courseLessonIds.filter((id: string) => completedLessons.includes(id)).length;
                  const progress = lessonCount > 0 ? Math.round((finished / lessonCount) * 100) : 0;

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
                        onClick={() => setActiveTab('assignments/all')}
                        className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest px-4 py-2 border border-gray-200 rounded-xl bg-white w-full sm:w-auto text-center"
                      >
                        Submit
                      </button>
                    </div>
                  ))
                )
              ) : recentActivities.length === 0 ? (
                <div className="py-6 text-center text-gray-400 font-medium italic text-xs">
                  No recent institution activity yet.
                </div>
              ) : (
                recentActivities.map((act, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl group cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center border border-gray-200 shadow-sm shrink-0 px-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase leading-none text-center line-clamp-2">
                          {act.date}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-black transition-colors text-sm">{act.title}</h4>
                        <p className="text-xs text-gray-500 font-medium">{act.meta}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab(act.type === 'payment' ? 'finance/payments' : 'monitoring/activity')}
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

          <Card title={canManageInstitution ? 'Unpaid Balance Alerts' : 'Learning Progress'}>
             <div className="space-y-6 mt-4">
               {canManageInstitution ? (
                 <>
                   {unpaidStudents.length === 0 ? (
                     <p className="text-xs text-gray-400 italic text-center py-4">No outstanding student balances.</p>
                   ) : (
                     unpaidStudents.map((student) => {
                       const name = student.fullName || student.full_name || student.email || 'Student';
                       const balance = Number(student.balance ?? 0);
                       return (
                         <div key={student.userId || student.id} className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                               {name[0]}
                             </div>
                             <div>
                               <p className="text-sm font-bold">{name}</p>
                               <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Unpaid Balance</p>
                             </div>
                           </div>
                           <span className="text-sm font-black text-red-600">{formatMoney(balance, currency)}</span>
                         </div>
                       );
                     })
                   )}
                   <button 
                     onClick={() => setActiveTab('finance/balances')}
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
