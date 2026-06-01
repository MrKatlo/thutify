import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../ui/Card';
import { BookOpen, Users, CheckCircle2, Activity, Download, FileText } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import { Course, Enrollment, Material, Assignment, Submission } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function fmtDate(d?: string | number | null) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CourseAnalytics() {
  const { institutionId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'7d'|'30d'|'90d'>('30d');

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      setLoading(true);
      try {
        const [cList, mats] = await Promise.all([
          cfApi.listCourses(institutionId),
          cfApi.listMaterials(institutionId),
        ]);
        setCourses(cList || []);
        setMaterials(mats || []);
        if (cList && cList.length > 0) setSelectedCourseId(cList[0].id);
      } catch (err) {
        console.error('Failed loading course analytics base data', err);
      } finally { setLoading(false); }
    })();
  }, [institutionId]);

  useEffect(() => {
    if (!selectedCourseId || !institutionId) return;
    (async () => {
      setLoading(true);
      try {
        const analytics = await cfApi.getCourseAnalytics(institutionId, selectedCourseId);
        setEnrollments(analytics.enrollments || []);
        // merge materials if provided
        if (analytics.materials) setMaterials((prev) => {
          const others = prev.filter(m => String(m.course_id || m.courseId || '') !== selectedCourseId);
          return [...others, ...(analytics.materials || [])];
        });

        // still fetch assignments and submission lists for charts
        const assigns = await cfApi.listAssignments(institutionId, selectedCourseId);
        setAssignments(assigns || []);
        const assignmentIds = (assigns || []).map(a => a.id).filter(Boolean);
        if (assignmentIds.length > 0) {
          const allSubmissions = await cfApi.listSubmissions(institutionId);
          setSubmissions((allSubmissions || []).filter(s => assignmentIds.includes(s.assignment_id || s.assignmentId || '')));
        } else {
          setSubmissions([]);
        }
      } catch (err) {
        console.error('Failed loading course analytics details', err);
      } finally { setLoading(false); }
    })();
  }, [selectedCourseId, institutionId]);

  const materialsForCourse = useMemo(() => materials.filter(m => (m.course_id || m.courseId) === selectedCourseId), [materials, selectedCourseId]);

  // these may be provided by analytics API; fall back to local calculation
  const enrolledCount = (enrollments && enrollments.length) || 0;
  const completionRate = (enrollments && enrollments.length) === 0 ? 0 : Math.round((enrollments.filter((e:any) => String(e.status || '') === 'completed').length / Math.max(1, enrollments.length)) * 100);

  // attendance rate: compute from attendanceSessions -> fetch records count present vs total
  // listAttendanceSessions returns sessions; backend attendance records are institution scoped, so compute present rate by fetching records and filtering by course when needed
  const attendanceRate = useMemo(() => {
    if (!attendanceSessions || attendanceSessions.length === 0) return 0;
    // sessions may include present_count / total_count fields
    const totals = attendanceSessions.reduce((acc: {present:number; total:number}, s: any) => {
      const present = Number(s.present_count || s.present || 0);
      const total = Number(s.total_count || s.total || 0);
      return { present: acc.present + present, total: acc.total + total };
    }, { present: 0, total: 0 });
    if (totals.total === 0) return 0;
    return Math.round((totals.present / totals.total) * 100);
  }, [attendanceSessions]);

  const lessonViewsEstimate = useMemo(() => {
    // try to read from materials or analytics lessonProgress if available
    return (materialsForCourse.reduce((sum, m) => sum + (Number(m.view_count || m.views || 0) || 0), 0) || 0) || ((enrollments.length && 0) || 0);
  }, [materialsForCourse, enrollments]);

  const submissionCount = submissions.length;
  const materialDownloads = materialsForCourse.reduce((sum, m) => sum + (Number(m.download_count || m.downloads || 0) || 0), 0);

  // Prepare enrollment timeline for selected date range
  const timeline = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const now = Date.now();
    const buckets: Record<string, { date:string, enrolled:number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 24*60*60*1000);
      const key = d.toISOString().slice(0,10);
      buckets[key] = { date: fmtDate(d.toISOString()), enrolled: 0 };
    }
    enrollments.forEach(e => {
      const t = new Date(e.enrolledAt || e.enrolled_at || '').toISOString().slice(0,10);
      if (buckets[t]) buckets[t].enrolled += 1;
    });
    return Object.values(buckets);
  }, [enrollments, dateRange]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Course Analytics</h1>
          <p className="text-sm text-gray-500">Analytics per course: enrollments, attendance, completion, resources and assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="px-4 py-2 border rounded-2xl">
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select value={dateRange} onChange={e => setDateRange(e.target.value as any)} className="px-4 py-2 border rounded-2xl">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 text-blue-600"><BookOpen className="w-5 h-5" /><div className="text-xs uppercase font-bold text-gray-400">Enrolled</div></div>
          <div className="mt-3 text-3xl font-black">{enrolledCount}</div>
          <div className="text-sm text-gray-500">Students enrolled in this course</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 text-emerald-600"><CheckCircle2 className="w-5 h-5" /><div className="text-xs uppercase font-bold text-gray-400">Completion</div></div>
          <div className="mt-3 text-3xl font-black">{completionRate}%</div>
          <div className="text-sm text-gray-500">Students completed the course</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 text-sky-600"><Activity className="w-5 h-5" /><div className="text-xs uppercase font-bold text-gray-400">Attendance</div></div>
          <div className="mt-3 text-3xl font-black">{attendanceRate}%</div>
          <div className="text-sm text-gray-500">Present across recorded sessions</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-bold">Enrollment timeline</h3>
          <div style={{ height: 220 }} className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeline}>
                <XAxis dataKey="date" />
                <Tooltip />
                <Line type="monotone" dataKey="enrolled" stroke="#111827" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-bold">Activity summary</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">Lesson views (estimate)</div><div className="font-black">{lessonViewsEstimate}</div></div>
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">Resource downloads</div><div className="font-black">{materialDownloads}</div></div>
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">Assignment submissions</div><div className="font-black">{submissionCount}</div></div>
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">Assignments</div><div className="font-black">{assignments.length}</div></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-bold">Submissions over time</h3>
          <div style={{ height: 220 }} className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeline.map(d => ({ date: d.date, submissions: submissions.filter(s => (new Date(s.created_at || s.createdAt || 0)).toISOString().slice(0,10) === d.date).length }))}>
                <XAxis dataKey="date" />
                <Tooltip />
                <Bar dataKey="submissions" fill="#111827" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-bold">Top materials</h3>
          <div className="mt-4 space-y-2">
            {materialsForCourse.sort((a,b) => (Number(b.download_count||b.downloads||0) - Number(a.download_count||a.downloads||0))).slice(0,6).map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <div className="text-sm">{m.title || m.name}</div>
                <div className="text-sm font-black">{m.download_count || m.downloads || 0}</div>
              </div>
            ))}
            {materialsForCourse.length === 0 && <div className="text-sm text-gray-500">No course materials</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CourseAnalytics;
