import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Loader2,
  Mail,
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
import type {
  Course,
  InvitationDeliveryPreview,
  PaginatedResult,
  TeacherAttendanceRecord,
  TeacherSummary,
} from '../types';
import * as cfApi from '../services/cfApi';

interface TeacherManagementProps {
  activeTab: string;
}

interface TeacherStatusTotals {
  pending: number;
  approved: number;
  suspended: number;
}

interface AddTeacherFormState {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  qualification: string;
  employeeNumber: string;
  profileImageUrl: string;
  notes: string;
  status: 'pending' | 'approved' | 'suspended';
  courseIds: string[];
}

interface TeacherPerformanceResponse {
  averageStudentScore?: number | null;
  averageQuizScore?: number | null;
  averageAssignmentGrade?: number | null;
  attendancePercentage?: number | null;
  assignedStudentsCount?: number | null;
  assignedCoursesCount?: number | null;
  courseCompletionRate?: number | null;
}

const PAGE_SIZE = 10;

const EMPTY_PAGINATED_RESULT: PaginatedResult<TeacherSummary> = {
  results: [],
  total: 0,
  limit: PAGE_SIZE,
  offset: 0,
};

const TAB_COPY: Record<string, { title: string; description: string }> = {
  'teachers/all': {
    title: 'All Teachers',
    description:
      'See every teacher with approval state, assigned courses, attendance signal, and performance summary.',
  },
  'teachers/add': {
    title: 'Add Teacher',
    description:
      'Create teacher accounts from the admin dashboard, assign courses if needed, and capture the invite preview for testing.',
  },
  'teachers/profiles': {
    title: 'Teacher Profiles',
    description:
      'Review personal information, invitation state, school assignment, and recent faculty activity from one place.',
  },
  'teachers/assign': {
    title: 'Assign Courses',
    description:
      'Use a checkbox assignment panel to give teachers their subject load now and adjust it later without recreating accounts.',
  },
  'teachers/performance': {
    title: 'Teacher Performance',
    description:
      'Track student outcomes, attendance consistency, assigned workload, and completion progress using connected data only.',
  },
  'teachers/approval': {
    title: 'Teacher Approval',
    description:
      'Approve pending teachers, suspend access, or reactivate faculty accounts while keeping the audit trail intact.',
  },
  'teachers/attendance': {
    title: 'Teacher Attendance',
    description:
      'Mark attendance, review monthly history, and monitor present, absent, and late patterns by teacher.',
  },
};

const INITIAL_FORM_STATE: AddTeacherFormState = {
  fullName: '',
  email: '',
  phone: '',
  gender: '',
  address: '',
  qualification: '',
  employeeNumber: '',
  profileImageUrl: '',
  notes: '',
  status: 'pending',
  courseIds: [],
};

function formatDate(value?: string | number | Date | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString();
}

function formatMonthValue(value: Date = new Date()) {
  return value.toISOString().slice(0, 7);
}

function clampPercentage(value?: number | null) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function approvalStatusClasses(status: TeacherSummary['approvalStatus']) {
  switch (status) {
    case 'approved':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'suspended':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'pending':
    default:
      return 'border-blue-200 bg-blue-50 text-blue-700';
  }
}

function activeStatusClasses(status?: string) {
  return status === 'active'
    ? 'border-green-200 bg-green-50 text-green-700'
    : 'border-gray-200 bg-gray-50 text-gray-600';
}

function attendanceStatusClasses(status?: string | null) {
  if (status === 'present') return 'border-green-200 bg-green-50 text-green-700';
  if (status === 'late') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'absent') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-gray-500';
}

function averageNullable(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-dashed py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{body}</p>
    </Card>
  );
}

