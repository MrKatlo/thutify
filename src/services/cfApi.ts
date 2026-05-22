import { getAuth } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8788/api';

async function getToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return await user.getIdToken();
}

async function apiCall(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<any> {
  const authToken = token || (await getToken());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as any).error || `HTTP ${response.status}`);
  }
  return data;
}

// ============== PLATFORM USERS ==============

export async function getCurrentUser(): Promise<any> {
  return apiCall('GET', '/me');
}

export async function updateCurrentUser(data: { fullName?: string; phone?: string; photoUrl?: string }): Promise<any> {
  return apiCall('PATCH', '/me', data);
}

// ============== INSTITUTIONS ==============

export async function getPlatformInstitutions(): Promise<any> {
  return apiCall('GET', '/institutions');
}

export async function getInstitutionBySlug(slug: string): Promise<any> {
  const response = await fetch(`${API_BASE}/public/institutions/by-slug/${slug}`);
  const data = await response.json();
  if (!response.ok) throw new Error((data as any).error || 'Institution not found');
  return data;
}

export async function searchInstitutions(q: string): Promise<any> {
  const response = await fetch(`${API_BASE}/public/institutions/search?q=${encodeURIComponent(q)}`);
  const data = await response.json();
  if (!response.ok) return [];
  return data || [];
}

export async function createInstitution(data: {
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  country?: string;
  institutionType: string;
}): Promise<any> {
  return apiCall('POST', '/institutions', data);
}

export async function getInstitution(id: string): Promise<any> {
  return apiCall('GET', `/institutions/${id}`);
}

export async function updateInstitution(id: string, data: any): Promise<any> {
  return apiCall('PATCH', `/institutions/${id}`, data);
}

export async function getInstitutionMembers(institutionId: string, role?: string): Promise<any> {
  const url = `/institutions/${institutionId}/users${role ? `?role=${role}` : ''}`;
  return apiCall('GET', url);
}

export async function updateInstitutionMember(
  institutionId: string,
  userId: string,
  data: { role?: string; status?: string }
): Promise<any> {
  return apiCall('PATCH', `/institutions/${institutionId}/users/${userId}`, data);
}

export async function deleteInstitutionMember(institutionId: string, userId: string): Promise<any> {
  return apiCall('DELETE', `/institutions/${institutionId}/users/${userId}`);
}

export async function getInstitutionMembership(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/membership`);
}

// ============== COURSES ==============

export async function listCourses(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/courses`);
}

export async function getCourse(courseId: string): Promise<any> {
  return apiCall('GET', `/courses/${courseId}`);
}

export async function createCourse(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/courses`, data);
}

export async function updateCourse(courseId: string, data: any): Promise<any> {
  return apiCall('PATCH', `/courses/${courseId}`, data);
}

export async function deleteCourse(courseId: string): Promise<any> {
  return apiCall('DELETE', `/courses/${courseId}`);
}

export async function getCourseLessons(courseId: string): Promise<any> {
  return apiCall('GET', `/courses/${courseId}/lessons`);
}

// ============== MODULES ==============

export async function listModules(courseId: string): Promise<any> {
  return apiCall('GET', `/modules?course_id=${courseId}`);
}

export async function createModule(institutionId: string, courseId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/modules`, { ...data, courseId });
}

export async function updateModule(moduleId: string, data: any): Promise<any> {
  return apiCall('PATCH', `/modules/${moduleId}`, data);
}

export async function deleteModule(moduleId: string): Promise<any> {
  return apiCall('DELETE', `/modules/${moduleId}`);
}

// ============== LESSONS ==============

export async function listLessons(moduleId?: string, courseId?: string): Promise<any> {
  const params = new URLSearchParams();
  if (moduleId) params.append('module_id', moduleId);
  if (courseId) params.append('course_id', courseId);
  return apiCall('GET', `/lessons?${params.toString()}`);
}

export async function getLesson(lessonId: string): Promise<any> {
  return apiCall('GET', `/lessons/${lessonId}`);
}

export async function createLesson(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/lessons`, data);
}

export async function updateLesson(lessonId: string, data: any): Promise<any> {
  return apiCall('PATCH', `/lessons/${lessonId}`, data);
}

export async function deleteLesson(lessonId: string): Promise<any> {
  return apiCall('DELETE', `/lessons/${lessonId}`);
}

export async function updateLessonProgress(lessonId: string, data: { completed?: boolean; resumeSeconds?: number }): Promise<any> {
  return apiCall('POST', `/lessons/${lessonId}/progress`, data);
}

// ============== ENROLLMENTS ==============

export async function listEnrollments(institutionId: string, courseId?: string, studentId?: string): Promise<any> {
  const params = new URLSearchParams();
  if (courseId) params.append('course_id', courseId);
  if (studentId) params.append('student_id', studentId);
  return apiCall('GET', `/institutions/${institutionId}/enrollments?${params.toString()}`);
}

export async function enrollCourse(institutionId: string, courseId: string, studentId: string): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/enrollments`, { courseId, studentId });
}

