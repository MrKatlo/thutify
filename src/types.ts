export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  photoURL?: string;
  createdAt: any;
  // Student specific fields
  courseEnrolled?: string;
  enrollmentDate?: any;
  paymentStatus?: 'paid' | 'partial' | 'unpaid';
  progress?: number; // 0-100
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName?: string;
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
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  amountPaid: number;
  totalAmount: number;
  balanceRemaining: number;
  paymentDate: any;
  paymentMethod: string;
  referenceNumber: string;
  status: 'paid' | 'partial' | 'unpaid';
}

export interface FinancialReport {
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalAmountExpected: number;
  totalAmountReceived: number;
  outstandingBalance: number;
}
