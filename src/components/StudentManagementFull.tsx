import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { 
  Users, Plus, Search, Edit2, Trash2, Eye, Mail, MapPin, 
  Award, Calendar, CheckCircle, AlertCircle, Loader2, ChevronRight,
  Filter, Download, Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createRecord, readRecords, updateRecord, deleteRecord } from '../services/cfApi';

interface Student {
  id: string;
  email: string;
  display_name: string;
  profile_picture?: string;
  institution_id: string;
  status: 'active' | 'suspended' | 'inactive';
  enrollment_date: string;
  progress_percentage: number;
}

export function StudentManagement() {
  const { profile, institution } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    password: '',
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load students from database
  const loadStudents = async () => {
    if (!institution?.id) return;
    setLoading(true);
    try {
      const result = await readRecords('enrollments');
      const enrollmentsData = result.results || [];
      
      // Fetch user details for each enrollment
      const studentsData = await Promise.all(
        enrollmentsData.map(async (enrollment: any) => {
          const userResult = await readRecords('users');
          const user = userResult.results.find((u: any) => u.id === enrollment.student_id);
          return {
            id: enrollment.student_id,
            email: user?.email || '',
            display_name: user?.display_name || '',
            profile_picture: user?.profile_picture,
            institution_id: institution.id,
            status: 'active' as const,
            enrollment_date: enrollment.enrollment_date,
            progress_percentage: enrollment.progress_percentage || 0,
          };
        })
      );

      setStudents(studentsData);
      applyFilters(studentsData, searchTerm, filterStatus);
    } catch (err) {
      console.error('Error loading students:', err);
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [institution?.id]);

  const applyFilters = (data: Student[], search: string, status: string) => {
    let filtered = data;

    if (search) {
      filtered = filtered.filter(s =>
        s.display_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(s => s.status === status);
    }

    setFilteredStudents(filtered);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(students, term, filterStatus);
  };

  const handleFilterStatus = (status: 'all' | 'active' | 'suspended') => {
    setFilterStatus(status);
    applyFilters(students, searchTerm, status);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution?.id) return;

    try {
      const newStudent = {
        id: `student-${Date.now()}`,
        email: formData.email,
        display_name: formData.display_name,
        institution_id: institution.id,
        status: 'active',
      };

      await createRecord('users', newStudent);

      const enrollment = {
        id: `enrollment-${Date.now()}`,
        course_id: 'general',
        student_id: newStudent.id,
        enrollment_date: new Date().toISOString(),
        progress_percentage: 0,
        status: 'active',
      };

      await createRecord('enrollments', enrollment);

      setFormData({ email: '', display_name: '', password: '' });
      setShowAddForm(false);
      showToast('Student added successfully!', 'success');
      loadStudents();
    } catch (err) {
      console.error('Error adding student:', err);
      showToast('Failed to add student', 'error');
    }
  };

  const handleUpdateStatus = async (student: Student, newStatus: 'active' | 'suspended') => {
    try {
      await updateRecord('users', { status: newStatus }, { id: student.id });
      
      const updated = students.map(s =>
        s.id === student.id ? { ...s, status: newStatus } : s
      );
      setStudents(updated);
      applyFilters(updated, searchTerm, filterStatus);
      showToast(`Student ${newStatus}!`, 'success');
    } catch (err) {
      console.error('Error updating student:', err);
      showToast('Failed to update student', 'error');
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!window.confirm(`Delete ${student.display_name}? This cannot be undone.`)) return;

    try {
      await deleteRecord('users', { id: student.id });
      await deleteRecord('enrollments', { student_id: student.id });

      const updated = students.filter(s => s.id !== student.id);
      setStudents(updated);
      applyFilters(updated, searchTerm, filterStatus);
      showToast('Student deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting student:', err);
      showToast('Failed to delete student', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    suspended: students.filter(s => s.status === 'suspended').length,
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 px-4 py-3 rounded-lg text-white font-medium text-sm ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600 text-sm mt-1">Manage and monitor all enrolled students</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Student
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Students</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase">Active</p>
              <h3 className="text-2xl font-bold text-green-900 mt-1">{stats.active}</h3>
            </div>
            <div className="w-10 h-10 bg-green-200 text-green-700 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase">Suspended</p>
              <h3 className="text-2xl font-bold text-red-900 mt-1">{stats.suspended}</h3>
            </div>
            <div className="w-10 h-10 bg-red-200 text-red-700 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <h2 className="text-xl font-bold mb-4">Add New Student</h2>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="john@example.com"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Add Student
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'suspended'] as const).map(status => (
            <button
              key={status}
              onClick={() => handleFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium text-xs uppercase transition-all ${
                filterStatus === status
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Students Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">
                          {student.display_name[0]}
                        </div>
                        <span className="font-medium text-gray-900">{student.display_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-black"
                            style={{ width: `${student.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{student.progress_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {student.status === 'active' ? (
                          <button
                            onClick={() => handleUpdateStatus(student, 'suspended')}
                            className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                            title="Suspend"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(student, 'active')}
                            className="p-2 text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg transition-all"
                            title="Activate"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