export async function unenrollCourse(enrollmentId: string): Promise<any> {
  return apiCall('DELETE', `/enrollments/${enrollmentId}`);
}

// ============== ASSIGNMENTS ==============

export async function listAssignments(institutionId: string, courseId?: string): Promise<any> {
  const url = courseId
    ? `/institutions/${institutionId}/assignments?course_id=${courseId}`
    : `/institutions/${institutionId}/assignments`;
  return apiCall('GET', url);
}

export async function createAssignment(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/assignments`, data);
}

export async function updateAssignment(assignmentId: string, data: any): Promise<any> {
  return apiCall('PATCH', `/assignments/${assignmentId}`, data);
}

export async function deleteAssignment(assignmentId: string): Promise<any> {
  return apiCall('DELETE', `/assignments/${assignmentId}`);
}

// ============== SUBMISSIONS ==============

export async function listSubmissions(institutionId: string, assignmentId?: string, studentId?: string): Promise<any> {
  const params = new URLSearchParams();
  if (assignmentId) params.append('assignment_id', assignmentId);
  if (studentId) params.append('student_id', studentId);
  return apiCall('GET', `/institutions/${institutionId}/submissions?${params.toString()}`);
}

export async function submitAssignment(institutionId: string, assignmentId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/submissions`, { ...data, assignmentId });
}

export async function gradeSubmission(submissionId: string, grade: number, feedback?: string): Promise<any> {
  return apiCall('PATCH', `/submissions/${submissionId}`, { grade, feedback });
}

// ============== QUIZZES ==============

export async function listQuizzes(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/quizzes`);
}

export async function createQuiz(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/quizzes`, data);
}

export async function deleteQuiz(quizId: string): Promise<any> {
  return apiCall('DELETE', `/quizzes/${quizId}`);
}

// ============== QUIZ ATTEMPTS ==============

export async function listQuizAttempts(institutionId: string, studentId?: string): Promise<any> {
  const url = studentId
    ? `/institutions/${institutionId}/quiz-attempts?student_id=${studentId}`
    : `/institutions/${institutionId}/quiz-attempts`;
  return apiCall('GET', url);
}

export async function submitQuizAttempt(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/quiz-attempts`, data);
}

// ============== ATTENDANCE ==============

export async function listAttendanceSessions(institutionId: string, courseId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/attendance/sessions?course_id=${courseId}`);
}

export async function createAttendanceSession(institutionId: string, courseId: string, data?: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/attendance/sessions`, { ...data, courseId });
}

export async function listAttendanceRecords(institutionId: string, sessionId?: string, studentId?: string): Promise<any> {
  const params = new URLSearchParams();
  if (sessionId) params.append('session_id', sessionId);
  if (studentId) params.append('student_id', studentId);
  return apiCall('GET', `/institutions/${institutionId}/attendance/records?${params.toString()}`);
}

export async function markAttendance(
  institutionId: string,
  sessionId: string,
  studentId: string,
  status: string
): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/attendance/records`, {
    sessionId,
    studentId,
    status,
  });
}

// ============== LIVE CLASSES ==============

export async function listLiveClasses(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/live-classes`);
}

export async function createLiveClass(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/live-classes`, data);
}

export async function deleteLiveClass(liveClassId: string): Promise<any> {
  return apiCall('DELETE', `/live-classes/${liveClassId}`);
}

// ============== ANNOUNCEMENTS ==============

export async function listAnnouncements(institutionId: string, courseId?: string): Promise<any> {
  const url = courseId
    ? `/institutions/${institutionId}/announcements?course_id=${courseId}`
    : `/institutions/${institutionId}/announcements`;
  return apiCall('GET', url);
}

export async function createAnnouncement(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/announcements`, data);
}

export async function deleteAnnouncement(announcementId: string): Promise<any> {
  return apiCall('DELETE', `/announcements/${announcementId}`);
}

// ============== DISCUSSIONS ==============

export async function listDiscussions(institutionId: string, courseId?: string): Promise<any> {
  const url = courseId
    ? `/institutions/${institutionId}/discussions?course_id=${courseId}`
    : `/institutions/${institutionId}/discussions`;
  return apiCall('GET', url);
}

export async function createDiscussion(institutionId: string, courseId: string, title: string): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/discussions`, { courseId, title });
}

export async function listDiscussionPosts(institutionId: string, discussionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/discussions/${discussionId}/posts`);
}

export async function createDiscussionPost(institutionId: string, discussionId: string, content: string): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/discussions/${discussionId}/posts`, { content });
}

export async function deleteDiscussionPost(institutionId: string, discussionId: string, postId: string): Promise<any> {
  return apiCall('DELETE', `/institutions/${institutionId}/discussions/${discussionId}/posts/${postId}`);
}

// ============== MESSAGES ==============

export async function listMessages(institutionId: string, peerId?: string): Promise<any> {
  const url = peerId
    ? `/institutions/${institutionId}/messages?peer_id=${peerId}`
    : `/institutions/${institutionId}/messages`;
  return apiCall('GET', url);
}

