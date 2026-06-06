import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { BookOpen, Users, CheckCircle2, Activity } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import { Course, Material, Assignment, Submission } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];

function fmtDate(d?: string | number | null) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CourseAnalytics() {
  const { institutionId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      setLoading(true);
      try {
        const cList = await cfApi.listCourses(institutionId);
        setCourses(cList || []);
        if (cList?.length) setSelectedCourseId(cList[0].id);
      } catch (err) {
        console.error('Failed loading courses for analytics', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId]);

  useEffect(() => {
    if (!selectedCourseId || !institutionId) return;
    (async () => {
      setLoading(true);
      try {
        const [data, assigns, allSubmissions, mats] = await Promise.all([
          cfApi.getCourseAnalytics(institutionId, selectedCourseId),
          cfApi.listAssignments(institutionId, selectedCourseId),
          cfApi.listSubmissions(institutionId),
          cfApi.listMaterials(institutionId),
        ]);
        setAnalytics(data);
        setAssignments(assigns || []);
        const assignmentIds = (assigns || []).map((a) => a.id).filter(Boolean);
        setSubmissions(
          (allSubmissions || []).filter((s) =>
            assignmentIds.includes(s.assignment_id || s.assignmentId || ''),
          ),
        );
        setMaterials((mats || []).filter((m) => (m.course_id || m.courseId) === selectedCourseId));
      } catch (err) {
        console.error('Failed loading course analytics', err);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCourseId, institutionId]);

  const enrolledCount = analytics?.totalEnrolled ?? analytics?.enrolledCount ?? 0;
  const completionRate = analytics?.courseCompletionRate ?? analytics?.completionRate ?? 0;
  const attendanceRate = analytics?.attendanceRate ?? 0;
  const materialDownloads = analytics?.totalDownloads ?? materials.reduce(
    (sum, m) => sum + Number(m.download_count || m.downloads || 0),
    0,
  );

  const enrollments = analytics?.enrollments || [];

  const timeline = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const now = Date.now();
    const buckets: Record<string, { date: string; enrolled: number; submissions: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: fmtDate(d.toISOString()), enrolled: 0, submissions: 0 };
    }
    enrollments.forEach((e: any) => {
      const key = new Date(e.enrolledAt || e.enrolled_at || '').toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].enrolled += 1;
    });
    submissions.forEach((s) => {
      const key = new Date(s.created_at || s.createdAt || '').toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].submissions += 1;
    });
    return Object.values(buckets);
  }, [enrollments, submissions, dateRange]);

  const topMaterials = useMemo(
    () =>
      [...materials]
        .sort((a, b) => Number(b.download_count || b.downloads || 0) - Number(a.download_count || a.downloads || 0))
        .slice(0, 6)
        .map((m, i) => ({
          name: (m.title || m.name || 'File').slice(0, 18),
          downloads: Number(m.download_count || m.downloads || 0),
          fill: CHART_COLORS[i % CHART_COLORS.length],
        })),
    [materials],
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Live stats from your database.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: 'Enrolled', value: enrolledCount, icon: Users, color: 'text-blue-600' },
          { label: 'Completion', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Attendance', value: `${attendanceRate}%`, icon: Activity, color: 'text-violet-600' },
          { label: 'Downloads', value: materialDownloads, icon: BookOpen, color: 'text-amber-600' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className={`flex items-center gap-2 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
              <span className="text-xs font-semibold text-gray-500">{stat.label}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-gray-900">{loading ? '…' : stat.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-bold text-gray-900">Enrollments</h3>
          <div className="h-52 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="enrolled" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-bold text-gray-900">Submissions</h3>
          <div className="h-52 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="submissions" radius={[6, 6, 0, 0]}>
                  {timeline.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-bold text-gray-900 mb-3">Top materials</h3>
        {topMaterials.length === 0 ? (
          <p className="text-sm text-gray-500">No downloads yet.</p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMaterials} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="downloads" radius={[0, 6, 6, 0]}>
                  {topMaterials.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">{assignments.length} assignments · {submissions.length} submissions</p>
      </Card>
    </div>
  );
}

export default CourseAnalytics;
