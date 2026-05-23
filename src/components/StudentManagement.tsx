import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  PauseCircle,
  Phone,
  PlayCircle,
  RefreshCw,
  Search,
  Shield,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Button, Card } from './ui/Card';
import type { Course, PaginatedResult, StudentSummary } from '../types';
import * as cfApi from '../services/cfApi';

interface StudentManagementProps {
  activeTab: string;
}

type StudentStatus = StudentSummary['status'];

interface StudentStatusTotals {
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
}

interface AddStudentFormState {
  fullName: string;
  email: string;
  phone: string;
  parentGuardianName: string;
  parentGuardianEmail: string;
  parentGuardianPhone: string;
  temporaryPassword: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  notes: string;
}

const PAGE_SIZE = 10;

const EMPTY_PAGINATED_RESULT: PaginatedResult<StudentSummary> = {
  results: [],
  total: 0,
  limit: PAGE_SIZE,
  offset: 0,
};

const TAB_COPY: Record<string, { title: string; description: string }> = {
  'students/all': {
    title: 'All Students',
    description: 'View every applicant and active student immediately, with lifecycle status and quick actions.',
  },
  'students/add': {
    title: 'Add Student',
    description: 'Manually create student accounts, set their initial lifecycle state, and generate access credentials.',
  },
  'students/profiles': {
    title: 'Student Profiles',
    description: 'Inspect complete student records, guardian information, notes, and recent activity.',
  },
  'students/progress': {
    title: 'Student Progress',
    description: 'Track lesson completion and overall learning progress using real lesson and quiz data.',
  },
  'students/enrollment': {
    title: 'Enrollment Management',
    description: 'Review pending applications, approved students, rejected applications, and suspended access in one place.',
  },
  'students/attendance': {
    title: 'Student Attendance',
    description: 'Monitor attendance percentages, late counts, and session participation by student.',
  },
  'students/performance': {
    title: 'Student Performance',
    description: 'Review assignment averages, quiz averages, and overall assessment performance.',
  },
  'students/suspend': {
    title: 'Suspend / Activate Students',
    description: 'Control account access without deleting records, and keep the full lifecycle audit trail.',
  },
  'students/export': {
    title: 'Export Students',
    description: 'Download student records in CSV or Excel-friendly format with status, progress, attendance, and subject data.',
  },
};

const INITIAL_FORM_STATE: AddStudentFormState = {
  fullName: '',
  email: '',
  phone: '',
  parentGuardianName: '',
  parentGuardianEmail: '',
  parentGuardianPhone: '',
  temporaryPassword: '',
  status: 'pending',
  notes: '',
};

function formatDate(value?: string | number | Date | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString();
}