export async function sendMessage(institutionId: string, toUserId: string, content: string): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/messages`, { toUserId, content });
}

// ============== NOTIFICATIONS ==============

export async function listNotifications(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/notifications`);
}

export async function markNotificationsRead(institutionId: string): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/notifications/mark-read`);
}

// ============== PAYMENTS ==============

export async function listPayments(institutionId: string, studentId?: string): Promise<any> {
  const url = studentId
    ? `/institutions/${institutionId}/payments?student_id=${studentId}`
    : `/institutions/${institutionId}/payments`;
  return apiCall('GET', url);
}

export async function createPayment(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/payments`, data);
}

// ============== INVOICES ==============

export async function listInvoices(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/invoices`);
}

export async function generateInvoice(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/invoices`, data);
}

// ============== REFUNDS ==============

export async function listRefunds(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/refunds`);
}

export async function requestRefund(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/refunds`, data);
}

export async function processRefund(refundId: string, status: string): Promise<any> {
  return apiCall('PATCH', `/refunds/${refundId}`, { status });
}

// ============== CERTIFICATES ==============

export async function listCertificates(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/certificates`);
}

export async function generateCertificate(institutionId: string, studentId: string, courseId: string): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/certificates`, { studentId, courseId });
}

// ============== TIMETABLE ==============

export async function getTimetable(institutionId: string, teacherId?: string): Promise<any> {
  const url = teacherId
    ? `/institutions/${institutionId}/timetable?teacher_id=${teacherId}`
    : `/institutions/${institutionId}/timetable`;
  return apiCall('GET', url);
}

export async function createTimetableEntry(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/timetable`, data);
}

export async function deleteTimetableEntry(timetableId: string): Promise<any> {
  return apiCall('DELETE', `/timetable/${timetableId}`);
}

// ============== INVITES ==============

export async function listInvites(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/invites`);
}

export async function inviteUser(institutionId: string, data: { email: string; role: string; fullName?: string }): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/invites`, data);
}

export async function deleteInvite(institutionId: string, inviteId: string): Promise<any> {
  return apiCall('DELETE', `/institutions/${institutionId}/invites/${inviteId}`);
}

export async function getInviteByToken(token: string): Promise<any> {
  return fetch(`${API_BASE}/public/invites/by-token/${token}`).then(r => r.json());
}

export async function acceptInvite(institutionId: string, inviteId: string): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/invites/${inviteId}/accept`, {});
}

// ============== APPLICATIONS ==============

export async function listApplications(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/applications`);
}

export async function applyToInstitution(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/applications`, data);
}

export async function approveApplication(institutionId: string, appId: string): Promise<any> {
  return apiCall('PATCH', `/institutions/${institutionId}/applications/${appId}`, { status: 'approved' });
}

export async function rejectApplication(institutionId: string, appId: string): Promise<any> {
  return apiCall('PATCH', `/institutions/${institutionId}/applications/${appId}`, { status: 'rejected' });
}

// ============== MATERIALS ==============

export async function listMaterials(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/materials`);
}

export async function createMaterial(institutionId: string, data: any): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/materials`, data);
}

export async function deleteMaterial(institutionId: string, materialId: string): Promise<any> {
  return apiCall('DELETE', `/institutions/${institutionId}/materials/${materialId}`);
}

export async function incrementMaterialDownloads(institutionId: string, materialId: string): Promise<any> {
  return apiCall('POST', `/institutions/${institutionId}/materials/${materialId}/download`);
}

// ============== STORAGE ==============

export async function uploadFile(file: File, key?: string, token?: string): Promise<any> {
  const authToken = token || (await getToken());
  const formData = new FormData();
  formData.append('file', file);
  if (key) formData.append('key', key);

  const response = await fetch(`${API_BASE}/storage/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as any).error || 'Upload failed');
  }
  return data;
}

export async function deleteFile(key: string): Promise<any> {
  return apiCall('DELETE', `/storage/object?key=${encodeURIComponent(key)}`);
}

// ============== GENERIC CRUD ==============

export async function readRecords(table: string): Promise<any> {
  return apiCall('GET', `/records/${table}`);
}

export async function createRecord(table: string, data: any): Promise<any> {
  return apiCall('POST', `/records/${table}`, data);
}

export async function updateRecord(table: string, data: any, query: any): Promise<any> {
  return apiCall('PATCH', `/records/${table}`, { data, query });
}

export async function deleteRecord(table: string, query: any): Promise<any> {
  return apiCall('DELETE', `/records/${table}`, query);
}

// ============== DASHBOARD ==============

export async function getDashboardStats(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/dashboard`);
}

// ============== REPORTS ==============

export async function getFinancialReport(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/reports/financial`);
}

export async function getAttendanceReport(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/reports/attendance`);
}

export async function getEnrollmentReport(institutionId: string): Promise<any> {
  return apiCall('GET', `/institutions/${institutionId}/reports/enrollment`);
}
