import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { 
  Users, Plus, Search, Edit2, Trash2, Eye, Mail, MapPin, 
  Award, Calendar, CheckCircle, AlertCircle, Loader2, Star,
  Filter, Download, Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createRecord, readRecords, updateRecord, deleteRecord } from '../services/cfApi';

interface Teacher {
  id: string;
  email: string;
  display_name: string;
  profile_picture?: string;
  institution_id: string;
  status: 'active' | 'suspended' | 'pending';
  specialization?: string;
  created_at: string;
  courses_count?: number;
  rating?: number;
}

export function TeacherManagement() {
  const { profile, institution } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    specialization: '',
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load teachers from database
  const loadTeachers = async () => {
    if (!institution?.id) return;
    setLoading(true);
    try {
      const result = await readRecords('users');
      const usersData = (result.results || []).filter((u: any) => u.role === 'teacher');
      
      const teachersData: Teacher[] = usersData.map((user: any) => ({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        profile_picture: user.profile_picture,
        institution_id: institution.id,
        status: user.status || 'active',
        specialization: user.specialization || '',
        created_at: user.created_at || new Date().toISOString(),
        courses_count: 0,
        rating: 4.5,
      }));

      setTeachers(teachersData);
      applyFilters(teachersData, searchTerm, filterStatus);
    } catch (err) {
      console.error('Error loading teachers:', err);
      showToast('Failed to load teachers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, [institution?.id]);

  const applyFilters = (data: Teacher[], search: string, status: string) => {
    let filtered = data;

    if (search) {
      filtered = filtered.filter(t =>
        t.display_name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        (t.specialization?.toLowerCase().includes(search.toLowerCase()) || false)
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }

    setFilteredTeachers(filtered);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(teachers, term, filterStatus);
  };

  const handleFilterStatus = (status: 'all' | 'active' | 'pending' | 'suspended') => {
    setFilterStatus(status);
    applyFilters(teachers, searchTerm, status);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution?.id) return;

    try {
      const newTeacher = {
        id: `teacher-${Date.now()}`,
        email: formData.email,
        display_name: formData.display_name,
        specialization: formData.specialization,
        role: 'teacher',
        institution_id: institution.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      await createRecord('users', newTeacher);

      setFormData({ email: '', display_name: '', specialization: '' });
      setShowAddForm(false);
      showToast('Teacher added successfully! Waiting for approval.', 'success');
      loadTeachers();
    } catch (err) {
      console.error('Error adding teacher:', err);
      showToast('Failed to add teacher', 'error');
    }
  };

  const handleUpdateStatus = async (teacher: Teacher, newStatus: 'active' | 'suspended' | 'pending') => {
    try {
      await updateRecord('users', { status: newStatus }, { id: teacher.id });
      
      const updated = teachers.map(t =>
        t.id === teacher.id ? { ...t, status: newStatus } : t
      );
      setTeachers(updated);
      applyFilters(updated, searchTerm, filterStatus);
      showToast(`Teacher ${newStatus}!`, 'success');
    } catch (err) {
      console.error('Error updating teacher:', err);
      showToast('Failed to update teacher', 'error');
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (!window.confirm(`Delete ${teacher.display_name}? This cannot be undone.`)) return;

    try {
      await deleteRecord('users', { id: teacher.id });

      const updated = teachers.filter(t => t.id !== teacher.id);
      setTeachers(updated);
      applyFilters(updated, searchTerm, filterStatus);
      showToast('Teacher deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting teacher:', err);
      showToast('Failed to delete teacher', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.status === 'active').length,
    pending: teachers.filter(t => t.status === 'pending').length,
    suspended: teachers.filter(t => t.status === 'suspended').length,
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
          <h1 className="text-3xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-600 text-sm mt-1">Manage and monitor all teaching staff</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Teacher
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Teachers</p>
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

        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-yellow-700 uppercase">Pending</p>
              <h3 className="text-2xl font-bold text-yellow-900 mt-1">{stats.pending}</h3>
            </div>
            <div className="w-10 h-10 bg-yellow-200 text-yellow-700 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
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
              <Lock className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add Teacher Modal */}
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
              <h2 className="text-xl font-bold mb-4">Add New Teacher</h2>
              <form onSubmit={handleAddTeacher} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="Dr. Jane Smith"
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
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Specialization</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="Mathematics, Physics, etc."
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
                    Add Teacher
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
            placeholder="Search by name, email, or specialization..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'pending', 'suspended'] as const).map(status => (
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

      {/* Teachers Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No teachers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Courses</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTeachers.map((teacher) => (
                  <motion.tr
                    key={teacher.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                          {teacher.display_name[0]}
                        </div>
                        <span className="font-medium text-gray-900">{teacher.display_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.specialization || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.courses_count || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold">{teacher.rating || 4.5}</span>
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        teacher.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : teacher.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {teacher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {teacher.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(teacher, 'active')}
                            className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all"
                          >
                            Approve
                          </button>
                        )}
                        {teacher.status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(teacher, 'suspended')}
                            className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                            title="Suspend"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTeacher(teacher)}
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