export function TeacherManagement({ activeTab }: TeacherManagementProps) {
  const { institutionId, institution, isOwner, isAdmin } = useAuth();
  const canManageTeachers = Boolean(isOwner || isAdmin);
  const viewCopy = TAB_COPY[activeTab] || TAB_COPY['teachers/all'];

  const [teachersResponse, setTeachersResponse] =
    useState<PaginatedResult<TeacherSummary>>(EMPTY_PAGINATED_RESULT);
  const [statusTotals, setStatusTotals] = useState<TeacherStatusTotals>({
    pending: 0,
    approved: 0,
    suspended: 0,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [courseDraftIds, setCourseDraftIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [formState, setFormState] = useState<AddTeacherFormState>(INITIAL_FORM_STATE);
  const [attendanceTeacherId, setAttendanceTeacherId] = useState<string | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState(formatMonthValue());
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'late'>('present');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [performanceMetrics, setPerformanceMetrics] = useState<TeacherPerformanceResponse | null>(null);
  const [lastInvitationPreview, setLastInvitationPreview] = useState<{
    teacherId: string;
    preview: InvitationDeliveryPreview;
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil((teachersResponse.total || 0) / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm, statusFilter]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!institutionId || !canManageTeachers) return;
    let cancelled = false;

    const loadCourses = async () => {
      try {
        const courseList = await cfApi.listCourses(institutionId);
        if (!cancelled) setCourses(courseList);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load course options');
        }
      }
    };

    void loadCourses();

    return () => {
      cancelled = true;
    };
  }, [institutionId, canManageTeachers]);

  useEffect(() => {
    if (!institutionId || !canManageTeachers) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    const queryStatus = statusFilter === 'all' ? undefined : statusFilter;

    const loadTeachers = async () => {
      try {
        const [pageResponse, pendingResponse, approvedResponse, suspendedResponse] = await Promise.all([
          cfApi.listTeachers(institutionId, {
            q: searchTerm || undefined,
            status: queryStatus,
            pagination: { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
          }),
          cfApi.listTeachers(institutionId, {
            q: searchTerm || undefined,
            status: 'pending',
            pagination: { limit: 1, offset: 0 },
          }),
          cfApi.listTeachers(institutionId, {
            q: searchTerm || undefined,
            status: 'approved',
            pagination: { limit: 1, offset: 0 },
          }),
          cfApi.listTeachers(institutionId, {
            q: searchTerm || undefined,
            status: 'suspended',
            pagination: { limit: 1, offset: 0 },
          }),
        ]);

        if (cancelled) return;

        setTeachersResponse(pageResponse);
        setStatusTotals({
          pending: pendingResponse.total,
          approved: approvedResponse.total,
          suspended: suspendedResponse.total,
        });
      } catch (loadError) {
        if (!cancelled) {
          setTeachersResponse(EMPTY_PAGINATED_RESULT);
          setError(loadError instanceof Error ? loadError.message : 'Failed to load teachers');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTeachers();

    return () => {
      cancelled = true;
    };
  }, [institutionId, canManageTeachers, page, searchTerm, statusFilter, refreshToken]);

  useEffect(() => {
    if (!selectedTeacher) return;
    const assigned = selectedTeacher.assignedCourseIds || selectedTeacher.assigned_course_ids || [];
    setCourseDraftIds(assigned);
  }, [selectedTeacher]);

  useEffect(() => {
    if (teachersResponse.results.length === 0) {
      setAttendanceTeacherId(null);
      return;
    }

    if (!attendanceTeacherId) {
      setAttendanceTeacherId(teachersResponse.results[0].userId);
      return;
    }

    const stillVisible = teachersResponse.results.some((teacher) => teacher.userId === attendanceTeacherId);
    if (!stillVisible && activeTab === 'teachers/attendance') {
      setAttendanceTeacherId(teachersResponse.results[0].userId);
    }
  }, [teachersResponse.results, attendanceTeacherId, activeTab]);

  useEffect(() => {
    if (!institutionId || !attendanceTeacherId || activeTab !== 'teachers/attendance') return;
    let cancelled = false;

    const loadAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const [records, metrics] = await Promise.all([
          cfApi.listTeacherAttendance(institutionId, attendanceTeacherId, attendanceMonth),
          cfApi.getTeacherPerformance(institutionId, attendanceTeacherId),
        ]);
        if (cancelled) return;
        setAttendanceRecords(records);
        setPerformanceMetrics(metrics);
      } catch (loadError) {
        if (!cancelled) {
          setNotice({
            type: 'error',
            message: loadError instanceof Error ? loadError.message : 'Failed to load teacher attendance',
          });
          setAttendanceRecords([]);
          setPerformanceMetrics(null);
        }
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    };

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [institutionId, attendanceTeacherId, attendanceMonth, activeTab, refreshToken]);

  const averageAttendance = useMemo(
    () => averageNullable(teachersResponse.results.map((teacher) => teacher.attendancePercentage)),
    [teachersResponse.results],
  );
  const averagePerformance = useMemo(
    () => averageNullable(teachersResponse.results.map((teacher) => teacher.averageStudentScore)),
    [teachersResponse.results],
  );
  const totalAssignedCourses = useMemo(
    () =>
      teachersResponse.results.reduce(
        (sum, teacher) => sum + Number(teacher.assignedCoursesCount || teacher.assigned_courses_count || 0),
        0,
      ),
    [teachersResponse.results],
  );
  const attendanceBreakdown = useMemo(() => {
    const present = attendanceRecords.filter((record) => record.status === 'present').length;
    const absent = attendanceRecords.filter((record) => record.status === 'absent').length;
    const late = attendanceRecords.filter((record) => record.status === 'late').length;
    const percentage = attendanceRecords.length ? Math.round((present / attendanceRecords.length) * 100) : 0;
    return { present, absent, late, percentage };
  }, [attendanceRecords]);

  const refreshTeachers = () => setRefreshToken((value) => value + 1);

  const selectedTeacherPreview =
    selectedTeacher?.invitationPreview ||
    selectedTeacher?.invitation_preview ||
    (selectedTeacher && lastInvitationPreview?.teacherId === selectedTeacher.userId
      ? lastInvitationPreview.preview
      : null);

  const visibleAttendanceTeacher =
    teachersResponse.results.find((teacher) => teacher.userId === attendanceTeacherId) || null;

  const handleOpenTeacher = async (teacherId: string) => {
    if (!institutionId) return;
    setSelectedTeacherId(teacherId);
    setDetailLoading(true);
    try {
      const teacher = await cfApi.getTeacher(institutionId, teacherId);
      setSelectedTeacher(teacher);
    } catch (loadError) {
      setNotice({
        type: 'error',
        message: loadError instanceof Error ? loadError.message : 'Failed to load teacher profile',
      });
      setSelectedTeacher(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseTeacher = () => {
    setSelectedTeacherId(null);
    setSelectedTeacher(null);
    setDetailLoading(false);
  };

  const handleToggleCourseSelection = (courseId: string) => {
    setCourseDraftIds((current) =>
      current.includes(courseId) ? current.filter((value) => value !== courseId) : [...current, courseId],
    );
  };

  const handleToggleFormCourse = (courseId: string) => {
    setFormState((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((value) => value !== courseId)
        : [...current.courseIds, courseId],
    }));
  };

  const handleCreateTeacher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!institutionId || !canManageTeachers) return;

    setSubmitting(true);
    try {
      const created = await cfApi.createTeacher(institutionId, {
        fullName: formState.fullName,
        email: formState.email,
        phone: formState.phone || undefined,
        gender: formState.gender || undefined,
        address: formState.address || undefined,
        qualification: formState.qualification || undefined,
        courseIds: formState.courseIds,
        employeeNumber: formState.employeeNumber || undefined,
        profileImageUrl: formState.profileImageUrl || undefined,
        status: formState.status,
        notes: formState.notes || undefined,
      });

      const preview = created.invitationPreview || created.invitation_preview || null;
      if (preview) {
        setLastInvitationPreview({ teacherId: created.userId, preview });
      }

      setNotice({ type: 'success', message: 'Teacher account created successfully.' });
      setFormState(INITIAL_FORM_STATE);
      setPage(1);
      setSelectedTeacherId(created.userId);
      setSelectedTeacher(created);
      setCourseDraftIds(created.assignedCourseIds || created.assigned_course_ids || []);
      refreshTeachers();
    } catch (submitError) {
      setNotice({
        type: 'error',
        message: submitError instanceof Error ? submitError.message : 'Failed to create teacher',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeacherStatus = async (
    teacher: TeacherSummary,
    nextStatus: 'pending' | 'approved' | 'suspended',
  ) => {
    if (!institutionId || !canManageTeachers) return;

    setActionLoading(`${teacher.userId}:${nextStatus}`);
    try {
      const updated = await cfApi.updateTeacher(institutionId, teacher.userId, { status: nextStatus });
      if (selectedTeacherId === teacher.userId) {
        setSelectedTeacher(updated);
      }
      refreshTeachers();
      setNotice({
        type: 'success',
        message:
          nextStatus === 'approved'
            ? 'Teacher approved successfully.'
            : nextStatus === 'suspended'
              ? 'Teacher suspended successfully.'
              : 'Teacher moved back to pending review.',
      });
    } catch (statusError) {
      setNotice({
        type: 'error',
        message: statusError instanceof Error ? statusError.message : 'Failed to update teacher status',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveAssignments = async () => {
    if (!institutionId || !selectedTeacher || !canManageTeachers) return;

    setActionLoading(`${selectedTeacher.userId}:courses`);
    try {
      const updated = await cfApi.assignTeacherCourses(institutionId, selectedTeacher.userId, courseDraftIds);
      setSelectedTeacher(updated);
      refreshTeachers();
      setNotice({ type: 'success', message: 'Teacher course assignments updated.' });
    } catch (assignError) {
      setNotice({
        type: 'error',
        message: assignError instanceof Error ? assignError.message : 'Failed to update course assignments',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAttendance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!institutionId || !attendanceTeacherId || !canManageTeachers) return;

    setActionLoading(`${attendanceTeacherId}:attendance`);
    try {
      await cfApi.markTeacherAttendance(institutionId, attendanceTeacherId, {
        attendanceDate,
        status: attendanceStatus,
        notes: attendanceNotes || undefined,
      });
      setAttendanceNotes('');
      refreshTeachers();
      setNotice({ type: 'success', message: 'Teacher attendance recorded.' });
    } catch (attendanceError) {
      setNotice({
        type: 'error',
        message: attendanceError instanceof Error ? attendanceError.message : 'Failed to record attendance',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const renderPagination = () => {
    if (teachersResponse.total <= PAGE_SIZE) return null;

    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-gray-500">
          Showing <span className="font-semibold text-gray-900">{teachersResponse.offset + 1}</span> to{' '}
          <span className="font-semibold text-gray-900">
            {Math.min(teachersResponse.offset + teachersResponse.limit, teachersResponse.total)}
          </span>{' '}
          of <span className="font-semibold text-gray-900">{teachersResponse.total}</span> teachers
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <div className="rounded-2xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  const renderOverviewCards = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Faculty Members</p>
            <p className="mt-3 text-3xl font-black text-gray-900">{teachersResponse.total}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </Card>
      <Card className="rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pending Approval</p>
            <p className="mt-3 text-3xl font-black text-gray-900">{statusTotals.pending}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <Shield className="h-5 w-5" />
          </div>
        </div>
      </Card>
      <Card className="rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Average Attendance</p>
            <p className="mt-3 text-3xl font-black text-gray-900">{averageAttendance}%</p>
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
            <p className="mt-3 text-3xl font-black text-gray-900">{averagePerformance}%</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderFilters = () => (
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by teacher name, email, qualification, or subject"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-700 outline-none transition focus:border-black"
        />
      </div>
      <label className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600 md:w-72">
        <Shield className="h-4 w-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full bg-transparent font-medium outline-none"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </label>
    </div>
  );

  const renderRowActions = (teacher: TeacherSummary) => (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={() => void handleOpenTeacher(teacher.userId)}
        className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        View profile
      </button>
      {teacher.approvalStatus === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => void handleTeacherStatus(teacher, 'approved')}
            disabled={actionLoading === `${teacher.userId}:approved`}
            className="rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => void handleTeacherStatus(teacher, 'suspended')}
            disabled={actionLoading === `${teacher.userId}:suspended`}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
          >
            Suspend
          </button>
        </>
      )}
      {teacher.approvalStatus === 'approved' && (
        <button
          type="button"
          onClick={() => void handleTeacherStatus(teacher, 'suspended')}
          disabled={actionLoading === `${teacher.userId}:suspended`}
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
        >
          Suspend
        </button>
      )}
      {teacher.approvalStatus === 'suspended' && (
        <button
          type="button"
          onClick={() => void handleTeacherStatus(teacher, 'approved')}
          disabled={actionLoading === `${teacher.userId}:approved`}
          className="rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          Reactivate
        </button>
      )}
    </div>
  );

  const renderTeacherTable = () => (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Teacher</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Assigned Courses</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Attendance</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Approval</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Performance</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Active</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-300" />
                </td>
              </tr>
            ) : teachersResponse.results.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-sm font-medium text-gray-500">
                  No teacher records match this view yet.
                </td>
              </tr>
            ) : (
              teachersResponse.results.map((teacher) => (
                <tr key={teacher.userId} className="align-top transition hover:bg-gray-50/70">
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 font-bold text-gray-700">
                        {teacher.fullName?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{teacher.fullName}</p>
                        <p className="mt-1 text-sm text-gray-500">{teacher.email}</p>
                        <p className="mt-2 text-xs uppercase tracking-widest text-gray-400">
                          {teacher.employeeNumber || teacher.employee_number || 'Employee ID pending'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    {(teacher.assignedCourseNames || teacher.assigned_course_names || []).length > 0 ? (
                      <div className="space-y-2">
                        {(teacher.assignedCourseNames || teacher.assigned_course_names || []).slice(0, 3).map((course) => (
                          <div key={`${teacher.userId}-${course}`} className="rounded-2xl bg-gray-50 px-3 py-2 font-medium text-gray-700">
                            {course}
                          </div>
                        ))}
                        {(teacher.assignedCourseNames || teacher.assigned_course_names || []).length > 3 && (
                          <p className="text-xs uppercase tracking-widest text-gray-400">
                            +{(teacher.assignedCourseNames || teacher.assigned_course_names || []).length - 3} more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-medium text-gray-400">No courses assigned yet</p>
                    )}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">{clampPercentage(teacher.attendancePercentage)}%</p>
                    <span
                      className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${attendanceStatusClasses(
                        teacher.latestAttendanceStatus,
                      )}`}
                    >
                      {teacher.latestAttendanceStatus || 'No records'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${approvalStatusClasses(
                        teacher.approvalStatus,
                      )}`}
                    >
                      {teacher.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">{clampPercentage(teacher.averageStudentScore)}%</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Students {teacher.assignedStudentsCount || teacher.assigned_students_count || 0} · Completion{' '}
                      {clampPercentage(teacher.courseCompletionRate)}%
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${activeStatusClasses(
                        teacher.activeStatus,
                      )}`}
                    >
                      {teacher.activeStatus || 'inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">{renderRowActions(teacher)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMetricGrid = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Assigned Courses</p>
        <p className="mt-3 text-3xl font-black text-gray-900">{totalAssignedCourses}</p>
      </Card>
      <Card className="rounded-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Approved Faculty</p>
        <p className="mt-3 text-3xl font-black text-gray-900">{statusTotals.approved}</p>
      </Card>
      <Card className="rounded-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pending Faculty</p>
        <p className="mt-3 text-3xl font-black text-gray-900">{statusTotals.pending}</p>
      </Card>
      <Card className="rounded-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Suspended Faculty</p>
        <p className="mt-3 text-3xl font-black text-gray-900">{statusTotals.suspended}</p>
      </Card>
    </div>
  );

  const renderAddTeacher = () => {
    if (!canManageTeachers) {
      return (
        <EmptyState
          title="Restricted Action"
          body="Only institution owners and admins can create teacher accounts."
        />
      );
    }

    return (
      <div className="space-y-6">
        {lastInvitationPreview && (
          <Card className="rounded-3xl border-blue-200 bg-blue-50">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Latest Invite Preview</p>
                <h3 className="mt-2 text-xl font-black text-blue-900">Teacher testing credentials ready</h3>
                <p className="mt-2 text-sm text-blue-700">
                  This dev preview replaces a real email provider for now. Teachers still use the normal institution login page.
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-blue-900">
                <p>
                  <span className="font-semibold">Email:</span> {lastInvitationPreview.preview.email}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Temporary password:</span>{' '}
                  {lastInvitationPreview.preview.temporaryPassword || 'Not available'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Login path:</span> {lastInvitationPreview.preview.inviteUrl}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="rounded-3xl">
          <form className="space-y-6" onSubmit={handleCreateTeacher}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Full Name
                </label>
                <input
                  required
                  value={formState.fullName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, fullName: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  placeholder="Teacher full name"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  placeholder="teacher@school.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Phone Number
                </label>
                <input
                  value={formState.phone}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  placeholder="+27 ..."
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Gender
                </label>
                <select
                  value={formState.gender}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, gender: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Qualification
                </label>
                <input
                  value={formState.qualification}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, qualification: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  placeholder="B.Ed, MSc, Certified Trainer..."
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Employee ID
                </label>
                <input
                  value={formState.employeeNumber}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, employeeNumber: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  placeholder="Optional employee number"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Address
                </label>
                <textarea
                  value={formState.address}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, address: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  placeholder="Teacher address"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                    Profile Photo URL
                  </label>
                  <input
                    value={formState.profileImageUrl}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, profileImageUrl: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                    placeholder="Optional image URL"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                    Initial Status
                  </label>
                  <select
                    value={formState.status}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        status: event.target.value as AddTeacherFormState['status'],
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  >
                    <option value="pending">Pending approval</option>
                    <option value="approved">Approved</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                Admin Notes
              </label>
              <textarea
                value={formState.notes}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, notes: event.target.value }))
                }
                rows={3}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                placeholder="Optional notes for onboarding or admin handoff"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">
                    Subjects / Courses
                  </label>
                  <p className="mt-1 text-sm text-gray-500">
                    Course assignment is optional now. Teachers can be added first and assigned later.
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                  {formState.courseIds.length} selected
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {courses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                    No courses available yet. You can create the teacher now and assign courses later.
                  </div>
                ) : (
                  courses.map((course) => {
                    const checked = formState.courseIds.includes(course.id);
                    return (
                      <label
                        key={course.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                          checked ? 'border-black bg-black/5' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleFormCourse(course.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">{course.title}</p>
                          <p className="mt-1 text-sm text-gray-500">{course.description || 'No description yet.'}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFormState(INITIAL_FORM_STATE);
                }}
              >
                Reset form
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Create teacher
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  };

  const renderCourseAssignmentPanel = () => {
    if (!selectedTeacher) {
      return (
        <EmptyState
          title="Select a Teacher"
          body="Open a teacher profile from the list to manage course assignments with the checkbox panel."
        />
      );
    }

    return (
      <Card className="rounded-3xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Course Assignment</p>
            <h3 className="mt-2 text-2xl font-black text-gray-900">{selectedTeacher.fullName}</h3>
            <p className="mt-2 text-sm text-gray-500">
              Assign or remove courses now. Teachers still log in using the normal institution login page.
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            {courseDraftIds.length} courses selected
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
              No courses exist in this institution yet.
            </div>
          ) : (
            courses.map((course) => {
              const checked = courseDraftIds.includes(course.id);
              return (
                <label
                  key={course.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                    checked ? 'border-black bg-black/5' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleCourseSelection(course.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{course.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{course.description || 'No description yet.'}</p>
                    <p className="mt-2 text-xs uppercase tracking-widest text-gray-400">
                      {course.status} · {course.studentCount || course.student_count || 0} students
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => void handleSaveAssignments()}
            disabled={actionLoading === `${selectedTeacher.userId}:courses`}
          >
            {actionLoading === `${selectedTeacher.userId}:courses` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardCheck className="h-4 w-4" />
            )}
            Save course assignments
          </Button>
        </div>
      </Card>
    );
  };

  const renderAttendanceWorkspace = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Monthly Presence</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{attendanceBreakdown.percentage}%</p>
        </Card>
        <Card className="rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Present</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{attendanceBreakdown.present}</p>
        </Card>
        <Card className="rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Absent</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{attendanceBreakdown.absent}</p>
        </Card>
        <Card className="rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Late</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{attendanceBreakdown.late}</p>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <form className="space-y-4" onSubmit={handleMarkAttendance}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Teacher
                </label>
                <select
                  value={attendanceTeacherId || ''}
                  onChange={(event) => setAttendanceTeacherId(event.target.value || null)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                >
                  {teachersResponse.results.map((teacher) => (
                    <option key={teacher.userId} value={teacher.userId}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Attendance Month
                </label>
                <input
                  type="month"
                  value={attendanceMonth}
                  onChange={(event) => setAttendanceMonth(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Status
                </label>
                <select
                  value={attendanceStatus}
                  onChange={(event) =>
                    setAttendanceStatus(event.target.value as 'present' | 'absent' | 'late')
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                Notes
              </label>
              <textarea
                value={attendanceNotes}
                onChange={(event) => setAttendanceNotes(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                placeholder="Optional attendance note"
              />
            </div>
            <Button
              type="submit"
              disabled={!attendanceTeacherId || actionLoading === `${attendanceTeacherId}:attendance`}
            >
              {attendanceTeacherId && actionLoading === `${attendanceTeacherId}:attendance` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarCheck className="h-4 w-4" />
              )}
              Mark attendance
            </Button>
          </form>

          <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Teacher Snapshot</p>
            {visibleAttendanceTeacher ? (
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p className="font-semibold text-gray-900">{visibleAttendanceTeacher.fullName}</p>
                <p>{visibleAttendanceTeacher.email}</p>
                <p>
                  Assigned courses:{' '}
                  {(visibleAttendanceTeacher.assignedCourseNames || visibleAttendanceTeacher.assigned_course_names || [])
                    .slice(0, 3)
                    .join(', ') || 'None yet'}
                </p>
                <p>
                  Performance:{' '}
                  {clampPercentage(
                    performanceMetrics?.averageStudentScore ?? visibleAttendanceTeacher.averageStudentScore,
                  )}
                  %
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">Select a teacher to view attendance analytics.</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Attendance History</p>
            <p className="mt-2 text-sm text-gray-500">
              Monthly records for {visibleAttendanceTeacher?.fullName || 'the selected teacher'}
            </p>
          </div>
        </div>
        {attendanceLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-300" />
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
            No attendance records found for the selected month.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {attendanceRecords.map((record) => (
              <div
                key={record.id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{formatDate(record.attendanceDate)}</p>
                  <p className="mt-1 text-sm text-gray-500">{record.notes || 'No note recorded.'}</p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${attendanceStatusClasses(
                    record.status,
                  )}`}
                >
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      {renderMetricGrid()}
      {renderFilters()}
      {renderTeacherTable()}
      {renderPagination()}
    </div>
  );

  const renderApproval = () => (
    <div className="space-y-6">
      {renderMetricGrid()}
      {renderFilters()}
      {renderTeacherTable()}
      {renderPagination()}
    </div>
  );

  const renderAllTeachers = () => (
    <div className="space-y-6">
      {renderOverviewCards()}
      {renderFilters()}
      {renderTeacherTable()}
      {renderPagination()}
    </div>
  );

  const renderProfiles = () => (
    <div className="space-y-6">
      {renderFilters()}
      {renderTeacherTable()}
      {renderPagination()}
    </div>
  );

  const renderAssignCourses = () => (
    <div className="space-y-6">
      {renderFilters()}
      {renderTeacherTable()}
      {renderPagination()}
      {renderCourseAssignmentPanel()}
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'teachers/add') return renderAddTeacher();
    if (activeTab === 'teachers/profiles') return renderProfiles();
    if (activeTab === 'teachers/assign') return renderAssignCourses();
    if (activeTab === 'teachers/performance') return renderPerformance();
    if (activeTab === 'teachers/approval') return renderApproval();
    if (activeTab === 'teachers/attendance') return renderAttendanceWorkspace();
    return renderAllTeachers();
  };

  if (!canManageTeachers) {
    return (
      <div className="mx-auto max-w-6xl p-6 md:p-8">
        <EmptyState
          title="Teachers Area Unavailable"
          body="Your current role does not have access to teacher management."
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
            <span className="font-semibold text-gray-900">{teachersResponse.total}</span> teachers in current view
          </div>
          <Button variant="outline" onClick={refreshTeachers}>
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
        {selectedTeacherId && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-sm">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={handleCloseTeacher}
            />
            <motion.div
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Teacher Profile</p>
                  <h2 className="mt-2 text-2xl font-black text-gray-900">
                    {selectedTeacher?.fullName || 'Loading teacher'}
                  </h2>
                  {selectedTeacher && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${approvalStatusClasses(
                          selectedTeacher.approvalStatus,
                        )}`}
                      >
                        {selectedTeacher.approvalStatus}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${activeStatusClasses(
                          selectedTeacher.activeStatus,
                        )}`}
                      >
                        {selectedTeacher.activeStatus || 'inactive'}
                      </span>
                    </div>
                  )}
                </div>
                <Button variant="ghost" onClick={handleCloseTeacher}>
                  Close
                </Button>
              </div>

              {detailLoading || !selectedTeacher ? (
                <div className="py-16 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-300" />
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Personal Info</p>
                      <div className="mt-4 space-y-3 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" /> {selectedTeacher.email}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" /> {selectedTeacher.phone || 'No phone provided'}
                        </p>
                        <p className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />{' '}
                          {selectedTeacher.employeeNumber || selectedTeacher.employee_number || 'Employee ID pending'}
                        </p>
                        <p className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-gray-400" /> {institution?.name || 'Assigned school'}
                        </p>
                      </div>
                    </Card>
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Approval Timeline</p>
                      <div className="mt-4 space-y-3 text-sm text-gray-600">
                        <p>Approved: {formatDate(selectedTeacher.approvedAt)}</p>
                        <p>Approved by: {selectedTeacher.approvedBy || selectedTeacher.approved_by || 'Not recorded'}</p>
                        <p>Suspended: {formatDate(selectedTeacher.suspendedAt)}</p>
                        <p>Reactivated: {formatDate(selectedTeacher.reactivatedAt)}</p>
                        <p>Last login: {formatDate(selectedTeacher.lastLoginAt)}</p>
                      </div>
                    </Card>
                  </div>

                  <Card className="rounded-3xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Profile Details</p>
                    <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Qualification</p>
                        <p className="mt-2 font-medium text-gray-900">
                          {selectedTeacher.qualification || 'Not provided'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Gender</p>
                        <p className="mt-2 font-medium text-gray-900">{selectedTeacher.gender || 'Not provided'}</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Address</p>
                        <p className="mt-2 font-medium text-gray-900">{selectedTeacher.address || 'Not provided'}</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Notes</p>
                        <p className="mt-2 font-medium text-gray-900">{selectedTeacher.notes || 'No notes recorded.'}</p>
                      </div>
                    </div>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Student Score</p>
                      <p className="mt-3 text-3xl font-black text-gray-900">
                        {clampPercentage(selectedTeacher.averageStudentScore)}%
                      </p>
                    </Card>
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Attendance</p>
                      <p className="mt-3 text-3xl font-black text-gray-900">
                        {clampPercentage(selectedTeacher.attendancePercentage)}%
                      </p>
                    </Card>
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Assigned Students</p>
                      <p className="mt-3 text-3xl font-black text-gray-900">
                        {selectedTeacher.assignedStudentsCount || selectedTeacher.assigned_students_count || 0}
                      </p>
                    </Card>
                    <Card className="rounded-3xl">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Assigned Courses</p>
                      <p className="mt-3 text-3xl font-black text-gray-900">
                        {selectedTeacher.assignedCoursesCount || selectedTeacher.assigned_courses_count || 0}
                      </p>
                    </Card>
                  </div>

                  <Card className="rounded-3xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Assigned Courses</p>
                        <p className="mt-2 text-sm text-gray-500">
                          {(selectedTeacher.assignedCourseNames || selectedTeacher.assigned_course_names || []).length > 0
                            ? 'Current teaching load for this faculty account.'
                            : 'No courses have been assigned yet.'}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => setCourseDraftIds(selectedTeacher.assignedCourseIds || selectedTeacher.assigned_course_ids || [])}>
                        Reset selection
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {courses.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                          No courses available in this institution yet.
                        </div>
                      ) : (
                        courses.map((course) => {
                          const checked = courseDraftIds.includes(course.id);
                          return (
                            <label
                              key={course.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                                checked ? 'border-black bg-black/5' : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleCourseSelection(course.id)}
                                className="mt-1 h-4 w-4 rounded border-gray-300"
                              />
                              <div>
                                <p className="font-semibold text-gray-900">{course.title}</p>
                                <p className="mt-1 text-sm text-gray-500">{course.description || 'No description yet.'}</p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div className="mt-5 flex justify-end">
                      <Button
                        onClick={() => void handleSaveAssignments()}
                        disabled={actionLoading === `${selectedTeacher.userId}:courses`}
                      >
                        {actionLoading === `${selectedTeacher.userId}:courses` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ClipboardCheck className="h-4 w-4" />
                        )}
                        Save assignments
                      </Button>
                    </div>
                  </Card>

                  {selectedTeacherPreview && (
                    <Card className="rounded-3xl border-blue-200 bg-blue-50">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Invite Preview</p>
                      <div className="mt-4 space-y-2 text-sm text-blue-900">
                        <p>
                          Teacher logins use the normal institution sign-in page. No public teacher signup is exposed.
                        </p>
                        <p>
                          <span className="font-semibold">Email:</span> {selectedTeacherPreview.email}
                        </p>
                        <p>
                          <span className="font-semibold">Temporary password:</span>{' '}
                          {selectedTeacherPreview.temporaryPassword || 'Not available'}
                        </p>
                        <p>
                          <span className="font-semibold">Login path:</span> {selectedTeacherPreview.inviteUrl}
                        </p>
                        <p>
                          <span className="font-semibold">Email provider:</span> {selectedTeacherPreview.provider}
                        </p>
                      </div>
                    </Card>
                  )}

                  <Card className="rounded-3xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Attendance History</p>
                    <div className="mt-4 space-y-3">
                      {(selectedTeacher.attendanceHistory || selectedTeacher.attendance_history || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No attendance records yet.</p>
                      ) : (
                        (selectedTeacher.attendanceHistory || selectedTeacher.attendance_history || [])
                          .slice(0, 8)
                          .map((record) => (
                            <div
                              key={record.id}
                              className="flex flex-col gap-3 rounded-2xl border border-gray-100 px-4 py-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="font-semibold text-gray-900">{formatDate(record.attendanceDate)}</p>
                                <p className="mt-1 text-sm text-gray-500">{record.notes || 'No note recorded.'}</p>
                              </div>
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${attendanceStatusClasses(
                                  record.status,
                                )}`}
                              >
                                {record.status}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </Card>

                  <Card className="rounded-3xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Admin Actions</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {selectedTeacher.approvalStatus === 'pending' && (
                        <>
                          <Button onClick={() => void handleTeacherStatus(selectedTeacher, 'approved')}>
                            <CheckCircle2 className="h-4 w-4" /> Approve teacher
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void handleTeacherStatus(selectedTeacher, 'suspended')}
                          >
                            <XCircle className="h-4 w-4" /> Suspend teacher
                          </Button>
                        </>
                      )}
                      {selectedTeacher.approvalStatus === 'approved' && (
                        <Button variant="outline" onClick={() => void handleTeacherStatus(selectedTeacher, 'suspended')}>
                          <XCircle className="h-4 w-4" /> Suspend teacher
                        </Button>
                      )}
                      {selectedTeacher.approvalStatus === 'suspended' && (
                        <Button onClick={() => void handleTeacherStatus(selectedTeacher, 'approved')}>
                          <PlayCircle className="h-4 w-4" /> Reactivate teacher
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
