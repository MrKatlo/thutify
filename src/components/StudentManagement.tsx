import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button, Card } from './ui/Card';
import {
  Search,
  Plus,
  Mail,
  Phone,
  Trash2,
  Edit,
  X,
  ShieldAlert,
  CheckCircle,
  GraduationCap,
  BookOpen,
  Loader2,
  Filter,
  UserPlus,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Course } from '../types';
import * as cfApi from '../services/cfApi';

export function StudentManagement() {
  const { profile, isAdmin, institutionId } = useAuth();

  // Data lists
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Modal states
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollingUserId, setEnrollingUserId] = useState<string | null>(null);
  const [enrollingUserName, setEnrollingUserName] = useState<string>('');
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  // Enrollment Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [studentNumber, setStudentNumber] = useState('');

  useEffect(() => {
    fetchData();
  }, [profile, institutionId]);

  const fetchData = async () => {
    if (!profile || !institutionId) return;
    setLoading(true);
    try {
      // 1. Fetch Courses
      const courseList = await cfApi.listCourses(institutionId);
      setCourses(courseList);

      // 2. Fetch Institutional Students (members with role='student')
      const members = await cfApi.getInstitutionMembers(institutionId, 'student');
      setAvailableStudents(members);

      // 3. Fetch Enrollments
      const enrollments = await cfApi.listEnrollments(institutionId);

      // 4. Combine data
      const combined = enrollments
        .map((enroll: any) => {
          const student = members.find((m: any) => m.user_id === enroll.student_id);
          const course = courseList.find((c: any) => c.id === enroll.course_id);
          return {
            id: enroll.id,
            enrollment: enroll,
            student: student,
            course: course
          };
        })
        .filter((s: any) => s.student);

      setStudents(combined);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrollingUserId || !selectedCourseId || !institutionId) return;

    try {
      setLoading(true);
      await cfApi.enrollCourse(institutionId, selectedCourseId, enrollingUserId);
      setShowEnrollModal(false);
      setEnrollingUserId(null);
      setEnrollingUserName('');
      setSelectedCourseId('');
      setStudentNumber('');
      fetchData();
    } catch (error) {
      console.error('Error enrolling student:', error);
      alert('Failed to enroll student');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to drop this student from the course?')) return;
    try {
      await cfApi.unenrollCourse(enrollmentId);
      fetchData();
    } catch (error) {
      console.error('Error dropping student:', error);
      alert('Failed to drop student');
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.student?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.student?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === 'all' || s.course?.id === courseFilter;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Student Enrollment</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            {profile?.role === 'admin' ? 'Manage institutional enrollments and academic records.' : 'Track students enrolled in your assigned courses.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowEnrollModal(true)} className="gap-2 bg-black text-white hover:bg-gray-800">
            <UserPlus className="w-4 h-4" /> Enroll Student
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1 border border-gray-100 rounded-xl shadow-sm">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-gray-600 focus:ring-0 outline-none"
          >
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Enrolled Course</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Financials</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" /></td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium italic">No enrollments found.</td></tr>
              ) : filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {s.student?.full_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{s.student?.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.student?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{s.course?.title}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Fee: ${s.course?.fee || 0}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      s.enrollment?.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' :
                      s.enrollment?.status === 'suspended' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {s.enrollment?.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                      <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-green-600">Pending</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <button onClick={() => handleDrop(s.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enrollment Modal */}
      <AnimatePresence>
        {showEnrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowEnrollModal(false); setEnrollingUserId(null); setEnrollingUserName(''); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 overflow-hidden">
              {!enrollingUserId ? (
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-6">Select Student</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {availableStudents.map(user => (
                      <button
                        key={user.user_id}
                        onClick={() => {
                          setEnrollingUserId(user.user_id);
                          setEnrollingUserName(user.full_name || user.email);
                        }}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-transparent hover:border-gray-200 text-left"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEnroll} className="space-y-6">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center font-bold text-white text-lg">
                      {enrollingUserName?.[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Enroll Student</h2>
                      <p className="text-sm text-gray-500">{enrollingUserName}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Select Course</label>
                    <div className="grid grid-cols-1 gap-2">
                      {courses.map(course => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => setSelectedCourseId(course.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            selectedCourseId === course.id ? 'border-black bg-black/5' : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            <span className={`text-sm font-bold ${selectedCourseId === course.id ? 'text-black' : 'text-gray-600'}`}>{course.title}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-400">${course.fee}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button variant="outline" onClick={() => setEnrollingUserId(null)} className="flex-1 py-3">Back</Button>
                    <Button type="submit" disabled={!selectedCourseId || loading} className="flex-[2] py-3 bg-black text-white">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Enrollment'}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StudentManagement() {
  const { profile, isAdmin, institutionId } = useAuth();
  
  // Data lists
  const [students, setStudents] = useState<any[]>([]); // Combined view
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Modal states
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollingUser, setEnrollingUser] = useState<UserProfile | null>(null);
  const [availableStudents, setAvailableStudents] = useState<UserProfile[]>([]);

  // Enrollment Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [studentNumber, setStudentNumber] = useState('');

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile || !institutionId) return;
    setLoading(true);
    try {
      // 1. Fetch Courses
      const courseSnap = await getDocs(query(collection(db, 'courses'), where('institutionId', '==', institutionId)));
      const courseList = courseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setCourses(courseList);

      // 2. Fetch Institutional Students
      const instUserSnap = await getDocs(query(collection(db, 'institutionUsers'), where('institutionId', '==', institutionId), where('role', '==', 'student')));
      const studentUids = new Set(instUserSnap.docs.map(d => d.data().userId));
      
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const studentUsers = allUsersSnap.docs
        .filter(d => studentUids.has(d.id))
        .map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setAvailableStudents(studentUsers);

      // 3. Fetch Enrollments and Profiles
      let enrollments: Enrollment[] = [];
      if (isAdmin) {
        const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('institutionId', '==', institutionId)));
        enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      } else if (profile.role === 'teacher') {
        // Teachers see students in their courses
        const myCoursesSnap = await getDocs(query(collection(db, 'courses'), where('teacherId', '==', profile.uid)));
        const myCourseIds = myCoursesSnap.docs.map(d => d.id);
        
        if (myCourseIds.length > 0) {
          const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', myCourseIds)));
          enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
        }
      }

      // 4. Join Data for the list
      const combined = await Promise.all(enrollments.map(async (enroll) => {
        const studentUser = studentUsers.find(u => u.uid === enroll.studentId);
        const course = courseList.find(c => c.id === enroll.courseId);
        
        // Fetch student-specific profile info
        const profileSnap = await getDoc(doc(db, 'students', enroll.studentId));
        const studentInfo = profileSnap.exists() ? profileSnap.data() as StudentProfile : null;

        return {
          id: enroll.id,
          enrollment: enroll,
          user: studentUser,
          course: course,
          profile: studentInfo
        };
      }));

      setStudents(combined.filter(s => s.user)); // Filter out any deleted users
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrollingUser || !selectedCourseId) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);

      // 1. Create Enrollment
      const enrollmentId = `${enrollingUser.uid}_${selectedCourseId}`;
      const enrollRef = doc(db, 'enrollments', enrollmentId);
      batch.set(enrollRef, {
        studentId: enrollingUser.uid,
        courseId: selectedCourseId,
        institutionId,
        status: 'active',
        enrolledAt: serverTimestamp()
      });

      // 2. Ensure Student Profile exists and has correct total fee / balance
      const studentProfileRef = doc(db, 'students', enrollingUser.uid);
      const profileSnap = await getDoc(studentProfileRef);
      const courseFee = Number(courses.find(c => c.id === selectedCourseId)?.fee || 0);
      
      if (!profileSnap.exists()) {
        batch.set(studentProfileRef, {
          userId: enrollingUser.uid,
          studentNumber: studentNumber || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: '',
          paymentStatus: 'unpaid',
          totalFee: courseFee,
          amountPaid: 0,
          balance: courseFee,
          academicStatus: 'active'
        });
      } else {
        const currentData = profileSnap.data();
        const updatedTotalFee = Number(currentData.totalFee || 0) + courseFee;
        const updatedBalance = Number(currentData.balance || 0) + courseFee;
        const amountPaid = Number(currentData.amountPaid || 0);
        batch.update(studentProfileRef, {
          totalFee: updatedTotalFee,
          balance: updatedBalance,
          paymentStatus: amountPaid >= updatedTotalFee ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid'
        });
      }

      await batch.commit();
      setShowEnrollModal(false);
      setEnrollingUser(null);
      setSelectedCourseId('');
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (enrollId: string) => {
    if (!confirm('Are you sure you want to drop this student from the course?')) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Delete enrollment
      batch.delete(doc(db, 'enrollments', enrollId));

      // 2. Adjust Student Profile balance & total fee
      const [studentId, courseId] = enrollId.split('_');
      const studentProfileRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentProfileRef);
      const courseSnap = await getDoc(doc(db, 'courses', courseId));

      if (studentSnap.exists() && courseSnap.exists()) {
        const studentData = studentSnap.data();
        const courseFee = Number(courseSnap.data().fee || 0);
        
        const updatedTotalFee = Math.max(0, Number(studentData.totalFee || 0) - courseFee);
        const updatedBalance = Math.max(0, Number(studentData.balance || 0) - courseFee);
        const amountPaid = Number(studentData.amountPaid || 0);
        
        batch.update(studentProfileRef, {
          totalFee: updatedTotalFee,
          balance: updatedBalance,
          paymentStatus: amountPaid >= updatedTotalFee ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid'
        });
      }

      await batch.commit();
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `enrollments/${enrollId}`);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === 'all' || s.course.id === courseFilter;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Student Enrollment</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            {profile?.role === 'admin' ? 'Manage institutional enrollments and academic records.' : 'Track students enrolled in your assigned courses.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowEnrollModal(true)} className="gap-2 bg-black text-white hover:bg-gray-800">
            <UserPlus className="w-4 h-4" /> Enroll Student
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1 border border-gray-100 rounded-xl shadow-sm">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-gray-600 focus:ring-0 outline-none"
          >
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Enrolled Course</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Academic Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Financials</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" /></td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium italic">No enrollments found.</td></tr>
              ) : filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {s.user.fullName?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{s.user.fullName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">#{s.profile?.studentNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{s.course?.title}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Joined {s.enrollment.enrolledAt?.toDate ? format(s.enrollment.enrolledAt.toDate(), 'MMM dd, yyyy') : 'Recently'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      s.profile?.academicStatus === 'active' ? 'bg-green-50 text-green-600 border-green-100' :
                      s.profile?.academicStatus === 'probation' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {s.profile?.academicStatus || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                      <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                      {s.profile?.balance > 0 ? (
                        <span className="text-red-500">${s.profile.balance.toLocaleString()} Owed</span>
                      ) : (
                        <span className="text-green-600">Paid Full</span>
                      )}
                    </div>
                    <div className="w-24 h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-black transition-all" 
                        style={{ width: `${(s.profile?.amountPaid / s.profile?.totalFee) * 100 || 0}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <button onClick={() => handleDrop(s.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enrollment Modal */}
      <AnimatePresence>
        {showEnrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowEnrollModal(false); setEnrollingUser(null); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 overflow-hidden">
              {!enrollingUser ? (
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-6">Select Student</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {availableStudents.map(user => (
                      <button 
                        key={user.uid}
                        onClick={() => setEnrollingUser(user)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-transparent hover:border-gray-200 text-left"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{user.fullName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEnroll} className="space-y-6">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center font-bold text-white text-lg">
                      {enrollingUser.fullName?.[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Enroll Student</h2>
                      <p className="text-sm text-gray-500">{enrollingUser.fullName}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Student Number (Optional)</label>
                    <input 
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      placeholder="e.g. STU-2024-001"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Select Course</label>
                    <div className="grid grid-cols-1 gap-2">
                      {courses.map(course => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => setSelectedCourseId(course.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            selectedCourseId === course.id ? 'border-black bg-black/5' : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            <span className={`text-sm font-bold ${selectedCourseId === course.id ? 'text-black' : 'text-gray-600'}`}>{course.title}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-400">${course.fee}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button variant="outline" onClick={() => setEnrollingUser(null)} className="flex-1 py-3">Back</Button>
                    <Button type="submit" disabled={!selectedCourseId || loading} className="flex-[2] py-3 bg-black text-white">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Enrollment'}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
