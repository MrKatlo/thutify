import { auth } from '../lib/firebase';
import type {
  Announcement,
  AnnouncementInput,
  Assignment,
  AssignmentInput,
  AttendanceRecord,
  AttendanceSession,
  Certificate,
  Course,
  CourseInput,
  Discussion,
  DiscussionPost,
  Enrollment,
  Institution,
  InstitutionInput,
  InstitutionUser,
  Invoice,
  Lesson,
  LessonInput,
  LiveClass,
  LiveClassInput,
  Material,
  Message,
  Module,
  ModuleInput,
  Notification,
  PaginatedResult,
  PaginationParams,
  PaymentInput,
  PaymentRecord,
  PlatformUser,
  Quiz,
  QuizAttempt,
  QuizInput,
  Refund,
  Submission,
  StudentApplication,
  StudentSummary,
  TeacherAttendanceRecord,
  TeacherSummary,
  TimetableEntry,
  TimetableInput,
  UserInvite,
  UserRole,
  UserStatus,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const ACTIVE_INSTITUTION_STORAGE_KEY = 'zerot:activeInstitutionId';

interface RequestOptions {
  auth?: boolean;
  token?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

type LegacyTableName = 'users' | 'enrollments';

interface LegacyRecordResult<T = Record<string, any>> {
  results: T[];
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken();
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return `${url.pathname}${url.search}`;
}

async function apiRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers || {}) };
  let body: BodyInit | undefined;

  if (options.auth !== false) {
    const token = options.token || (await getAuthToken());
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body,
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(
      (data as { error?: string; message?: string } | null)?.error ||
        (data as { error?: string; message?: string } | null)?.message ||
        `HTTP ${response.status}`,
    );
  }

  return data as T;
}

function paginationQuery(pagination?: PaginationParams) {
  return pagination
    ? {
        limit: pagination.limit,
        offset: pagination.offset,
      }
    : undefined;
}

function getStoredInstitutionId() {
  if (typeof window === 'undefined') return null;
  return (
    window.sessionStorage.getItem(ACTIVE_INSTITUTION_STORAGE_KEY) ||
    window.localStorage.getItem(ACTIVE_INSTITUTION_STORAGE_KEY)
  );
}

function requireScopedInstitutionId(explicitInstitutionId?: string) {
  const institutionId = explicitInstitutionId || getStoredInstitutionId();
  if (!institutionId) {
    throw new Error('No active institution selected');
  }
  return institutionId;
}

function mapMemberToLegacyUser(member: InstitutionUser) {
  const userId = member.userId || member.user_id || member.uid || member.id;
  const fullName = member.fullName || member.full_name || member.email || userId;
  return {
    id: userId,
    uid: userId,
    email: member.email || '',
    display_name: fullName,
    full_name: fullName,
    institution_id: member.institutionId || member.institution_id || '',
    role: member.role,
    status: member.status,
    created_at: member.createdAt || member.created_at || new Date().toISOString(),
    updated_at: member.updatedAt || member.updated_at || new Date().toISOString(),
  };
}

export function setApiInstitutionScope(institutionId: string | null) {
  if (typeof window === 'undefined') return;
  if (institutionId) {
    window.sessionStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, institutionId);
    window.localStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, institutionId);
  } else {
    window.sessionStorage.removeItem(ACTIVE_INSTITUTION_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_INSTITUTION_STORAGE_KEY);
  }
}

export async function loginWithGoogle(firebaseToken: string): Promise<{ user: PlatformUser; institution?: Institution | null; membership?: InstitutionUser | null }> {
  return apiRequest('POST', '/auth/register', {
    token: firebaseToken,
  });
}

