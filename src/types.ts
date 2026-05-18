export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdBy: string;
  createdAt: any;
  lastLogin?: any;
  photoURL?: string;
}

export interface StudentProfile {
  userId: string;
  studentNumber: string;
  phone: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  totalFee: number;
  amountPaid: number;
  balance: number;
  academicStatus: 'active' | 'probation' | 'graduated' | 'withdrawn';
}

export interface TeacherProfile {
  userId: string;
  employeeNumber: string;
  phone: string;
  assignedCourses: string[]; // Array of course IDs
  department: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string; // Primary teacher/coordinator
  status: 'active' | 'archived' | 'draft';
  fee: number;
  createdAt: any;
  modules?: Module[];
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  content: string; // Markdown or HTML
  materials?: string[]; // URLs to materials
  completedBy?: string[]; // Array of student UIDs
  videoUrl?: string;
  published?: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: any;
}

export interface UserInvite {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  assignedCourses?: string[];
  token: string;
  status: 'pending' | 'used' | 'expired';
  expiresAt: any;
  createdBy: string;
  pendingUserId?: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  courseId: string;
  amountPaid: number;
  totalFee: number;
  balance: number;
  paymentDate: any;
  paymentMethod: string;
  referenceNumber: string;
  status: 'paid' | 'partial' | 'unpaid';
}

export interface Announcement {
  id?: string;
  content: string;
  authorId: string;
  authorName: string;
  courseId: string; // Can be 'global' or a specific course ID
  createdAt: any;
}
