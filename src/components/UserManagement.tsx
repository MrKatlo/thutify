import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, updateDoc, doc, deleteDoc, QueryDocumentSnapshot, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { UserProfile, UserInvite, UserRole, UserStatus } from '../types';
import { Card, Button } from './ui/Card';
import { 
  UserPlus, 
  Users, 
  ShieldCheck, 
  Mail, 
  Search, 
  Plus, 
  X, 
  MoreVertical, 
  UserMinus, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays } from 'date-fns';

export function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'users' | 'invites' | 'applications'>('users');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('student');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const snap = await getDocs(collection(db, 'courses'));
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userSnap, inviteSnap, appSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'invites'), orderBy('expiresAt', 'desc'))),
        getDocs(query(collection(db, 'applications'), orderBy('createdAt', 'desc')))
      ]);

      setUsers(userSnap.docs.map((doc: QueryDocumentSnapshot) => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setInvites(inviteSnap.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as UserInvite)));
      setApplications(appSnap.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'management');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    try {
      const batch = writeBatch(db);

      // 1. Create the pending user document (using email as temporary ID)
      const userRef = doc(db, 'users', `pending_${inviteEmail}`);
      batch.set(userRef, {
        fullName: inviteFullName,
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
        createdBy: profile?.uid,
        createdAt: serverTimestamp(),
        assignedCourses: selectedCourses
      });

      // 2. Create the invite with all details
      const inviteRef = doc(collection(db, 'invites'));
      batch.set(inviteRef, {
        email: inviteEmail,
        fullName: inviteFullName,
        role: inviteRole,
        assignedCourses: selectedCourses,
        token: token,
        status: 'pending',
        expiresAt: addDays(new Date(), 7),
        createdBy: profile?.uid,
        createdAt: serverTimestamp(),
        pendingUserId: userRef.id
      });

      // 3. Update application status if invite is from admission application
      if (activeApplicationId) {
        batch.update(doc(db, 'applications', activeApplicationId), {
          status: 'approved'
        });
      }
      
      await batch.commit();
      
      setInviteEmail('');
      setInviteFullName('');
      setSelectedCourses([]);
      setShowInviteForm(false);
      setActiveApplicationId(null);
      fetchData();
      alert('Invite link created successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invites');
    } finally {
      setLoading(false);
    }
  };

  const closeInviteModal = () => {
    setShowInviteForm(false);
    setActiveApplicationId(null);
    setInviteEmail('');
    setInviteFullName('');
    setSelectedCourses([]);
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to cancel this invite?')) return;
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invites/${inviteId}`);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}${window.location.pathname}?token=${token}`;
    navigator.clipboard.writeText(url);
    alert('Invite link copied to clipboard!');
  };

  const handleApproveApplication = (app: any) => {
    setActiveApplicationId(app.id);
    setInviteFullName(app.fullName);
    setInviteEmail(app.email);
    setInviteRole('student');
    setSelectedCourses([]);
    setShowInviteForm(true);
  };

  const handleRejectApplication = async (appId: string) => {
    if (!confirm('Are you sure you want to reject this application?')) return;
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'rejected'
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${appId}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApplications = applications.filter(app => 
    app.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    app.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">User Management</h1>
          <p className="text-gray-500 mt-1 font-medium">Control institutional access and roles.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={view === 'users' ? 'primary' : 'outline'} 
            onClick={() => setView('users')}
            className="gap-2"
          >
            <Users className="w-4 h-4" /> Users
          </Button>
          <Button 
            variant={view === 'invites' ? 'primary' : 'outline'} 
            onClick={() => setView('invites')}
            className="gap-2"
          >
            <Mail className="w-4 h-4" /> Invites
          </Button>
          <Button 
            variant={view === 'applications' ? 'primary' : 'outline'} 
            onClick={() => setView('applications')}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" /> Applications
          </Button>
          <Button onClick={() => setShowInviteForm(true)} className="gap-2 bg-black text-white">
            <Plus className="w-4 h-4" /> Invite User
          </Button>
        </div>
      </div>

      <div className="mb-8 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
        />
      </div>

      {view === 'users' ? (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" /></td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {user.fullName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{user.fullName}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-[10px] font-bold uppercase rounded-md text-gray-600 border border-gray-200">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.status === 'active' ? 'bg-green-50 text-green-600' :
                      user.status === 'suspended' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {user.createdAt?.toDate ? format(user.createdAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user.status === 'active' ? (
                        <button onClick={() => handleUpdateStatus(user.uid, 'suspended')} title="Suspend" className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <UserMinus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(user.uid, 'active')} title="Activate" className="p-2 text-gray-400 hover:text-green-500 transition-colors">
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === 'applications' ? (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Applicant</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Background / Message</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Applied</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" /></td></tr>
                ) : filteredApplications.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium italic">No applications found.</td></tr>
                ) : filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{app.fullName}</p>
                      <p className="text-xs text-gray-400">{app.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={app.background}>
                      {app.background}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        app.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                        app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {app.createdAt?.toDate ? format(app.createdAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {app.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleApproveApplication(app)} 
                            title="Approve & Send Invite" 
                            className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectApplication(app.id)} 
                            title="Reject" 
                            className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Expires</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" /></td></tr>
              ) : invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-900">{invite.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-[10px] font-bold uppercase rounded-md text-gray-600">
                      {invite.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      invite.status === 'pending' ? 'text-amber-600' :
                      invite.status === 'used' ? 'text-green-600' :
                      'text-gray-400'
                    }`}>
                      {invite.status === 'pending' && <Clock className="w-3 h-3" />}
                      {invite.status === 'used' && <CheckCircle2 className="w-3 h-3" />}
                      {invite.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {invite.expiresAt?.toDate ? format(invite.expiresAt.toDate(), 'MMM dd') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {invite.status === 'pending' && (
                        <>
                          <button onClick={() => copyInviteLink(invite.token)} title="Copy Link" className="p-2 text-gray-400 hover:text-black transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteInvite(invite.id)} title="Cancel" className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Form Modal */}
      <AnimatePresence>
        {showInviteForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeInviteModal} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Invite Institutional User</h2>
                <button onClick={closeInviteModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateInvite} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    required
                    type="text"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Institutional Email</label>
                  <input 
                    required
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                    placeholder="user@institution.edu"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Assigned Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['student', 'teacher', 'admin'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setInviteRole(r)}
                        className={`py-2 text-[10px] font-bold rounded-lg border-2 transition-all uppercase tracking-wider ${
                          inviteRole === r ? 'border-black bg-black text-white' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {(inviteRole === 'student' || inviteRole === 'teacher') && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                      {inviteRole === 'student' ? 'Initial Enrollment' : 'Assigned Courses'}
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto p-1">
                      {courses.map(course => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => toggleCourse(course.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            selectedCourses.includes(course.id) ? 'border-black bg-black/5' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xs font-bold text-gray-700">{course.title}</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedCourses.includes(course.id) ? 'bg-black border-black' : 'border-gray-300'
                          }`}>
                            {selectedCourses.includes(course.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                  <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">Invites are valid for 7 days. The user will be able to set their password once they open the link.</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" onClick={closeInviteModal} className="flex-1 py-3">Cancel</Button>
                  <Button type="submit" disabled={loading} className="flex-[2] py-3">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Generate Invite'}
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

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
