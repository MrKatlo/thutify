import { useState, useEffect } from 'react';
import { logout } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, Search, LogOut, CheckCircle, ShieldAlert, AlertCircle, Loader2, Building, RefreshCw, Globe } from 'lucide-react';
import { Button, Card } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import { motion, AnimatePresence } from 'motion/react';
import { Institution } from '../types';
import { format } from 'date-fns';
import * as cfApi from '../services/cfApi';

export function PlatformAdminDashboard() {
  const { profile, isPlatformAdmin, loading: authLoading } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (isPlatformAdmin) {
      fetchInstitutions();
    }
  }, [isPlatformAdmin]);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const list = await cfApi.getPlatformInstitutions();
      setInstitutions(list);
    } catch (err: any) {
      console.error("Error fetching institutions:", err);
      showToast("Failed to fetch institutions from API.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (instId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await cfApi.updateInstitution(instId, { status: newStatus as any });
      
      // Update local state
      setInstitutions(prev => prev.map(inst => 
        inst.id === instId ? { ...inst, status: newStatus as any } : inst
      ));

      showToast(`Institution successfully ${newStatus === 'active' ? 'activated' : 'suspended'}!`, "success");
    } catch (err: any) {
      console.error("Failed to update status:", err);
      showToast("Error persisting status update.", "error");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Filter lists
  const filtered = institutions.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inst.country || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics
  const totalCount = institutions.length;
  const activeCount = institutions.filter(i => i.status === 'active').length;
  const suspendedCount = institutions.filter(i => i.status === 'suspended').length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  // Security Access Guard
  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbfa] p-6 text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black mb-2">Access Restrained</h1>
          <p className="text-gray-500 mb-8 leading-relaxed font-semibold">
            This workspace is reserved for SaaS Platform Super Administrators. Please sign out and sign in with authorized credentials.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>Return Home</Button>
            <Button onClick={handleLogout} className="gap-2 bg-black text-white">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfa] font-sans selection:bg-black selection:text-white flex flex-col justify-between">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${
              toast.type === 'success' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        {/* Navigation Bar */}
        <header className="max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
              < BookOpen className="text-white w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-gray-900">LearnFlow</span>
              <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5 rounded-full border border-black/5 ml-2 tracking-widest">SaaS Super Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-extrabold text-gray-950">{profile?.fullName}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{profile?.email}</p>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="gap-2 hover:bg-red-50 hover:text-red-600">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="max-w-7xl mx-auto w-full px-6 py-10 space-y-8">
          
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-950">Platform Control Center</h1>
              <p className="text-gray-500 font-semibold text-sm mt-0.5">Oversee, authorize, and audit every active institution deployed on this SaaS.</p>
            </div>
            <Button onClick={fetchInstitutions} disabled={loading} variant="outline" className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Live
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white border-gray-100 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Academies</p>
                <h2 className="text-3xl font-black text-gray-950">{loading ? '...' : totalCount}</h2>
              </div>
              <div className="w-12 h-12 bg-black/5 text-black rounded-2xl flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
            </Card>

            <Card className="p-6 bg-white border-gray-100 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Deployments</p>
                <h2 className="text-3xl font-black text-green-600">{loading ? '...' : activeCount}</h2>
              </div>
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
            </Card>

            <Card className="p-6 bg-white border-gray-100 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Suspended Portals</p>
                <h2 className="text-3xl font-black text-red-600">{loading ? '...' : suspendedCount}</h2>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* Core Audit Panel */}
          <Card className="p-6 md:p-8 bg-white border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-50">
              <h3 className="font-extrabold text-lg text-gray-900">Institution Audit Log</h3>
              
              {/* Search */}
              <div className="relative w-full md:w-80">
                < Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black text-xs font-semibold shadow-inner"
                  placeholder="Search by school, slug, or country..."
                />
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Institution Info</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Slug Path</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Institution Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Deploy Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-200" />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-semibold italic">
                        No institutions found matching search parameters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inst) => (
                      <tr key={inst.id} className="hover:bg-gray-50/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                              {inst.logoUrl ? (
                                <img src={inst.logoUrl} className="w-full h-full object-contain rounded-xl" alt="" />
                              ) : (
                                inst.name[0]
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-sm text-gray-900">{inst.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 font-semibold">
                                <Globe className="w-3.5 h-3.5 shrink-0" /> {inst.country}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-[10px] font-bold uppercase rounded-md text-gray-600 border border-gray-200 font-mono">
                            /{inst.slug}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-50 text-[10px] font-bold uppercase rounded-md text-gray-400 border border-gray-100 tracking-wider">
                            {(inst.institutionType || '').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-500">
                          {inst.createdAt ? format(new Date(inst.createdAt), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inst.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' :
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {inst.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleUpdateStatus(inst.id, inst.status)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                              inst.status === 'active' 
                                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                                : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {inst.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <p>© 2026 LearnFlow SaaS Platform. All Rights Reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate('/')} className="hover:text-black transition-colors">Marketing Site</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
