import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button, Card } from './ui/Card';
import { Search, Mail, Phone, Edit, X, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as cfApi from '../services/cfApi';

export function TeacherManagement() {
  const { institutionId } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');

  useEffect(() => {
    fetchData();
  }, [institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      // Fetch Teachers (members with role='teacher')
      const teacherList = await cfApi.getInstitutionMembers(institutionId, 'teacher');
      setTeachers(teacherList);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setStatus('active');
    setShowForm(false);
    setSelectedTeacher(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !institutionId) return;

    try {
      setLoading(true);
      const teacherId = selectedTeacher.user_id;

      // Update teacher via institution member endpoint
      await cfApi.updateInstitutionMember(institutionId, teacherId, {
        status
      });

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating teacher:', error);
      alert('Failed to update teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setFullName(teacher.full_name || '');
    setEmail(teacher.email);
    setPhone(teacher.phone || '');
    setStatus(teacher.status || 'active');
    setShowForm(true);
  };

  const toggleStatus = async (teacher: any) => {
    const nextStatus = teacher.status === 'active' ? 'suspended' : 'active';
    if (!institutionId) return;
    try {
      await cfApi.updateInstitutionMember(institutionId, teacher.user_id, { status: nextStatus });
      fetchData();
    } catch (error) {
      console.error("Could not toggle status:", error);
    }
  };

  const filteredTeachers = teachers.filter((t: any) => {
    const matchesSearch = (t.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Teacher Management</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Manage faculty profiles and review operational status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 border border-gray-100 rounded-2xl shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teachers by name or email..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Teacher</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" />
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    No matching teacher profiles found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => (
                  <motion.tr
                    key={t.user_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                          {t.full_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{t.full_name}</p>
                          <p className="text-xs text-gray-500">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                      <p className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 opacity-60" /> {t.email}</p>
                      <p className="flex items-center gap-1 mt-1"><Phone className="w-3.5 h-3.5 opacity-60" /> {t.phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(t)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${
                          t.status === 'active' ? 'bg-green-50 text-green-700 hover:bg-orange-50 hover:text-orange-700' : 'bg-red-50 text-red-700 hover:bg-green-50 hover:text-green-700'
                        }`}
                      >
                        {t.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {(t.status || 'active').toUpperCase()}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(t)} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={resetForm} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Edit Teacher Details</h2>
                <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    disabled
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Address (Read-only)</label>
                    <input
                      type="email"
                      readOnly
                      value={email}
                      className="w-full px-3 py-2 border border-gray-100 bg-gray-50 rounded-xl focus:outline-none text-sm text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Faculty Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-6">
                  <Button variant="outline" type="button" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={loading} className="bg-black text-white hover:bg-gray-800">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
