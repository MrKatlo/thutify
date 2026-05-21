import { useState, FormEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import * as cfApi from '../services/cfApi';
import { BookOpen, User, Mail, Lock, Phone, Loader2, AlertCircle, ArrowLeft, Hourglass, Check } from 'lucide-react';
import { Button, Card } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import { motion, AnimatePresence } from 'motion/react';
import { Institution } from '../types';

interface StudentSignupPageProps {
  institution: Institution;
}

export function StudentSignupPage({ institution }: StudentSignupPageProps) {
  // Input fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Branding dynamic variables
  const primaryColor = institution.primaryColor || 'black';
  const brandBg = 
    primaryColor === 'blue-600' ? 'bg-blue-600 hover:bg-blue-700' :
    primaryColor === 'emerald-600' ? 'bg-emerald-600 hover:bg-emerald-700' :
    primaryColor === 'purple-600' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-black hover:bg-gray-800';

  const brandBorder = 
    primaryColor === 'blue-600' ? 'border-blue-100 focus:border-blue-500 focus:ring-blue-500/5' :
    primaryColor === 'emerald-600' ? 'border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/5' :
    primaryColor === 'purple-600' ? 'border-purple-100 focus:border-purple-500 focus:ring-purple-500/5' : 'border-gray-100 focus:border-black focus:ring-black/5';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth User
      await createUserWithEmailAndPassword(auth, email, password);

      // 2. Submit application via Worker
      // Worker automatically creates platform_user and institutionUser(pending)
      await cfApi.applyToInstitution(institution.id, {
        fullName,
        email,
        phone
      });

      // Update platform user profile with name and phone
      await cfApi.updateCurrentUser({
        fullName,
        phone
      });

      // Show success screen
      setSuccess(true);
      showToast("Application submitted successfully!", "success");

    } catch (err: any) {
      console.error("Student signup error:", err);
      showToast(err.message || "Failed to submit application.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbfa] p-4 font-sans selection:bg-black selection:text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <Card className="p-10 shadow-2xl border-gray-100 bg-white space-y-6">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Hourglass className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900">Application Submitted</h2>
              <p className="text-gray-500 text-sm leading-relaxed font-semibold">
                Your application has been sent to <span className="text-black font-extrabold">{institution.name}</span>. You will get access after approval.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wide">
              <span>Account Credentials Created</span>
              <span className="text-gray-900 font-extrabold">{email}</span>
            </div>

            <Button onClick={() => navigate(`/${institution.slug}/login`)} className={`w-full py-3.5 text-sm font-bold shadow-lg shadow-black/5 rounded-xl ${brandBg}`}>
              Return to Login Portal
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4 font-sans selection:bg-black selection:text-white relative">
      {/* Dynamic Toast */}
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
        
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/5">
            {institution.logoUrl ? (
              <img src={institution.logoUrl} className="w-full h-full object-contain rounded-2xl" alt={institution.name} />
            ) : (
              <BookOpen className="text-black w-8 h-8" />
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-1">{institution.name}</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Student Admission signup</p>
        </div>

        {/* Signup form */}
        <Card className="p-8 shadow-xl bg-white border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all ${brandBorder}`}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all ${brandBorder}`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all ${brandBorder}`}
                  placeholder="name@email.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-sm font-medium transition-all ${brandBorder}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className={`w-full py-3.5 text-sm font-bold mt-4 shadow-lg shadow-black/5 rounded-xl ${brandBg}`}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : 'Submit Application'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <button onClick={() => navigate(`/${institution.slug}/login`)} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">
              Already have an account? Log In
            </button>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <button onClick={() => navigate('/find-institution')} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 mx-auto">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to School Search
          </button>
        </div>
      </div>
    </div>
  );
}
