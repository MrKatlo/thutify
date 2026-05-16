export type UserRole = 'admin' | 'tutor' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  phone?: string;
  role: UserRole;
  photoURL?: string;
  createdAt: any;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  tutorId: string;
  tutorName?: string;
  createdAt: any;
}

export interface TutoringSession {
  id: string;
  courseId: string;
  courseTitle?: string;
  tutorId: string;
  startTime: any;
  endTime: any;
  studentIds: string[];
  notes?: string;
}

export interface Announcement {
  id: string;
  courseId: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: any;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: any;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName?: string;
  courseId?: string;
  amount: number;
  amountPaid: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  dueDate: any;
  paidAt?: any;
  method?: string;
  reference?: string;
  description: string;
}
