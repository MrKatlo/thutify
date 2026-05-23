import { useState, FormEvent } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import * as cfApi from '../services/cfApi';
import { BookOpen, Mail, Lock, ShieldCheck, Loader2, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { Button, Card } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import { motion, AnimatePresence } from 'motion/react';
import { Institution } from '../types';

interface InstitutionLoginPageProps {
  institution: Institution;
}

export function InstitutionLoginPage({ institution }: InstitutionLoginPageProps) {
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Branding helpers
  const primaryColor = institution.primaryColor || 'black';
  const brandBg = 
    primaryColor === 'blue-600' ? 'bg-blue-600 hover:bg-blue-700' :
    primaryColor === 'emerald-600' ? 'bg-emerald-600 hover:bg-emerald-700' :
    primaryColor === 'purple-600' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-black hover:bg-gray-800';
  
  const brandText = 
    primaryColor === 'blue-600' ? 'text-blue-600' :
    primaryColor === 'emerald-600' ? 'text-emerald-600' :
    primaryColor === 'purple-600' ? 'text-purple-600' : 'text-black';

  const brandBorder = 
    primaryColor === 'blue-600' ? 'border-blue-100 focus:border-blue-500 focus:ring-blue-500/5' :
    primaryColor === 'emerald-600' ? 'border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/5' :
    primaryColor === 'purple-600' ? 'border-purple-100 focus:border-purple-500 focus:ring-purple-500/5' : 'border-gray-100 focus:border-black focus:ring-black/5';

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Sign in with Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);

      // 2. Validate Membership in this institution via Worker
      const membership = await cfApi.getInstitutionMembership(institution.id);
      
      if (!membership) {
        showToast("Your account is not associated with this institution.", "error");
        auth.signOut();
        setLoading(false);
        return;
      }

      if (membership.status === 'suspended') {
        showToast("Your institutional access has been suspended. Contact your institution owner.", "error");
        auth.signOut();
        setLoading(false);
        return;
      }
      if (membership.status === 'pending') {
        showToast("Your membership is pending approval from the institution owner.", "error");
        auth.signOut();
        setLoading(false);
        return;
      }
      if (membership.status === 'rejected') {
        showToast("Your application was rejected. Please contact the institution if you want to reapply.", "error");
        auth.signOut();
        setLoading(false);
        return;
      }

      showToast("Access granted! Entering portal...", "success");

      // Successful login - redirect to the institution workspace
      setTimeout(() => {
        navigate(`/${institution.slug}/admin`);
      }, 1000);

    } catch (err: any) {
      console.error("Login error:", err);
      showToast(err.message.includes('auth/user-not-found') || err.message.includes('auth/wrong-password') || err.message.includes('auth/invalid-credential')
        ? "Invalid email or password." 
        : err.message || "Authentication failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("Password reset link sent to your email.", "success");
      setTimeout(() => setMode('login'), 2000);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfbfa] p-4 font-sans selection:bg-black selection:text-white relative">
      {/* Dynamic custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${
              toast.type === 'success' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {toast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/5">
            {institution.logoUrl ? (
              <img src={institution.logoUrl} className="w-full h-full object-contain rounded-2xl" alt={institution.name} />
            ) : (
              <BookOpen className="text-black w-8 h-8" />
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">{institution.name}</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-gray-400" /> Secure Institutional Portal
          </p>
        </div>

        <Card className="p-8 shadow-xl bg-white border-gray-100">
          <AnimatePresence mode="wait">
            {mode === 'login' && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">Sign In</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Institutional Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all ${brandBorder}`}
                        placeholder="name@institution.edu"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                      <button type="button" onClick={() => setMode('reset')} className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-wider">Forgot?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all ${brandBorder}`}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className={`w-full py-3.5 text-sm font-bold mt-2 shadow-lg shadow-black/5 rounded-xl ${brandBg}`}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : 'Log In'}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <button onClick={() => navigate(`/${institution.slug}/student-signup`)} className={`text-xs font-extrabold uppercase tracking-widest transition-colors ${brandText} hover:opacity-85`}>
                    Apply / Register as Student
                  </button>
                </div>
              </motion.div>
            )}

            {mode === 'reset' && (
              <motion.div key="reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setMode('login')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-black transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                  <h2 className="text-xl font-black text-gray-900">Reset Password</h2>
                </div>
                
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all ${brandBorder}`}
                        placeholder="name@institution.edu"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className={`w-full py-3.5 text-sm font-bold shadow-lg shadow-black/5 rounded-xl ${brandBg}`}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : 'Send Reset Link'}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <div className="text-center mt-6">
          <button onClick={() => navigate('/find-institution')} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">
            Change Institution
          </button>
        </div>
      </div>
    </div>
  );
}
