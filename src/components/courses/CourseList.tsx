import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../ui/Card';
import { 
  Plus, 
  BookOpen, 
  User, 
  Edit, 
  Trash2, 
  ChevronRight, 
  X, 
  DollarSign, 
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CourseDetail } from './CourseDetail';
import * as cfApi from '../../services/cfApi';

export function CourseList() {
  const { profile, institutionId } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [viewingCourse, setViewingCourse] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTeacherId, setAssignedTeacherId] = useState('');
  const [fee, setFee] = useState<number>(0);
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('draft');

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';

  useEffect(() => {
    fetchData();
  }, [profile, institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [fetchedCourses, fetchedTeachers] = await Promise.all([
        cfApi.listCourses(institutionId),
        cfApi.getInstitutionMembers(institutionId, 'teacher')
      ]);
      
      setTeachers(fetchedTeachers);
      
      if (profile?.role === 'student') {
        const enrollments = await cfApi.listEnrollments(institutionId, undefined, profile.uid);
        const enrolledIds = enrollments.map((e: any) => e.course_id);
        setCourses(fetchedCourses.filter((c: any) => enrolledIds.includes(c.id)));
      } else if (profile?.role === 'teacher') {
        setCourses(fetchedCourses.filter((c: any) => c.teacher_id === profile.uid));
      } else {
        setCourses(fetchedCourses);
      }
    } catch (error) {
      console.error("Fetch courses failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignedTeacherId('');
    setFee(0);
    setStatus('draft');
    setIsEditing(false);
    setSelectedCourse(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !institutionId) return;

    try {
      const courseData = {
        title,
        description,
        teacher_id: assignedTeacherId,
        fee: Number(fee),
        status,
      };

      if (isEditing && selectedCourse) {
        await cfApi.updateCourse(selectedCourse.id, courseData);
      } else {
        await cfApi.createCourse(institutionId, courseData);
      }
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error("Save course failed:", error);
    }
  };

  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setTitle(course.title);
    setDescription(course.description);
    setAssignedTeacherId(course.teacher_id);
    setFee(course.fee);
    setStatus(course.status);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await cfApi.deleteCourse(courseId);
      fetchData();
    } catch (error) {
      console.error("Delete course failed:", error);
    }
  };

  if (viewingCourse) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <CourseDetail 
          course={viewingCourse} 
          onBack={() => {
            setViewingCourse(null);
            fetchData();
          }} 
          onUpdate={fetchData}
          role={profile?.role || 'student'}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Institutional Courses</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            {profile?.role === 'student' ? 'Your enrolled courses and academic content.' : 'Manage the institutional curriculum and assignments.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Create Course
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : courses.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white border border-dashed border-gray-200 rounded-3xl">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {profile?.role === 'student' ? 'No Enrolled Courses' : 'No Courses Found'}
            </h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2 italic text-sm">
              {profile?.role === 'student' ? 'You are not currently enrolled in any courses. Please contact the administrator.' : 'Get started by creating the first institutional course.'}
            </p>
          </div>
        ) : (
          courses.map((course) => (
            <motion.div key={course.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="h-full flex flex-col group relative overflow-hidden hover:shadow-xl hover:border-black/5 transition-all">
                <div className="mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform ${course.status === 'active' ? 'bg-black' : 'bg-gray-100'}`}>
                    <BookOpen className={`w-6 h-6 ${course.status === 'active' ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3 mb-4">{course.description}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Instructor</span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <User className="w-3 h-3" />
                      {profile?.role === 'teacher' && course.teacher_id === profile.uid ? 'You' : (teachers.find(t => t.uid === course.teacher_id)?.full_name || 'Assigned Staff')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <button onClick={() => handleEdit(course)} className="p-2 text-gray-400 hover:text-black transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(course.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                    <button onClick={() => setViewingCourse(course)} className="flex items-center gap-1 text-xs font-bold text-black bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-black hover:text-white transition-all">
                      Open <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {course.status !== 'active' && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold uppercase border border-amber-100">
                    <Lock className="w-3 h-3" /> {course.status}
                  </div>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">{isEditing ? 'Update Course' : 'Create Course'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Title</label>
                  <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black" />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none h-24 focus:ring-2 focus:ring-black" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Teacher</label>
                    <select required value={assignedTeacherId} onChange={(e) => setAssignedTeacherId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none">
                      <option value="">Select Teacher</option>
                      {teachers.map(t => <option key={t.uid} value={t.uid}>{t.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Fee ($)</label>
                    <input type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Status</label>
                  <div className="flex gap-2 mt-2">
                    {['draft', 'active', 'archived'].map((s) => (
                      <button key={s} type="button" onClick={() => setStatus(s as any)} className={`flex-1 py-2 text-[10px] font-bold rounded-lg border-2 uppercase tracking-wider ${status === s ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'}`}>{s}</button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 py-3">Cancel</Button>
                  <Button type="submit" className="flex-[2] py-3 bg-black text-white">{isEditing ? 'Save Changes' : 'Create Course'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