export async function requestPasswordReset(email: string, institutionId?: string): Promise<{ success: boolean; token: string; expiresAt: string }> {
  return apiRequest('POST', '/auth/password-reset-request', {
    auth: false,
    body: { email, institutionId },
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return apiRequest('POST', `/auth/password-reset/${token}`, {
    auth: false,
    body: { newPassword },
  });
}

export async function logoutSession(): Promise<{ success: boolean }> {
  return apiRequest('POST', '/auth/logout');
}

export async function getCurrentUser(): Promise<PlatformUser> {
  return apiRequest('GET', '/me');
}

export async function updateCurrentUser(data: { fullName?: string; phone?: string; photoUrl?: string }): Promise<PlatformUser> {
  return apiRequest('PATCH', '/me', { body: data });
}

export async function getPlatformInstitutions(): Promise<Institution[]> {
  return apiRequest('GET', '/institutions');
}

export async function getInstitutionBySlug(slug: string): Promise<Institution> {
  return apiRequest('GET', `/public/institutions/by-slug/${slug}`, { auth: false });
}

export async function searchInstitutions(q: string): Promise<Institution[]> {
  return apiRequest('GET', '/public/institutions/search', {
    auth: false,
    query: { q },
  });
}

export async function createInstitution(data: InstitutionInput): Promise<Institution> {
  const result = await apiRequest<{ institution: Institution | null }>('POST', '/auth/register', {
    body: { institution: data },
  });
  if (!result.institution) {
    throw new Error('Institution creation did not return an institution');
  }
  return result.institution;
}

export async function getInstitution(id: string): Promise<Institution> {
  return apiRequest('GET', `/institutions/${id}`);
}

export async function updateInstitution(id: string, data: Partial<Institution>): Promise<Institution> {
  return apiRequest('PUT', `/institutions/${id}`, { body: data });
}

export async function deleteInstitution(id: string): Promise<void> {
  await apiRequest('DELETE', `/institutions/${id}`);
}

export async function getInstitutionMembership(institutionId: string): Promise<InstitutionUser> {
  return apiRequest('GET', `/institutions/${institutionId}/membership`);
}

export async function getInstitutionMembers(institutionId: string, role?: string): Promise<InstitutionUser[]> {
  return apiRequest('GET', `/institutions/${institutionId}/members`, {
    query: role ? { role } : undefined,
  });
}

export async function updateInstitutionMember(
  institutionId: string,
  userId: string,
  data: { role?: UserRole; status?: UserStatus },
): Promise<InstitutionUser> {
  return apiRequest('PATCH', `/institutions/${institutionId}/users/${userId}`, { body: data });
}

export async function deleteInstitutionMember(institutionId: string, userId: string): Promise<void> {
  await apiRequest('DELETE', `/institutions/${institutionId}/users/${userId}`);
}

export async function inviteUser(
  institutionId: string,
  data: { email: string; role: UserRole; fullName?: string; assignedCourses?: string[] },
): Promise<UserInvite> {
  return apiRequest('POST', `/institutions/${institutionId}/invites`, {
    body: data,
  });
}

export async function listInvites(institutionId: string): Promise<UserInvite[]> {
  return apiRequest('GET', `/institutions/${institutionId}/invites`);
}

export async function deleteInvite(institutionId: string, inviteId: string): Promise<void> {
  await apiRequest('DELETE', `/institutions/${institutionId}/invites/${inviteId}`);
}

export async function getInviteByToken(token: string): Promise<UserInvite> {
  return apiRequest('GET', `/public/invites/by-token/${token}`, { auth: false });
}

export async function acceptInvite(institutionId: string, inviteId: string): Promise<InstitutionUser> {
  return apiRequest('POST', `/institutions/${institutionId}/invites/${inviteId}/accept`);
}

export async function listApplications(institutionId: string): Promise<StudentApplication[]> {
  return apiRequest('GET', `/institutions/${institutionId}/applications`);
}

export async function applyToInstitution(
  institutionId: string,
  data: {
    fullName?: string;
    email?: string;
    phone?: string;
    parentGuardianName?: string;
    parentGuardianEmail?: string;
    parentGuardianPhone?: string;
    notes?: string;
  },
): Promise<StudentApplication> {
  return apiRequest('POST', `/institutions/${institutionId}/applications`, {
    body: data,
  });
}

export async function applyToInstitutionBySlug(
  institutionSlug: string,
  data: {
    fullName?: string;
    email?: string;
    phone?: string;
    parentGuardianName?: string;
    parentGuardianEmail?: string;
    parentGuardianPhone?: string;
    notes?: string;
  },
): Promise<StudentApplication> {
  return apiRequest('POST', `/auth/request-join/${institutionSlug}`, {
    body: data,
  });
}

export async function approveApplication(institutionId: string, appId: string): Promise<StudentApplication> {
  return apiRequest('PATCH', `/institutions/${institutionId}/applications/${appId}`, {
    body: { status: 'approved' },
  });
}

export async function rejectApplication(institutionId: string, appId: string): Promise<StudentApplication> {
  return apiRequest('PATCH', `/institutions/${institutionId}/applications/${appId}`, {
    body: { status: 'rejected' },
  });
}

export async function listStudents(
  institutionId: string,
  options: {
    q?: string;
    status?: string;
    courseId?: string;
    pagination?: PaginationParams;
  } = {},
): Promise<PaginatedResult<StudentSummary>> {
  return apiRequest('GET', `/institutions/${institutionId}/students`, {
    query: {
      q: options.q,
      status: options.status,
      course_id: options.courseId,
      ...paginationQuery(options.pagination),
    },
  });
}

export async function getStudent(institutionId: string, studentId: string): Promise<StudentSummary> {
  return apiRequest('GET', `/institutions/${institutionId}/students/${studentId}`);
}

export async function createStudent(
  institutionId: string,
  data: {
    fullName: string;
    email: string;
    phone?: string;
    temporaryPassword?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'suspended';
    notes?: string;
    parentGuardianName?: string;
    parentGuardianEmail?: string;
    parentGuardianPhone?: string;
  },
): Promise<StudentSummary> {
  return apiRequest('POST', `/institutions/${institutionId}/students`, {
    body: data,
  });
}

export async function updateStudentStatus(
  institutionId: string,
  studentId: string,
  data: { status: 'pending' | 'approved' | 'rejected' | 'suspended'; reason?: string },
): Promise<StudentSummary> {
  return apiRequest('PATCH', `/institutions/${institutionId}/students/${studentId}/status`, {
    body: data,
  });
}

export async function listTeachers(
  institutionId: string,
  options: {
    q?: string;
    status?: string;
    pagination?: PaginationParams;
  } = {},
): Promise<PaginatedResult<TeacherSummary>> {
  return apiRequest('GET', `/institutions/${institutionId}/teachers`, {
    query: {
      q: options.q,
      status: options.status,
      ...paginationQuery(options.pagination),
    },
  });
}

export async function getTeacher(institutionId: string, teacherId: string): Promise<TeacherSummary> {
  return apiRequest('GET', `/institutions/${institutionId}/teachers/${teacherId}`);
}

export async function createTeacher(
  institutionId: string,
  data: {
    fullName: string;
    email: string;
    phone?: string;
    gender?: string;
    address?: string;
    qualification?: string;
    courseIds?: string[];
    assignedCourses?: string[];
    employeeNumber?: string;
    employee_number?: string;
    profileImageUrl?: string;
    profile_image_url?: string;
    status?: 'pending' | 'approved' | 'suspended' | 'active';
    notes?: string;
  },
): Promise<TeacherSummary> {
  return apiRequest('POST', `/institutions/${institutionId}/teachers`, {
    body: data,
  });
}

export async function updateTeacher(
  institutionId: string,
  teacherId: string,
  data: {
    fullName?: string;
    phone?: string;
    gender?: string;
    address?: string;
    qualification?: string;
    employeeNumber?: string;
    employee_number?: string;
    profileImageUrl?: string;
    profile_image_url?: string;
    status?: 'pending' | 'approved' | 'suspended' | 'active';
    notes?: string;
  },
): Promise<TeacherSummary> {
  return apiRequest('PATCH', `/institutions/${institutionId}/teachers/${teacherId}`, {
    body: data,
  });
}

export async function assignTeacherCourses(
  institutionId: string,
  teacherId: string,
  courseIds: string[],
): Promise<TeacherSummary> {
  return apiRequest('PUT', `/institutions/${institutionId}/teachers/${teacherId}/courses`, {
    body: {
      courseIds,
    },
  });
}

export async function listTeacherAttendance(
  institutionId: string,
  teacherId: string,
  month?: string,
): Promise<TeacherAttendanceRecord[]> {
  return apiRequest('GET', `/institutions/${institutionId}/teachers/${teacherId}/attendance`, {
    query: month ? { month } : undefined,
  });
}

export async function markTeacherAttendance(
  institutionId: string,
  teacherId: string,
  data: {
    attendanceDate?: string;
    attendance_date?: string;
    status: 'present' | 'absent' | 'late';
    notes?: string;
  },
): Promise<TeacherAttendanceRecord | null> {
  return apiRequest('POST', `/institutions/${institutionId}/teachers/${teacherId}/attendance`, {
    body: data,
  });
}

export async function getTeacherPerformance(
  institutionId: string,
  teacherId: string,
): Promise<{
  averageStudentScore?: number | null;
  averageQuizScore?: number | null;
  averageAssignmentGrade?: number | null;
  attendancePercentage?: number | null;
  assignedStudentsCount?: number | null;
  assignedCoursesCount?: number | null;
  courseCompletionRate?: number | null;
}> {
  return apiRequest('GET', `/institutions/${institutionId}/teachers/${teacherId}/performance`);
}

export async function listCourses(institutionId: string, pagination?: PaginationParams): Promise<Course[]> {
  return apiRequest('GET', `/institutions/${institutionId}/courses`, {
    query: paginationQuery(pagination),
  });
}

export async function getCourse(id: string): Promise<Course> {
  return apiRequest('GET', `/courses/${id}`);
}

export async function createCourse(institutionId: string, data: CourseInput): Promise<Course> {
  return apiRequest('POST', `/institutions/${institutionId}/courses`, {
    body: data,
  });
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course> {
  return apiRequest('PUT', `/courses/${id}`, {
    body: data,
  });
}

export async function deleteCourse(id: string): Promise<void> {
  await apiRequest('DELETE', `/courses/${id}`);
}

export async function enrollCourse(institutionId: string, courseId: string, studentId?: string): Promise<Enrollment> {
  return apiRequest('POST', `/institutions/${institutionId}/enrollments`, {
    body: { courseId, studentId },
  });
}

export async function listEnrollments(
  institutionId: string,
  courseId?: string,
  studentId?: string,
  pagination?: PaginationParams,
): Promise<Enrollment[]> {
  return apiRequest('GET', `/institutions/${institutionId}/enrollments`, {
    query: {
      course_id: courseId,
      student_id: studentId,
      ...paginationQuery(pagination),
    },
  });
}

export async function unenrollCourse(enrollmentId: string): Promise<void> {
  await apiRequest('DELETE', `/enrollments/${enrollmentId}`);
}

export async function listModules(courseId: string): Promise<Module[]> {
  return apiRequest('GET', `/courses/${courseId}/modules`);
}

export async function createModule(institutionId: string, courseId: string, data: ModuleInput): Promise<Module[]> {
  void institutionId;
  return apiRequest('POST', `/courses/${courseId}/modules`, {
    body: data,
  });
}

export async function updateModule(id: string, data: Partial<Module>): Promise<Module> {
  return apiRequest('PUT', `/modules/${id}`, {
    body: data,
  });
}

export async function deleteModule(id: string): Promise<void> {
  await apiRequest('DELETE', `/modules/${id}`);
}

export async function listLessons(moduleId?: string, courseId?: string): Promise<Lesson[]> {
  if (moduleId) {
    return apiRequest('GET', `/modules/${moduleId}/lessons`);
  }
  if (courseId) {
    const course = await getCourse(courseId);
    return (course.modules || []).flatMap((module) => module.lessons || []);
  }
  return [];
}

export async function getLesson(id: string): Promise<Lesson> {
  return apiRequest('GET', `/lessons/${id}`);
}

export async function createLesson(
  institutionId: string,
  data: LessonInput,
): Promise<Lesson> {
  void institutionId;
  const moduleId = data.moduleId || data.module_id;
  if (!moduleId) {
    throw new Error('moduleId is required to create a lesson');
  }
  return apiRequest('POST', `/modules/${moduleId}/lessons`, {
    body: data,
  });
}

export async function updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson> {
  return apiRequest('PUT', `/lessons/${id}`, {
    body: data,
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await apiRequest('DELETE', `/lessons/${id}`);
}

export async function updateLessonProgress(
  lessonId: string,
  data: { completed?: boolean; resumeSeconds?: number },
): Promise<{ success: boolean; lesson_id: string; student_id: string; completed: boolean }> {
  return apiRequest('PUT', `/lessons/${lessonId}/progress`, {
    body: data,
  });
}

export async function listAssignments(
  institutionId: string,
  courseId?: string,
  pagination?: PaginationParams,
): Promise<Assignment[]> {
  return apiRequest('GET', `/institutions/${institutionId}/assignments`, {
    query: {
      course_id: courseId,
      ...paginationQuery(pagination),
    },
  });
}

export async function createAssignment(institutionId: string, data: AssignmentInput): Promise<Assignment> {
  return apiRequest('POST', `/institutions/${institutionId}/assignments`, {
    body: data,
  });
}

export async function createAssignmentForLesson(lessonId: string, data: AssignmentInput): Promise<Assignment> {
  return apiRequest('POST', `/lessons/${lessonId}/assignments`, {
    body: data,
  });
}

export async function updateAssignment(id: string, data: Partial<Assignment>): Promise<Assignment> {
  return apiRequest('PUT', `/assignments/${id}`, {
    body: data,
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  await apiRequest('DELETE', `/assignments/${id}`);
}

export async function listSubmissions(
  institutionId: string,
  assignmentId?: string,
  studentId?: string,
  pagination?: PaginationParams,
): Promise<Submission[]> {
  return apiRequest('GET', `/institutions/${institutionId}/submissions`, {
    query: {
      assignment_id: assignmentId,
      student_id: studentId,
      ...paginationQuery(pagination),
    },
  });
}

export async function submitAssignment(
  institutionId: string,
  assignmentId: string,
  data: { content?: string; notes?: string; fileUrl?: string; file_url?: string },
): Promise<Submission> {
  void institutionId;
  return apiRequest('POST', `/assignments/${assignmentId}/submit`, {
    body: data,
  });
}

export async function gradeSubmission(id: string, grade: number, feedback?: string): Promise<Submission> {
  return apiRequest('PUT', `/submissions/${id}/grade`, {
    body: { grade, feedback },
  });
}

export async function listQuizzes(institutionId: string, pagination?: PaginationParams): Promise<Quiz[]> {
  return apiRequest('GET', `/institutions/${institutionId}/quizzes`, {
    query: paginationQuery(pagination),
  });
}

export async function createQuiz(institutionId: string, data: QuizInput): Promise<Quiz> {
  return apiRequest('POST', `/institutions/${institutionId}/quizzes`, {
    body: data,
  });
}

export async function createQuizForLesson(lessonId: string, data: QuizInput): Promise<Quiz> {
  return apiRequest('POST', `/lessons/${lessonId}/quizzes`, {
    body: data,
  });
}

export async function deleteQuiz(id: string): Promise<void> {
  await apiRequest('DELETE', `/quizzes/${id}`);
}

export async function listQuizAttempts(
  institutionId: string,
  studentId?: string,
  pagination?: PaginationParams,
): Promise<QuizAttempt[]> {
  return apiRequest('GET', `/institutions/${institutionId}/quiz-attempts`, {
    query: {
      student_id: studentId,
      ...paginationQuery(pagination),
    },
  });
}

export async function submitQuizAttempt(
  institutionId: string,
  data: {
    quizId?: string;
    quiz_id?: string;
    quizTitle?: string;
    quiz_title?: string;
    courseName?: string;
    course_name?: string;
    studentId?: string;
    student_id?: string;
    studentName?: string;
    student_name?: string;
    answers?: Record<number, string>;
    score?: number;
    questions?: unknown[];
    status?: string;
  },
): Promise<QuizAttempt> {
  void institutionId;
  const quizId = data.quizId || data.quiz_id;
  if (!quizId) {
    throw new Error('quizId is required');
  }
  return apiRequest('POST', `/quizzes/${quizId}/attempt`, {
    body: data,
  });
}

export async function createAttendanceSession(
  institutionId: string,
  courseId: string,
  data?: { sessionDate?: string; topic?: string },
): Promise<AttendanceSession> {
  void institutionId;
  return apiRequest('POST', `/courses/${courseId}/attendance-sessions`, {
    body: data,
  });
}

export async function listAttendanceSessions(institutionId: string, courseId: string): Promise<AttendanceSession[]> {
  void institutionId;
  return apiRequest('GET', `/courses/${courseId}/attendance-sessions`);
}

export async function listAttendanceRecords(institutionId: string): Promise<AttendanceRecord[]> {
  return apiRequest('GET', `/institutions/${institutionId}/attendance/records`);
}

export async function markAttendance(
  institutionId: string,
  courseId: string,
  studentId: string,
  status: string,
): Promise<AttendanceRecord[]> {
  return apiRequest('POST', `/institutions/${institutionId}/attendance/records`, {
    body: { courseId, studentId, status },
  });
}

export async function createLiveClass(institutionId: string, data: LiveClassInput): Promise<LiveClass> {
  return apiRequest('POST', `/institutions/${institutionId}/live-classes`, {
    body: data,
  });
}

export async function startLiveClass(classId: string): Promise<{ meetingUrl: string; meeting_url: string }> {
  return apiRequest('POST', `/live-classes/${classId}/start`);
}

export async function endLiveClass(classId: string): Promise<{ success: boolean; recordingKey: string; recordingUrl: string }> {
  return apiRequest('POST', `/live-classes/${classId}/end`);
}

export async function listLiveClasses(institutionId: string): Promise<LiveClass[]> {
  return apiRequest('GET', `/institutions/${institutionId}/live-classes`);
}

export async function deleteLiveClass(classId: string): Promise<void> {
  await apiRequest('DELETE', `/live-classes/${classId}`);
}

export async function createAnnouncement(institutionId: string, data: AnnouncementInput): Promise<Announcement> {
  return apiRequest('POST', `/institutions/${institutionId}/announcements`, {
    body: data,
  });
}

export async function listAnnouncements(
  institutionId: string,
  courseId?: string,
  pagination?: PaginationParams,
): Promise<Announcement[]> {
  return apiRequest('GET', `/institutions/${institutionId}/announcements`, {
    query: {
      course_id: courseId,
      ...paginationQuery(pagination),
    },
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await apiRequest('DELETE', `/announcements/${id}`);
}

export async function listDiscussions(
  institutionId: string,
  courseId?: string,
  pagination?: PaginationParams,
): Promise<Discussion[]> {
  return apiRequest('GET', `/institutions/${institutionId}/discussions`, {
    query: {
      course_id: courseId,
      ...paginationQuery(pagination),
    },
  });
}

export async function createDiscussion(institutionId: string, courseId: string, title: string): Promise<Discussion> {
  void institutionId;
  return apiRequest('POST', `/courses/${courseId}/discussions`, {
    body: { title },
  });
}

export async function listDiscussionPosts(institutionId: string, discussionId: string): Promise<DiscussionPost[]> {
  void institutionId;
  return apiRequest('GET', `/discussions/${discussionId}/replies`);
}

export async function createDiscussionPost(
  institutionId: string,
  discussionId: string,
  content: string,
): Promise<DiscussionPost> {
  void institutionId;
  return apiRequest('POST', `/discussions/${discussionId}/replies`, {
    body: { content },
  });
}

export async function deleteDiscussionPost(
  institutionId: string,
  discussionId: string,
  postId: string,
): Promise<void> {
  await apiRequest('DELETE', `/institutions/${institutionId}/discussions/${discussionId}/posts/${postId}`);
}

export async function listMessages(
  institutionId: string,
  peerId?: string,
  pagination?: PaginationParams,
): Promise<Message[]> {
  return apiRequest('GET', `/institutions/${institutionId}/messages`, {
    query: {
      peer_id: peerId,
      ...paginationQuery(pagination),
    },
  });
}

export async function sendMessage(institutionId: string, recipientId: string, content: string): Promise<Message> {
  return apiRequest('POST', '/messages', {
    body: {
      institutionId,
      toUserId: recipientId,
      content,
    },
  });
}

export async function getNotifications(institutionId: string): Promise<Notification[]> {
  return apiRequest('GET', `/institutions/${institutionId}/notifications`);
}

export async function listNotifications(institutionId: string): Promise<Notification[]> {
  return getNotifications(institutionId);
}

export async function markNotificationsRead(institutionId: string): Promise<{ success: boolean }> {
  return apiRequest('POST', `/institutions/${institutionId}/notifications/mark-read`);
}

export async function initiatePayment(institutionId: string, data: PaymentInput): Promise<PaymentRecord> {
  return apiRequest('POST', `/institutions/${institutionId}/payments`, {
    body: data,
  });
}

export async function createPayment(institutionId: string, data: PaymentInput): Promise<PaymentRecord> {
  return initiatePayment(institutionId, data);
}

export async function listPayments(institutionId: string, studentId?: string): Promise<PaymentRecord[]> {
  return apiRequest('GET', `/institutions/${institutionId}/payments`, {
    query: studentId ? { student_id: studentId } : undefined,
  });
}

export async function getInvoices(institutionId: string): Promise<Invoice[]> {
  return apiRequest('GET', `/institutions/${institutionId}/invoices`);
}

export async function listInvoices(institutionId: string): Promise<Invoice[]> {
  return getInvoices(institutionId);
}

export async function generateInvoice(
  institutionId: string,
  data: { studentId?: string; student_id?: string; courseId?: string; course_id?: string; amount?: number; dueDate?: string; due_date?: string },
): Promise<Invoice> {
  return apiRequest('POST', `/institutions/${institutionId}/invoices`, {
    body: data,
  });
}

export async function processRefund(refundId: string, status = 'processed'): Promise<Refund> {
  return apiRequest('PATCH', `/refunds/${refundId}`, {
    body: { status },
  });
}

export async function requestRefund(
  institutionId: string,
  data: { paymentId?: string; payment_id?: string; amount?: number; reason?: string },
): Promise<Refund> {
  return apiRequest('POST', `/institutions/${institutionId}/refunds`, {
    body: data,
  });
}

export async function listRefunds(institutionId: string): Promise<Refund[]> {
  return apiRequest('GET', `/institutions/${institutionId}/refunds`);
}

export async function listCertificates(institutionId: string): Promise<Certificate[]> {
  return apiRequest('GET', `/institutions/${institutionId}/certificates`);
}

export async function generateCertificate(institutionId: string, studentId: string, courseId: string): Promise<Certificate> {
  return apiRequest('POST', `/institutions/${institutionId}/certificates`, {
    body: { studentId, courseId },
  });
}

export async function createTimetableEntry(institutionId: string, data: TimetableInput & { teacherId?: string; teacher_id?: string }): Promise<TimetableEntry> {
  return apiRequest('POST', `/institutions/${institutionId}/timetable`, {
    body: data,
  });
}

export async function getTimetable(institutionId: string, teacherId?: string): Promise<TimetableEntry[]> {
  return apiRequest('GET', `/institutions/${institutionId}/timetable`, {
    query: teacherId ? { teacher_id: teacherId } : undefined,
  });
}

export async function deleteTimetableEntry(id: string): Promise<void> {
  await apiRequest('DELETE', `/timetable-entries/${id}`);
}

export async function listMaterials(institutionId: string): Promise<Material[]> {
  return apiRequest('GET', `/institutions/${institutionId}/materials`);
}

export async function createMaterial(institutionId: string, data: Record<string, unknown>): Promise<Material> {
  return apiRequest('POST', `/institutions/${institutionId}/materials`, {
    body: data,
  });
}

export async function deleteMaterial(institutionId: string, materialId: string): Promise<void> {
  await apiRequest('DELETE', `/institutions/${institutionId}/materials/${materialId}`);
}

export async function incrementMaterialDownloads(institutionId: string, materialId: string): Promise<{ success?: boolean }> {
  return apiRequest('POST', `/institutions/${institutionId}/materials/${materialId}/download`);
}

export async function uploadFile(file: File, key?: string, token?: string): Promise<{ key: string; url: string; contentType: string; size: number; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (key) formData.append('key', key);

  return apiRequest('POST', '/storage/upload', {
    body: formData,
    token,
  });
}

export async function uploadSlide(file: File) {
  return apiRequest<{ key: string; url: string }>('POST', '/uploads/slide', {
    body: (() => {
      const formData = new FormData();
      formData.append('file', file);
      return formData;
    })(),
  });
}

export async function uploadVideo(file: File) {
  return apiRequest<{ key: string; url: string }>('POST', '/uploads/video', {
    body: (() => {
      const formData = new FormData();
      formData.append('file', file);
      return formData;
    })(),
  });
}

export async function uploadPDF(file: File) {
  return apiRequest<{ key: string; url: string }>('POST', '/uploads/pdf', {
    body: (() => {
      const formData = new FormData();
      formData.append('file', file);
      return formData;
    })(),
  });
}

export async function uploadLogo(file: File) {
  return apiRequest<{ key: string; url: string }>('POST', '/uploads/logo', {
    body: (() => {
      const formData = new FormData();
      formData.append('file', file);
      return formData;
    })(),
  });
}

export async function uploadCertificate(file: File) {
  return apiRequest<{ key: string; url: string }>('POST', '/uploads/certificate', {
    body: (() => {
      const formData = new FormData();
      formData.append('file', file);
      return formData;
    })(),
  });
}

export async function deleteFile(key: string): Promise<{ success: boolean }> {
  return apiRequest('DELETE', '/storage/object', {
    query: { key },
  });
}

export async function getDashboardStats(institutionId: string): Promise<{
  students_count: number;
  teachers_count: number;
  courses_count: number;
  total_revenue: number;
  unpaid_count: number;
}> {
  return apiRequest('GET', `/institutions/${institutionId}/dashboard`);
}

export async function getFinancialReport(institutionId: string): Promise<{
  totalRevenue: number;
  outstanding: number;
  monthly: Array<{ name: string; revenue: number }>;
}> {
  return apiRequest('GET', `/institutions/${institutionId}/reports/financial`);
}

export async function getAttendanceReport(institutionId: string): Promise<{ rate: number }> {
  return apiRequest('GET', `/institutions/${institutionId}/reports/attendance`);
}

export async function getEnrollmentReport(institutionId: string): Promise<{
  totalStudents: number;
  distribution: Array<{ name: string; students: number }>;
}> {
  return apiRequest('GET', `/institutions/${institutionId}/reports/enrollment`);
}

export async function readRecords(
  table: LegacyTableName,
  options: { institutionId?: string } = {},
): Promise<LegacyRecordResult> {
  const institutionId = requireScopedInstitutionId(options.institutionId);

  switch (table) {
    case 'users': {
      const members = await apiRequest<InstitutionUser[]>('GET', `/institutions/${institutionId}/users`);
      return { results: members.map(mapMemberToLegacyUser) };
    }
    case 'enrollments': {
      const enrollments = await listEnrollments(institutionId);
      return { results: enrollments as unknown[] as Record<string, unknown>[] };
    }
    default:
      throw new Error(`Unsupported legacy table: ${table}`);
  }
}

export async function createRecord(
  table: LegacyTableName,
  data: Record<string, unknown>,
  options: { institutionId?: string } = {},
) {
  const institutionId = requireScopedInstitutionId(options.institutionId);

  switch (table) {
    case 'users':
      return apiRequest('POST', `/institutions/${institutionId}/users`, { body: data });
    case 'enrollments':
      return apiRequest('POST', `/institutions/${institutionId}/enrollments`, { body: data });
    default:
      throw new Error(`Unsupported legacy table: ${table}`);
  }
}

export async function updateRecord(
  table: LegacyTableName,
  data: Record<string, unknown>,
  where: Record<string, unknown>,
  options: { institutionId?: string } = {},
) {
  const institutionId = requireScopedInstitutionId(options.institutionId);

  switch (table) {
    case 'users': {
      const userId = String(where.id || where.uid || '').trim();
      if (!userId) throw new Error('User id is required for updates');
      return apiRequest('PATCH', `/institutions/${institutionId}/users/${userId}`, { body: data });
    }
    default:
      throw new Error(`Unsupported legacy update table: ${table}`);
  }
}

export async function deleteRecord(
  table: LegacyTableName,
  where: Record<string, unknown>,
  options: { institutionId?: string } = {},
) {
  const institutionId = requireScopedInstitutionId(options.institutionId);

  switch (table) {
    case 'users': {
      const userId = String(where.id || where.uid || '').trim();
      if (!userId) throw new Error('User id is required for deletes');
      await apiRequest('DELETE', `/institutions/${institutionId}/users/${userId}`);
      return;
    }
    case 'enrollments': {
      if (where.id) {
        await apiRequest('DELETE', `/enrollments/${where.id}`);
        return;
      }

      const studentId = String(where.student_id || where.studentId || '').trim();
      if (!studentId) {
        throw new Error('Enrollment id or student_id is required for deletes');
      }

      const enrollments = await listEnrollments(institutionId, undefined, studentId);
      await Promise.all(enrollments.map((enrollment) => apiRequest('DELETE', `/enrollments/${enrollment.id}`)));
      return;
    }
    default:
      throw new Error(`Unsupported legacy delete table: ${table}`);
  }
}