function statusClasses(status: StudentStatus) {
  switch (status) {
    case 'approved':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'suspended':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'pending':
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

function paymentClasses(status?: string) {
  if (status === 'paid') return 'text-green-600';
  if (status === 'partial') return 'text-amber-600';
  return 'text-red-500';
}

function clampPercentage(value?: number | null) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function escapeCsvValue(value: unknown) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function summaryValue(student: StudentSummary, key: 'progress' | 'attendance' | 'performance') {
  if (key === 'progress') return clampPercentage(student.progressPercentage);
  if (key === 'attendance') return clampPercentage(student.attendancePercentage);
  return clampPercentage(student.assessmentAverage);
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center py-12 border-dashed">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{body}</p>
    </Card>
  );
}

export function StudentManagement({ activeTab }: StudentManagementProps) {
  const { profile, institutionId, isOwner, isAdmin, isTeacher } = useAuth();
  const canManageLifecycle = Boolean(isOwner || isAdmin);

  const viewCopy = TAB_COPY[activeTab] || TAB_COPY['students/all'];

  const [studentsResponse, setStudentsResponse] =
    useState<PaginatedResult<StudentSummary>>(EMPTY_PAGINATED_RESULT);
  const [statusTotals, setStatusTotals] = useState<StudentStatusTotals>({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<AddStudentFormState>(INITIAL_FORM_STATE);

  const totalPages = Math.max(1, Math.ceil((studentsResponse.total || 0) / PAGE_SIZE));
  const canSeeStudentArea = Boolean(isOwner || isAdmin || isTeacher);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm, statusFilter, courseFilter]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!institutionId || !canSeeStudentArea) return;

    let cancelled = false;

    const loadReferenceData = async () => {
      try {
        const courseList = await cfApi.listCourses(institutionId);
        if (!cancelled) setCourses(courseList);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load course filters');
        }
      }
    };

    void loadReferenceData();

    return () => {
      cancelled = true;
    };
  }, [institutionId, canSeeStudentArea]);

  useEffect(() => {
    if (!institutionId || !canSeeStudentArea) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const queryStatus = statusFilter === 'all' ? undefined : statusFilter;
    const queryCourse = courseFilter === 'all' ? undefined : courseFilter;

    const loadStudents = async () => {
      try {
        const [pageResponse, pendingResponse, approvedResponse, rejectedResponse, suspendedResponse] =
          await Promise.all([
            cfApi.listStudents(institutionId, {
              q: searchTerm || undefined,
              status: queryStatus,
              courseId: queryCourse,
              pagination: { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
            }),
            cfApi.listStudents(institutionId, {
              q: searchTerm || undefined,
              status: 'pending',
              courseId: queryCourse,
              pagination: { limit: 1, offset: 0 },
            }),
            cfApi.listStudents(institutionId, {
              q: searchTerm || undefined,
              status: 'approved',
              courseId: queryCourse,
              pagination: { limit: 1, offset: 0 },
            }),
            cfApi.listStudents(institutionId, {
              q: searchTerm || undefined,
              status: 'rejected',
              courseId: queryCourse,
              pagination: { limit: 1, offset: 0 },
            }),
            cfApi.listStudents(institutionId, {
              q: searchTerm || undefined,
              status: 'suspended',
              courseId: queryCourse,
              pagination: { limit: 1, offset: 0 },
            }),
          ]);

        if (cancelled) return;

        setStudentsResponse(pageResponse);
        setStatusTotals({
          pending: pendingResponse.total,
          approved: approvedResponse.total,
          rejected: rejectedResponse.total,
          suspended: suspendedResponse.total,
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load student data');
          setStudentsResponse(EMPTY_PAGINATED_RESULT);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [institutionId, canSeeStudentArea, searchTerm, statusFilter, courseFilter, page, refreshToken]);

  const topCards = useMemo(
    () => [
      { label: 'Pending', value: statusTotals.pending, tone: 'bg-blue-50 text-blue-700' },
      { label: 'Approved', value: statusTotals.approved, tone: 'bg-green-50 text-green-700' },
      { label: 'Rejected', value: statusTotals.rejected, tone: 'bg-red-50 text-red-700' },
      { label: 'Suspended', value: statusTotals.suspended, tone: 'bg-amber-50 text-amber-700' },
    ],
    [statusTotals],
  );

  const performanceAverage = useMemo(() => {
    const values = studentsResponse.results
      .map((student) => student.assessmentAverage)
      .filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [studentsResponse.results]);

  const attendanceAverage = useMemo(() => {
    const values = studentsResponse.results
      .map((student) => student.attendancePercentage)
      .filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [studentsResponse.results]);

  const progressAverage = useMemo(() => {
    const values = studentsResponse.results
      .map((student) => student.progressPercentage)
      .filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [studentsResponse.results]);

  const refreshStudents = () => setRefreshToken((value) => value + 1);

  const handleOpenStudent = async (studentId: string) => {
    if (!institutionId) return;
    setSelectedStudentId(studentId);
    setDetailLoading(true);
    try {
      const student = await cfApi.getStudent(institutionId, studentId);
      setSelectedStudent(student);
    } catch (loadError) {
      setNotice({
        type: 'error',
        message: loadError instanceof Error ? loadError.message : 'Failed to load student profile',
      });
      setSelectedStudent(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseStudent = () => {
    setSelectedStudentId(null);
    setSelectedStudent(null);
    setDetailLoading(false);
  };

  const handleStudentStatus = async (
    student: StudentSummary,
    nextStatus: 'approved' | 'rejected' | 'suspended',
    reason?: string,
  ) => {
    if (!institutionId || !canManageLifecycle) return;

    setActionLoading(`${student.userId}:${nextStatus}`);
    try {
      if ((nextStatus === 'approved' || nextStatus === 'rejected') && student.applicationId) {
        if (nextStatus === 'approved') {
          await cfApi.approveApplication(institutionId, student.applicationId);
        } else {
          await cfApi.rejectApplication(institutionId, student.applicationId);
        }
      } else {
        await cfApi.updateStudentStatus(institutionId, student.userId, {
          status: nextStatus,
          reason,
        });
      }

      if (selectedStudentId === student.userId) {
        await handleOpenStudent(student.userId);
      }
      refreshStudents();
      setNotice({
        type: 'success',
        message:
          nextStatus === 'approved'
            ? 'Student access approved.'
            : nextStatus === 'rejected'
              ? 'Student application rejected.'
              : 'Student access suspended.',
      });
    } catch (statusError) {
      setNotice({
        type: 'error',
        message: statusError instanceof Error ? statusError.message : 'Failed to update student status',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateStudent = async (student: StudentSummary) => {
    if (!institutionId || !canManageLifecycle) return;
    setActionLoading(`${student.userId}:approved`);
    try {
      await cfApi.updateStudentStatus(institutionId, student.userId, { status: 'approved' });
      if (selectedStudentId === student.userId) {
        await handleOpenStudent(student.userId);
      }
      refreshStudents();
      setNotice({ type: 'success', message: 'Student account activated.' });
    } catch (statusError) {
      setNotice({
        type: 'error',
        message: statusError instanceof Error ? statusError.message : 'Failed to activate student',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendPrompt = async (student: StudentSummary) => {
    const reason = window.prompt('Suspension reason', student.notes || 'Administrative suspension');
    if (reason === null) return;
    await handleStudentStatus(student, 'suspended', reason);
  };

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!institutionId || !canManageLifecycle) return;

    setSubmitting(true);
    try {
      await cfApi.createStudent(institutionId, {
        ...formState,
      });
      setNotice({ type: 'success', message: 'Student account created successfully.' });
      setFormState(INITIAL_FORM_STATE);
      setPage(1);
      refreshStudents();
    } catch (submitError) {
      setNotice({
        type: 'error',
        message: submitError instanceof Error ? submitError.message : 'Failed to create student',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const exportStudents = async (format: 'csv' | 'excel') => {
    if (!institutionId) return;

    try {
      const response = await cfApi.listStudents(institutionId, {
        q: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        courseId: courseFilter === 'all' ? undefined : courseFilter,
        pagination: { limit: 500, offset: 0 },
      });

      const rows = response.results.map((student) => ({
        name: student.fullName,
        email: student.email,
        studentId: student.studentNumber || 'Pending ID',
        status: student.status,
        enrollmentDate: formatDate(student.approvedAt || student.applicationSubmittedAt),
        subjects: (student.subjectNames || []).join(' | '),
        attendance: `${clampPercentage(student.attendancePercentage)}%`,
        progress: `${clampPercentage(student.progressPercentage)}%`,
        performance: `${clampPercentage(student.assessmentAverage)}%`,
      }));

      if (format === 'csv') {
        const csv = [
          ['Name', 'Email', 'Student ID', 'Status', 'Enrollment Date', 'Subjects', 'Attendance %', 'Progress %', 'Performance %'].join(','),
          ...rows.map((row) =>
            [
              escapeCsvValue(row.name),
              escapeCsvValue(row.email),
              escapeCsvValue(row.studentId),
              escapeCsvValue(row.status),
              escapeCsvValue(row.enrollmentDate),
              escapeCsvValue(row.subjects),
              escapeCsvValue(row.attendance),
              escapeCsvValue(row.progress),
              escapeCsvValue(row.performance),
            ].join(','),
          ),
        ].join('\n');

        triggerDownload(csv, 'students-export.csv', 'text/csv;charset=utf-8;');
      } else {
        const workbook = [
          ['Name', 'Email', 'Student ID', 'Status', 'Enrollment Date', 'Subjects', 'Attendance %', 'Progress %', 'Performance %'].join('\t'),
          ...rows.map((row) =>
            [
              row.name,
              row.email,
              row.studentId,
              row.status,
              row.enrollmentDate,
              row.subjects,
              row.attendance,
              row.progress,
              row.performance,
            ].join('\t'),
          ),
        ].join('\n');

        triggerDownload(workbook, 'students-export.xls', 'application/vnd.ms-excel;charset=utf-8;');
      }

      setNotice({ type: 'success', message: `Student export generated as ${format.toUpperCase()}.` });
    } catch (exportError) {
      setNotice({
        type: 'error',
        message: exportError instanceof Error ? exportError.message : 'Failed to export students',
      });
    }
  };

  const renderFilters = () => (
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or student ID"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-700 outline-none transition focus:border-black"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
          <Shield className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full bg-transparent outline-none"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
          <BookOpen className="h-4 w-4 text-gray-400" />
          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            className="w-full bg-transparent outline-none"
          >
            <option value="all">All subjects</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );

  const renderStudentTable = (
    rows: StudentSummary[],
    columns: 'all' | 'progress' | 'attendance' | 'performance' | 'suspend' | 'enrollment',
  ) => (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-widest text-gray-400">
              <th className="px-5 py-4">Student</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Registered</th>
              <th className="px-5 py-4">IP Address</th>
              <th className="px-5 py-4">Subjects</th>
              {columns === 'progress' && <th className="px-5 py-4">Progress</th>}
              {columns === 'attendance' && <th className="px-5 py-4">Attendance</th>}
              {columns === 'performance' && <th className="px-5 py-4">Performance</th>}
              {columns === 'suspend' && <th className="px-5 py-4">Access</th>}
              {columns === 'enrollment' && <th className="px-5 py-4">Decision</th>}
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns === 'all' ? 6 : 7} className="px-5 py-12 text-center">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-gray-300" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns === 'all' ? 6 : 7} className="px-5 py-12 text-center text-sm text-gray-500">
                  No students match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((student) => (
                <tr key={student.userId} className="hover:bg-gray-50/70">
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleOpenStudent(student.userId)}
                      className="flex items-center gap-3 text-left"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 font-bold text-gray-700">
                        {student.fullName?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{student.fullName}</div>
                        <div className="text-xs uppercase tracking-widest text-gray-400">{student.email}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusClasses(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {formatDate(student.applicationSubmittedAt)}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {student.registrationIp || 'Not captured'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {(student.subjectNames || []).length > 0 ? (student.subjectNames || []).join(', ') : 'No subjects yet'}
                  </td>
                  {columns === 'progress' && (
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                      {clampPercentage(student.progressPercentage)}%
                    </td>
                  )}
                  {columns === 'attendance' && (
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                      {clampPercentage(student.attendancePercentage)}%
                    </td>
                  )}
                  {columns === 'performance' && (
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                      {clampPercentage(student.assessmentAverage)}%
                    </td>
                  )}
                  {columns === 'suspend' && (
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                      {student.status === 'suspended' ? 'Suspended' : 'Active / Reviewable'}
                    </td>
                  )}
                  {columns === 'enrollment' && (
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                      {student.status === 'pending'
                        ? 'Awaiting decision'
                        : student.status === 'approved'
                          ? `Approved ${student.approvedAt ? formatDate(student.approvedAt) : ''}`
                          : student.status === 'rejected'
                            ? `Rejected ${student.rejectedAt ? formatDate(student.rejectedAt) : ''}`
                            : 'Suspended'}
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenStudent(student.userId)}
                        className="px-3 py-2 text-xs"
                      >
                        <Eye className="h-4 w-4" /> View
                      </Button>
                      {canManageLifecycle && student.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => void handleStudentStatus(student, 'approved')}
                            className="px-3 py-2 text-xs"
                            disabled={actionLoading === `${student.userId}:approved`}
                          >
                            {actionLoading === `${student.userId}:approved` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void handleStudentStatus(student, 'rejected')}
                            className="px-3 py-2 text-xs"
                            disabled={actionLoading === `${student.userId}:rejected`}
                          >
                            {actionLoading === `${student.userId}:rejected` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            Reject
                          </Button>
                        </>
                      )}
                      {canManageLifecycle && student.status === 'approved' && (
                        <Button
                          variant="outline"
                          onClick={() => void handleSuspendPrompt(student)}
                          className="px-3 py-2 text-xs"
                          disabled={actionLoading === `${student.userId}:suspended`}
                        >
                          {actionLoading === `${student.userId}:suspended` ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                          Suspend
                        </Button>
                      )}
                      {canManageLifecycle && (student.status === 'suspended' || student.status === 'rejected') && (
                        <Button
                          onClick={() => void handleActivateStudent(student)}
                          className="px-3 py-2 text-xs"
                          disabled={actionLoading === `${student.userId}:approved`}
                        >
                          {actionLoading === `${student.userId}:approved` ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                          Activate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPagination = () => (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
      <p>
        {studentsResponse.total === 0
          ? 'Showing 0 of 0 students'
          : `Showing ${(studentsResponse.offset || 0) + 1} to ${Math.min(
              (studentsResponse.offset || 0) + studentsResponse.results.length,
              studentsResponse.total,
            )} of ${studentsResponse.total} students`}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
          Previous
        </Button>
        <span className="px-2 font-semibold text-gray-700">
          Page {page} / {totalPages}
        </span>
        <Button variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>
          Next
        </Button>
      </div>
    </div>
  );

  const renderOverviewCards = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {topCards.map((item) => (
        <Card key={item.label} className="rounded-3xl border-gray-200">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{item.label}</p>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-3xl font-black text-gray-900">{item.value}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>{item.label}</span>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderAllStudents = () => (
    <div className="space-y-6">
      {renderOverviewCards()}
      {renderFilters()}
      {renderStudentTable(studentsResponse.results, 'all')}
      {renderPagination()}
    </div>
  );

  const renderAddStudent = () => {
    if (!canManageLifecycle) {
      return (
        <EmptyState
          title="Restricted Action"
          body="Only institution owners and admins can manually create student accounts."
        />
      );
    }

    return (
      <Card className="rounded-3xl">
        <form onSubmit={handleAddStudent} className="grid gap-5 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-gray-700">
            <span>Full name</span>
            <input
              value={formState.fullName}
              onChange={(event) => setFormState((current) => ({ ...current, fullName: event.target.value }))}
              required
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700">
            <span>Email</span>
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
              required
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700">
            <span>Phone number</span>
            <input
              value={formState.phone}
              onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700">
            <span>Temporary password</span>
            <input
              type="password"
              value={formState.temporaryPassword}
              onChange={(event) =>
                setFormState((current) => ({ ...current, temporaryPassword: event.target.value }))
              }
              required
              minLength={6}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700">
            <span>Parent / guardian name</span>
            <input
              value={formState.parentGuardianName}
              onChange={(event) =>
                setFormState((current) => ({ ...current, parentGuardianName: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700">
            <span>Parent / guardian email</span>
            <input
              type="email"
              value={formState.parentGuardianEmail}
              onChange={(event) =>
                setFormState((current) => ({ ...current, parentGuardianEmail: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700">
            <span>Parent / guardian phone</span>
            <input
              value={formState.parentGuardianPhone}
              onChange={(event) =>
                setFormState((current) => ({ ...current, parentGuardianPhone: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700">
            <span>Initial status</span>
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  status: event.target.value as AddStudentFormState['status'],
                }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved / Enrolled</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-gray-700 lg:col-span-2">
            <span>Notes</span>
            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
              rows={5}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
            />
          </label>
          <div className="lg:col-span-2 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-4">
            <p className="text-sm text-gray-500">
              Student ID is generated automatically, and subjects can be assigned later from course enrollment.
            </p>
            <Button type="submit" className="min-w-40" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create student
            </Button>
          </div>
        </form>
      </Card>
    );
  };

  const renderProfiles = () => (
    <div className="space-y-6">
      {renderFilters()}
      {studentsResponse.results.length === 0 && !loading ? (
        <EmptyState
          title="No Student Profiles"
          body="Profiles appear here as soon as students apply or are added manually."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {studentsResponse.results.map((student) => (
            <Card key={student.userId} className="rounded-3xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{student.fullName}</h3>
                  <p className="mt-1 text-sm text-gray-500">{student.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-gray-400">
                    {student.studentNumber || 'Pending student ID'}
                  </p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusClasses(student.status)}`}>
                  {student.status}
                </span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Guardian</p>
                  <p className="mt-2 font-medium text-gray-900">{student.parentGuardianName || 'Not provided'}</p>
                  <p className="mt-1">{student.parentGuardianPhone || student.parentGuardianEmail || 'No contact info'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recent access</p>
                  <p className="mt-2 font-medium text-gray-900">{formatDate(student.lastLoginAt)}</p>
                  <p className="mt-1">{student.registrationIp || 'IP not captured'}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-gray-100 p-4 text-sm text-gray-600">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Notes</p>
                <p className="mt-2">{student.notes || 'No notes yet.'}</p>
              </div>
              <div className="mt-5 flex justify-end">
                <Button variant="outline" onClick={() => handleOpenStudent(student.userId)}>
                  <Eye className="h-4 w-4" /> Open profile
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {renderPagination()}
    </div>
  );

  const renderMetricCards = () => (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Average Progress</p>
            <p className="mt-3 text-3xl font-black text-gray-900">{progressAverage}%</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
      </Card>
      <Card className="rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Average Attendance</p>
            <p className="mt-3 text-3xl font-black text-gray-900">{attendanceAverage}%</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <CalendarCheck className="h-5 w-5" />
          </div>
        </div>
      </Card>
      <Card className="rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Average Performance</p>
            <p className="mt-3 text-3xl font-black text-gray-900">{performanceAverage}%</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderEnrollmentDashboard = () => (
    <div className="space-y-6">
      {renderOverviewCards()}
      {renderFilters()}
      {renderStudentTable(studentsResponse.results, 'enrollment')}
      {renderPagination()}
    </div>
  );

  const renderSuspendActivate = () => {
    if (!canManageLifecycle) {
      return (
        <EmptyState
          title="Restricted Action"
          body="Only institution owners and admins can change student access status."
        />
      );
    }

    return (
      <div className="space-y-6">
        {renderFilters()}
        {renderStudentTable(studentsResponse.results, 'suspend')}
        {renderPagination()}
      </div>
    );
  };

  const renderExport = () => (
    <div className="space-y-6">
      {renderFilters()}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl">
          <p className="text-lg font-bold text-gray-900">CSV Export</p>
          <p className="mt-2 text-sm text-gray-500">
            Best for spreadsheets, imports, and bulk review in Google Sheets or Excel.
          </p>
          <div className="mt-5">
            <Button onClick={() => void exportStudents('csv')}>
              <FileText className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </Card>
        <Card className="rounded-3xl">
          <p className="text-lg font-bold text-gray-900">Excel-Friendly Export</p>
          <p className="mt-2 text-sm text-gray-500">
            Downloads a spreadsheet-compatible file with the same student summary fields.
          </p>
          <div className="mt-5">
            <Button onClick={() => void exportStudents('excel')}>
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
          </div>
        </Card>
      </div>
      {renderStudentTable(studentsResponse.results, 'all')}
      {renderPagination()}
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'students/add') return renderAddStudent();
    if (activeTab === 'students/profiles') return renderProfiles();
    if (activeTab === 'students/progress') {
      return (
        <div className="space-y-6">
          {renderMetricCards()}
          {renderFilters()}
          {renderStudentTable(studentsResponse.results, 'progress')}
          {renderPagination()}
        </div>
      );
    }
    if (activeTab === 'students/enrollment') return renderEnrollmentDashboard();
    if (activeTab === 'students/attendance') {
      return (
        <div className="space-y-6">
          {renderMetricCards()}
          {renderFilters()}
          {renderStudentTable(studentsResponse.results, 'attendance')}
          {renderPagination()}
        </div>
      );
    }
    if (activeTab === 'students/performance') {
      return (
        <div className="space-y-6">
          {renderMetricCards()}
          {renderFilters()}
          {renderStudentTable(studentsResponse.results, 'performance')}
          {renderPagination()}
        </div>
      );
    }
    if (activeTab === 'students/suspend') return renderSuspendActivate();
    if (activeTab === 'students/export') return renderExport();
    return renderAllStudents();
  };

  if (!canSeeStudentArea) {
    return (
      <div className="mx-auto max-w-6xl p-6 md:p-8">
        <EmptyState
          title="Students Area Unavailable"
          body="Your current role does not have access to student management."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed right-6 top-6 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${
              notice.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notice.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">{viewCopy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">{viewCopy.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{studentsResponse.total}</span> students in current view
          </div>
          <Button variant="outline" onClick={refreshStudents}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="rounded-3xl border-red-200 bg-red-50 text-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <p className="font-semibold">{error}</p>
          </div>
        </Card>
      )}

      {renderContent()}

      <AnimatePresence>
        {selectedStudentId && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-sm">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={handleCloseStudent}
            />
            <motion.div
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Student Profile</p>
                  <h2 className="mt-2 text-2xl font-black text-gray-900">
                    {selectedStudent?.fullName || 'Loading student'}
                  </h2>
                  {selectedStudent && (
                    <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusClasses(selectedStudent.status)}`}>
                      {selectedStudent.status}
                    </span>
                  )}
                </div>
                <Button variant="ghost" onClick={handleCloseStudent}>
                  Close
                </Button>
              </div>

              {detailLoading || !selectedStudent ? (
                <div className="py-16 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-300" />
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Personal Info</p>
                      <div className="mt-4 space-y-3 text-sm text-gray-600">
                        <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {selectedStudent.email}</p>
                        <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {selectedStudent.phone || 'No phone provided'}</p>
                        <p className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /> {selectedStudent.studentNumber || 'Student ID pending'}</p>
                        <p className="flex items-center gap-2"><Shield className="h-4 w-4 text-gray-400" /> IP: {selectedStudent.registrationIp || 'Not captured'}</p>
                      </div>
                    </Card>
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Lifecycle</p>
                      <div className="mt-4 space-y-3 text-sm text-gray-600">
                        <p>Applied: {formatDate(selectedStudent.applicationSubmittedAt)}</p>
                        <p>Approved: {formatDate(selectedStudent.approvedAt)}</p>
                        <p>Rejected: {formatDate(selectedStudent.rejectedAt)}</p>
                        <p>Last login: {formatDate(selectedStudent.lastLoginAt)}</p>
                      </div>
                    </Card>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Progress</p>
                      <p className="mt-3 text-3xl font-black text-gray-900">{summaryValue(selectedStudent, 'progress')}%</p>
                      <p className="mt-2 text-sm text-gray-500">
                        {selectedStudent.completedLessons || 0} completed of {selectedStudent.totalLessons || 0} lessons
                      </p>
                    </Card>
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Attendance</p>
                      <p className="mt-3 text-3xl font-black text-gray-900">{summaryValue(selectedStudent, 'attendance')}%</p>
                      <p className="mt-2 text-sm text-gray-500">
                        {selectedStudent.attendancePresent || 0} present, {selectedStudent.attendanceAbsent || 0} absent, {selectedStudent.attendanceLate || 0} late
                      </p>
                    </Card>
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Performance</p>
                      <p className="mt-3 text-3xl font-black text-gray-900">{summaryValue(selectedStudent, 'performance')}%</p>
                      <p className="mt-2 text-sm text-gray-500">
                        Quiz {clampPercentage(selectedStudent.averageQuizScore)}% • Assignments {clampPercentage(selectedStudent.averageAssignmentGrade)}%
                      </p>
                    </Card>
                  </div>

                  <Card className="rounded-3xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Subjects & Enrollment History</p>
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-gray-600">
                        {(selectedStudent.subjectNames || []).length > 0
                          ? (selectedStudent.subjectNames || []).join(', ')
                          : 'No registered subjects yet.'}
                      </p>
                      <div className="space-y-2 text-sm text-gray-500">
                        {(selectedStudent.enrollmentHistory || []).length === 0 ? (
                          <p>No course enrollments recorded yet.</p>
                        ) : (
                          (selectedStudent.enrollmentHistory || []).map((enrollment) => (
                            <div key={enrollment.id} className="rounded-2xl border border-gray-100 px-4 py-3">
                              <div className="font-semibold text-gray-900">{enrollment.courseName || enrollment.course_name}</div>
                              <div className="mt-1 text-xs uppercase tracking-widest text-gray-400">
                                {enrollment.status} • {formatDate(enrollment.enrolledAt || enrollment.enrolled_at)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-3xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Guardian & Notes</p>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p>Guardian: {selectedStudent.parentGuardianName || 'Not provided'}</p>
                      <p>Email: {selectedStudent.parentGuardianEmail || 'Not provided'}</p>
                      <p>Phone: {selectedStudent.parentGuardianPhone || 'Not provided'}</p>
                      <p className="pt-2 text-gray-700">{selectedStudent.notes || 'No notes recorded.'}</p>
                    </div>
                  </Card>

                  <Card className="rounded-3xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Activity Log</p>
                    <div className="mt-4 space-y-3">
                      {(selectedStudent.recentActivity || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No recent activity yet.</p>
                      ) : (
                        (selectedStudent.recentActivity || []).map((activity) => (
                          <div key={activity.id} className="rounded-2xl border border-gray-100 px-4 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-semibold text-gray-900">{activity.title}</p>
                                <p className="mt-1 text-sm text-gray-500">{activity.description || 'No extra details.'}</p>
                              </div>
                              <p className="text-xs uppercase tracking-widest text-gray-400">
                                {formatDate(activity.createdAt || activity.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  {canManageLifecycle && (
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Admin Actions</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {selectedStudent.status === 'pending' && (
                          <>
                            <Button onClick={() => void handleStudentStatus(selectedStudent, 'approved')}>
                              <CheckCircle2 className="h-4 w-4" /> Approve enrollment
                            </Button>
                            <Button variant="outline" onClick={() => void handleStudentStatus(selectedStudent, 'rejected')}>
                              <XCircle className="h-4 w-4" /> Reject application
                            </Button>
                          </>
                        )}
                        {selectedStudent.status === 'approved' && (
                          <Button variant="outline" onClick={() => void handleSuspendPrompt(selectedStudent)}>
                            <PauseCircle className="h-4 w-4" /> Suspend student
                          </Button>
                        )}
                        {(selectedStudent.status === 'rejected' || selectedStudent.status === 'suspended') && (
                          <Button onClick={() => void handleActivateStudent(selectedStudent)}>
                            <PlayCircle className="h-4 w-4" /> Activate student
                          </Button>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
