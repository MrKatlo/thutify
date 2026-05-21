import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { 
  Users, Plus, Search, Edit2, Trash2, Eye, Lock, Unlock, Shield,
  AlertCircle, Loader2, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { readRecords, updateRecord } from '../services/cfApi';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'owner' | 'teacher' | 'student';
  status: 'active' | 'suspended' | 'pending';
  institution_id: string;
  created_at: string;
}

interface Role {
  name: string;
  permissions: string[];
  description: string;
}

const ROLES: Record<string, Role> = {
  admin: {
    name: 'Institution Admin',
    permissions: ['manage-users', 'manage-courses', 'manage-content', 'view-reports', 'manage-finance', 'manage-announcements'],
    description: 'Full control over institution settings and users'
  },
  teacher: {
    name: 'Teacher',
    permissions: ['create-course', 'grade-assignments', 'manage-content', 'view-roster'],
    description: 'Can create and manage courses, grade assignments'
  },
  student: {
    name: 'Student',
    permissions: ['view-courses', 'submit-assignments', 'view-grades'],
    description: 'Can view courses and submit assignments'
  },
  owner: {
    name: 'Institution Owner',
    permissions: ['manage-all', 'manage-admins', 'manage-finance', 'view-all-reports', 'system-settings'],
    description: 'Complete platform access'
  },
};

export function UserManagement() {
  const { profile, institution } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load users from database
  const loadUsers = async () => {
    if (!institution?.id) return;
    setLoading(true);
    try {
      const result = await readRecords('users');
      const usersData = (result.results || []).filter((u: any) => u.institution_id === institution.id);
      
      setUsers(usersData);
      applyFilters(usersData, searchTerm, filterRole);
    } catch (err) {
      console.error('Error loading users:', err);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [institution?.id]);

  const applyFilters = (data: UserProfile[], search: string, role: string) => {
    let filtered = data;

    if (search) {
      filtered = filtered.filter(u =>
        u.display_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (role !== 'all') {
      filtered = filtered.filter(u => u.role === role);
    }

    setFilteredUsers(filtered);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(users, term, filterRole);
  };

  const handleFilterRole = (role: 'all' | 'admin' | 'teacher' | 'student') => {
    setFilterRole(role);
    applyFilters(users, searchTerm, role);
  };

  const handleChangeRole = async (user: UserProfile, newRole: string) => {
    try {
      await updateRecord('users', { role: newRole }, { id: user.id });
      
      const updated = users.map(u =>
        u.id === user.id ? { ...u, role: newRole as any } : u
      );
      setUsers(updated);
      applyFilters(updated, searchTerm, filterRole);
      setSelectedUser(null);
      showToast(`User role changed to ${newRole}!`, 'success');
    } catch (err) {
      console.error('Error updating role:', err);
      showToast('Failed to update role', 'error');
    }
  };

  const handleUpdateStatus = async (user: UserProfile, newStatus: 'active' | 'suspended') => {
    try {
      await updateRecord('users', { status: newStatus }, { id: user.id });
      
      const updated = users.map(u =>
        u.id === user.id ? { ...u, status: newStatus } : u
      );
      setUsers(updated);
      applyFilters(updated, searchTerm, filterRole);
      showToast(`User ${newStatus}!`, 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Failed to update status', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    students: users.filter(u => u.role === 'student').length,
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
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 text-sm mt-1">Manage user roles and permissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase">Admins</p>
              <h3 className="text-2xl font-bold text-purple-900 mt-1">{stats.admins}</h3>
            </div>
            <div className="w-10 h-10 bg-purple-200 text-purple-700 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-700 uppercase">Teachers</p>
              <h3 className="text-2xl font-bold text-orange-900 mt-1">{stats.teachers}</h3>
            </div>
            <div className="w-10 h-10 bg-orange-200 text-orange-700 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase">Students</p>
              <h3 className="text-2xl font-bold text-green-900 mt-1">{stats.students}</h3>
            </div>
            <div className="w-10 h-10 bg-green-200 text-green-700 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

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
          {(['all', 'admin', 'teacher', 'student'] as const).map(role => (
            <button
              key={role}
              onClick={() => handleFilterRole(role)}
              className={`px-4 py-2 rounded-lg font-medium text-xs uppercase transition-all ${
                filterRole === role
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">
                          {user.display_name[0]}
                        </div>
                        <span className="font-medium text-gray-900">{user.display_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleUpdateStatus(user, 'suspended')}
                            className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                            title="Suspend"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(user, 'active')}
                            className="p-2 text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg transition-all"
                            title="Activate"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{selectedUser.display_name}</h2>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Current Role</label>
                  <p className="text-lg font-semibold mt-1">{selectedUser.role}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">Change Role To:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(ROLES).map(role => (
                      <button
                        key={role}
                        onClick={() => handleChangeRole(selectedUser, role)}
                        disabled={selectedUser.role === role}
                        className={`px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                          selectedUser.role === role
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Permissions</label>
                  <div className="mt-2 space-y-1">
                    {ROLES[selectedUser.role]?.permissions.map(perm => (
                      <div key={perm} className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-green-500" />
                        <span className="text-gray-600 capitalize">{perm.replace('-', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setSelectedUser(null)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
