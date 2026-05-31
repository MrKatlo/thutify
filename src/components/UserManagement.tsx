import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserProfile, UserInvite, UserRole, UserStatus } from '../types';
import { useToast } from './ui/Toast';
import { Card, Button } from './ui/Card';
import { 
  UserPlus, 
  Users, 
  Mail, 
  Search, 
  Plus, 
  X, 
  UserMinus, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Trash2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import * as cfApi from '../services/cfApi';

export function UserManagement() {
  const { profile, institutionId } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'users' | 'invites' | 'applications'>('users');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('student');
  const [applications, setApplications] = useState<any[]>([]);
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [institutionId, view]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      if (view === 'users') {
        const list = await cfApi.getInstitutionMembers(institutionId);
        setUsers(list);
      } else if (view === 'invites') {
        const list = await cfApi.listInvites(institutionId);
        setInvites(list);
      } else if (view === 'applications') {
        const list = await cfApi.listApplications(institutionId);
        setApplications(list);
      }
    } catch (error) {
      console.error("Fetch management error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    setLoading(true);
    try {
      await cfApi.inviteUser(institutionId, {
        email: inviteEmail,
        fullName: inviteFullName,
        role: inviteRole
      });

      if (activeApplicationId) {
        await cfApi.approveApplication(institutionId, activeApplicationId);
      }
      
      setInviteEmail('');
      setInviteFullName('');
      setShowInviteForm(false);
      setActiveApplicationId(null);
      fetchData();
      toast.success('Invite sent successfully!');
    } catch (error) {
      console.error("Create invite error:", error);
      toast.error('Could not send invite.');
    } finally {
      setLoading(false);
    }
  };

  const closeInviteModal = () => {
    setShowInviteForm(false);
    setActiveApplicationId(null);
    setInviteEmail('');
    setInviteFullName('');
  };

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    if (!institutionId) return;
    try {
      await cfApi.updateInstitutionMember(institutionId, userId, { status: newStatus });
      fetchData();
    } catch (error) {
      console.error("Update status error:", error);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!institutionId) return;
    if (!confirm('Are you sure you want to cancel this invite?')) return;
    try {
      await cfApi.deleteInvite(institutionId, inviteId);
      fetchData();
    } catch (error) {
      console.error("Delete invite error:", error);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/auth?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard!');
  };

  const handleApproveApplication = (app: any) => {
    if (!institutionId) return;
    setLoading(true);
    cfApi.approveApplication(institutionId, app.id)
      .then(() => fetchData())
      .catch((error) => {
        console.error("Approve application error:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleRejectApplication = async (appId: string) => {
    if (!institutionId) return;
    if (!confirm('Are you sure you want to reject this application?')) return;
    try {
      await cfApi.rejectApplication(institutionId, appId);
      fetchData();
    } catch (error) {
      console.error("Reject application error:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApplications = applications.filter(app => 
    (app.fullName || app.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (app.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">User Management</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Control institutional access and roles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={view === 'users' ? 'primary' : 'outline'} 
            onClick={() => setView('users')}
            className="text-xs py-2"
          >
            <Users className="w-3.5 h-3.5 mr-2" /> Users
          </Button>
          <Button 
            variant={view === 'invites' ? 'primary' : 'outline'} 
            onClick={() => setView('invites')}
            className="text-xs py-2"
          >
            <Mail className="w-3.5 h-3.5 mr-2" /> Invites
          </Button>
          <Button 
            variant={view === 'applications' ? 'primary' : 'outline'} 
            onClick={() => setView('applications')}
            className="text-xs py-2"
          >
            <UserPlus className="w-3.5 h-3.5 mr-2" /> Applications
          </Button>
          <Button onClick={() => setShowInviteForm(true)} className="text-xs py-2 bg-black text-white">
            <Plus className="w-3.5 h-3.5 mr-2" /> Invite User
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {view === 'users' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No users found.</td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {user.full_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{user.full_name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold uppercase text-gray-500">
                    {user.role}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user.status === 'active' ? (
                        <button onClick={() => handleUpdateStatus(user.user_id, 'suspended')} title="Suspend" className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <UserMinus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(user.user_id, 'active')} title="Activate" className="p-2 text-gray-400 hover:text-green-500 transition-colors">
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === 'applications' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Applicant</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" /></td></tr>
              ) : filteredApplications.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">No applications found.</td></tr>
              ) : filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm">{app.fullName || app.full_name}</p>
                    <p className="text-xs text-gray-400">{app.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleApproveApplication(app)} className="px-3 py-1 bg-black text-white rounded-lg text-xs font-bold">Approve</button>
                      <button onClick={() => handleRejectApplication(app.id)} className="px-3 py-1 border border-gray-200 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === 'invites' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Recipient</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" /></td></tr>
              ) : invites.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No invites found.</td></tr>
              ) : invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-900 text-sm">{invite.email}</td>
                  <td className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{invite.role}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                      invite.status === 'pending' ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {invite.status === 'pending' && <Clock className="w-3 h-3" />}
                      {invite.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {invite.status === 'pending' && (
                        <>
                          <button onClick={() => copyInviteLink(invite.token)} title="Copy Link" className="p-2 text-gray-400 hover:text-black transition-colors"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteInvite(invite.id)} title="Cancel" className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {showInviteForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={closeInviteModal} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-black mb-8 tracking-tight">Invite New User</h2>
              <form onSubmit={handleCreateInvite} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input required type="text" value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-bold" placeholder="John Doe" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-bold" placeholder="user@academy.edu" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['student', 'teacher'].map((r) => (
                      <button key={r} type="button" onClick={() => setInviteRole(r as any)} className={`py-2 text-[10px] font-black rounded-lg border-2 uppercase tracking-wider transition-all ${inviteRole === r ? 'border-black bg-black text-white' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={closeInviteModal} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={loading} className="flex-2 bg-black text-white">Send Invitation</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
