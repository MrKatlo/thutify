import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { TrendingUp, Users, DollarSign, Download, Printer, Clock, CheckSquare, BarChart2, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as cfApi from '../services/cfApi';
import { formatMoney } from '../lib/currency';

const VIEW_META: Record<string, { title: string; description: string }> = {
  student: { title: 'Student Reports', description: 'Enrollment distribution and student counts.' },
  financial: { title: 'Financial Reports', description: 'Revenue, outstanding balances, and monthly collections.' },
  revenue: { title: 'Revenue Reports', description: 'Monthly tuition collection trends.' },
  course: { title: 'Course Reports', description: 'Students enrolled per course.' },
  attendance: { title: 'Attendance Reports', description: 'Institution-wide attendance rate.' },
  teacher: { title: 'Teacher Reports', description: 'Active teaching staff overview.' },
  performance: { title: 'Performance Analytics', description: 'Combined institutional health indicators.' },
  assignments: { title: 'Assignment Reports', description: 'Completion and grading rates across all courses.' },
  export: { title: 'Export Reports', description: 'Download or print report summaries.' },
};

const REPORT_TABS = [
  { id: 'performance', label: 'Overview' },
  { id: 'financial', label: 'Financial' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'student', label: 'Students' },
  { id: 'course', label: 'Courses' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'export', label: 'Export' },
];

interface ReportsProps {
  initialView?: string;
}

export function Reports({ initialView = 'performance' }: ReportsProps) {
  const { institutionId, institution } = useAuth();
  const [activeView, setActiveView] = useState(initialView);
  const currency = institution?.currency || 'BWP';
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [teacherCount, setTeacherCount] = useState(0);
  const [assignmentStats, setAssignmentStats] = useState({ total: 0, graded: 0 });

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  useEffect(() => {
    fetchData();
  }, [institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [finReport, enrollReport, attReport, teachers, allAssignments, allSubmissions] = await Promise.all([
        cfApi.getFinancialReport(institutionId),
        cfApi.getEnrollmentReport(institutionId),
        cfApi.getAttendanceReport(institutionId),
        cfApi.listTeachers(institutionId, { pagination: { limit: 1, offset: 0 } }),
        cfApi.listAssignments(institutionId),
        cfApi.listSubmissions(institutionId),
      ]);

      setReportData({
        financial: finReport,
        enrollment: enrollReport,
        attendance: attReport,
      });
      setTeacherCount(teachers.total ?? teachers.results?.length ?? 0);
      
      const graded = allSubmissions.filter((s: any) => s.status === 'graded' || s.grade != null).length;
      setAssignmentStats({
        total: allAssignments.length,
        graded: allSubmissions.length > 0 ? Math.round((graded / allSubmissions.length) * 100) : 0
      });
    } catch (error) {
      console.error('Fetch reports failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewMeta = VIEW_META[activeView] || VIEW_META.performance;
  const financial = reportData?.financial || { totalRevenue: 0, outstanding: 0, monthly: [] };
  const enrollment = reportData?.enrollment || { totalStudents: 0, distribution: [] };
  const attendance = reportData?.attendance || { rate: 0 };

  const exportCsv = () => {
    const rows = [
      ['Metric', `Value (${currency})`],
      ['Total Revenue', financial.totalRevenue],
      ['Outstanding', financial.outstanding],
      ['Total Students', enrollment.totalStudents],
      ['Attendance Rate', `${attendance.rate}%`],
      ['Teachers', teacherCount],
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `institution-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generating Analytics...</p>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Total Revenue', value: formatMoney(Number(financial.totalRevenue || 0), currency), icon: DollarSign, color: 'text-green-600 bg-green-50', views: ['financial', 'revenue', 'performance', 'export'] },
    { label: 'Total Enrolled', value: `${enrollment.totalStudents} Students`, icon: Users, color: 'text-blue-600 bg-blue-50', views: ['student', 'performance', 'export'] },
    { label: 'Balance Owed', value: formatMoney(Number(financial.outstanding || 0), currency), icon: Clock, color: 'text-red-600 bg-red-50', views: ['financial', 'performance', 'export'] },
    { label: 'Attendance', value: `${attendance.rate}%`, icon: CheckSquare, color: 'text-purple-600 bg-purple-50', views: ['attendance', 'performance', 'export'] },
    { label: 'Assignments', value: `${assignmentStats.total}`, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50', views: ['assignments', 'performance', 'export'] },
    { label: 'Teachers', value: `${teacherCount}`, icon: BarChart2, color: 'text-amber-600 bg-amber-50', views: ['teacher', 'performance', 'export'] },
  ];

  const visibleCards = activeView === 'export'
    ? summaryCards
    : summaryCards.filter((card) => card.views.includes(activeView));

  const showRevenueChart = ['financial', 'revenue', 'performance'].includes(activeView);
  const showEnrollmentChart = ['student', 'course', 'performance'].includes(activeView);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{viewMeta.title}</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">{viewMeta.description}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          {activeView === 'export' && (
            <Button onClick={exportCsv} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          )}
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2 print:hidden scrollbar-hide">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeView === tab.id
                ? 'bg-black text-white shadow-lg shadow-black/10'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'export' && (
        <Card title="Available Exports" description="Choose a format to download institutional metrics.">
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={exportCsv} className="p-4 border border-gray-100 rounded-2xl text-left hover:border-black transition-colors">
              <Download className="w-5 h-5 mb-2" />
              <p className="font-bold text-sm">Summary CSV</p>
              <p className="text-xs text-gray-500 mt-1">Revenue, enrollment, attendance, and staff counts.</p>
            </button>
            <button onClick={() => window.print()} className="p-4 border border-gray-100 rounded-2xl text-left hover:border-black transition-colors">
              <Printer className="w-5 h-5 mb-2" />
              <p className="font-bold text-sm">Printable Summary</p>
              <p className="text-xs text-gray-500 mt-1">Browser print view of the current dashboard.</p>
            </button>
          </div>
        </Card>
      )}

      {visibleCards.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(visibleCards.length, 4)} gap-6`} style={{ gridTemplateColumns: `repeat(${Math.min(visibleCards.length, 4)}, minmax(0, 1fr))` }}>
          {visibleCards.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${item.color}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                </div>
                <h4 className="text-2xl font-black text-gray-900">{item.value}</h4>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {(showRevenueChart || showEnrollmentChart) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {showRevenueChart && (
            <Card className="lg:col-span-2" title="Revenue Growth" description="Monthly tuition collection overview.">
              <div className="h-72 w-full mt-6">
                {(financial.monthly || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financial.monthly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Tooltip
                        cursor={{ fill: '#f9fafb' }}
                        formatter={(value: number) => [formatMoney(value, currency), 'Revenue']}
                        labelStyle={{ fontWeight: 700, color: '#111827' }}
                      />
                      <Bar dataKey="revenue" fill="#000000" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">No revenue data yet.</div>
                )}
              </div>
            </Card>
          )}

          {showEnrollmentChart && (
            <Card className={showRevenueChart ? '' : 'lg:col-span-3'} title="Enrollment Stats" description="Students per course.">
              <div className="h-72 w-full mt-6">
                {(enrollment.distribution || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enrollment.distribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" axisLine={false} tickLine={false} hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#374151' }} width={80} />
                      <Tooltip cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="students" fill="#000000" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">No enrollment data yet.</div>
                )}
              </div>
            </Card>
          )}

          {activeView === 'teacher' && (
            <Card title="Teaching Staff" description="Registered instructors on the platform.">
              <div className="mt-6 flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <BookOpen className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-3xl font-black">{teacherCount}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Active Teachers</p>
                </div>
              </div>
            </Card>
          )}

          {activeView === 'assignments' && (
            <Card title="Grading Progress" description="Share of submissions marked.">
              <div className="mt-6 flex items-center gap-4">
                <TrendingUp className="w-10 h-10 text-indigo-600" />
                <div>
                  <p className="text-4xl font-black">{assignmentStats.graded}%</p>
                  <p className="text-sm text-gray-500">Submissions Graded</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeView === 'attendance' && (
        <Card title="Attendance Rate" description="Aggregate presence across all recorded sessions.">
          <div className="mt-6 flex items-center gap-4">
            <TrendingUp className="w-10 h-10 text-purple-600" />
            <div>
              <p className="text-4xl font-black">{attendance.rate}%</p>
              <p className="text-sm text-gray-500">Institution-wide attendance rate</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

