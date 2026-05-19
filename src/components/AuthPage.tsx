import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  getDoc,
  writeBatch,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { BookOpen, Mail, Lock, User, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button, Card } from './ui/Card';
import { motion, AnimatePresence } from 'motion/react';
import { UserInvite, UserProfile, StudentProfile, TeacherProfile } from '../types';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'invite' | 'reset' | 'apply'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<UserInvite | null>(null);
  
  // Application for admission form state
  const [applyName, setApplyName] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyBackground, setApplyBackground] = useState('');

  // Check for invite token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      verifyInvite(token);
    }
  }, []);

  const verifyInvite = async (token: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'invites'), 
        where('token', '==', token),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('Invalid or expired invite token.');
        setMode('login');
      } else {
        const inviteData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserInvite;
        // Check expiry
        if (inviteData.expiresAt.toDate() < new Date()) {
          setError('This invite has expired.');
          setMode('login');
        } else {
          setInvite(inviteData);
          setEmail(inviteData.email);
          if (inviteData.fullName) {
            setName(inviteData.fullName);
          }
          setMode('invite');
        }
      }
    } catch (err: any) {
      setError('Error verifying invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Update lastLogin in Firestore
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastLogin: serverTimestamp()
      }).catch(err => console.warn("Failed to update lastLogin:", err));
    } catch (err: any) {
      setError(err.message.includes('auth/user-not-found') || err.message.includes('auth/wrong-password') 
        ? 'Invalid email or password.' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const batch = writeBatch(db);

      // 2. Create Institutional Profile in Firestore
      const profile: UserProfile = {
        uid: user.uid,
        fullName: name,
        email: email,
        role: invite!.role,
        status: 'active',
        createdBy: invite!.createdBy,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(), // Set initial lastLogin
      };
      batch.set(doc(db, 'users', user.uid), profile);

      // 3. Handle Role-Specific Setup
      if (invite!.role === 'teacher') {
        const teacherProfile: TeacherProfile = {
          userId: user.uid,
          employeeNumber: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: '',
          assignedCourses: invite!.assignedCourses || [],
          department: 'General'
        };
        batch.set(doc(db, 'teachers', user.uid), teacherProfile);
      } else if (invite!.role === 'student') {
        let initialTotalFee = 0;
        if (invite!.assignedCourses && invite!.assignedCourses.length > 0) {
          for (const courseId of invite!.assignedCourses) {
            const courseSnap = await getDoc(doc(db, 'courses', courseId));
            if (courseSnap.exists()) {
              initialTotalFee += Number(courseSnap.data().fee || 0);
            }
          }
        }

        const studentProfile: StudentProfile = {
          userId: user.uid,
          studentNumber: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: '',
          paymentStatus: 'unpaid',
          totalFee: initialTotalFee,
          amountPaid: 0,
          balance: initialTotalFee,
          academicStatus: 'active'
        };
        batch.set(doc(db, 'students', user.uid), studentProfile);

        // Create Enrollments
        if (invite!.assignedCourses) {
          for (const courseId of invite!.assignedCourses) {
            const enrollmentId = `${user.uid}_${courseId}`;
            const enrollRef = doc(db, 'enrollments', enrollmentId);
            batch.set(enrollRef, {
              studentId: user.uid,
              courseId: courseId,
              status: 'active',
              enrolledAt: serverTimestamp()
            });
          }
        }
      }

      // 4. Mark invite as used
      batch.update(doc(db, 'invites', invite!.id), {
        status: 'used',
        usedAt: serverTimestamp()
      });

      // 5. Delete pending user doc if it exists
      if (invite!.pendingUserId) {
        batch.delete(doc(db, 'users', invite!.pendingUserId));
      }

      await batch.commit();
      setSuccess('Account activated successfully! Logging you in...');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset link sent to your email.');
      setTimeout(() => setMode('login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await addDoc(collection(db, 'applications'), {
        fullName: applyName,
        email: applyEmail,
        background: applyBackground,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSuccess('Application submitted! We will review it and send an invite if approved.');
      setApplyName('');
      setApplyEmail('');
      setApplyBackground('');
      setTimeout(() => setMode('login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-4 font-sans leading-relaxed">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/10">
            <BookOpen className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">LearnFlow</h1>
          <p className="text-gray-500 font-medium">Institutional LMS Portal</p>
        </div>

        <Card className="p-8">
          <AnimatePresence mode="wait">
            {mode === 'login' && (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" /> Sign In
                </h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Institutional Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        placeholder="name@institution.edu"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                      <button type="button" onClick={() => setMode('reset')} className="text-[10px] font-bold text-gray-400 hover:text-black uppercase">Forgot?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  {error && <div className="p-3 bg-red-50 border border-red-100 text-red-500 text-xs rounded-xl flex gap-2 items-center font-medium"><AlertCircle className="w-4 h-4" /> {error}</div>}
                  <Button type="submit" disabled={loading} className="w-full py-3 mt-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Login'}
                  </Button>
                </form>
                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <button onClick={() => setMode('apply')} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">
                    Apply for Admission
                  </button>
                </div>
              </motion.div>
            )}

            {mode === 'invite' && (
              <motion.div key="invite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-xl font-bold mb-2">Activate Your Account</h2>
                <p className="text-sm text-gray-500 mb-6">Completing setup for <span className="font-bold text-black">{email}</span></p>
                <form onSubmit={handleInviteSignup} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Set Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  {error && <div className="p-3 bg-red-50 border border-red-100 text-red-500 text-xs rounded-xl font-medium">{error}</div>}
                  {success && <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-xs rounded-xl font-medium">{success}</div>}
                  <Button type="submit" disabled={loading} className="w-full py-3 mt-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Activate Account'}
                  </Button>
                </form>
              </motion.div>
            )}

            {mode === 'reset' && (
              <motion.div key="reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-xl font-bold mb-6">Reset Password</h2>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="name@institution.edu"
                    />
                  </div>
                  {error && <div className="p-3 bg-red-50 border border-red-100 text-red-500 text-xs rounded-xl font-medium">{error}</div>}
                  {success && <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-xs rounded-xl font-medium">{success}</div>}
                  <Button type="submit" disabled={loading} className="w-full py-3">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Reset Link'}
                  </Button>
                  <button type="button" onClick={() => setMode('login')} className="w-full text-xs font-bold text-gray-400 hover:text-black uppercase mt-4">Back to Login</button>
                </form>
              </motion.div>
            )}

            {mode === 'apply' && (
              <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-xl font-bold mb-6">Apply for Admission</h2>
                <form onSubmit={handleApply} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={applyName}
                      onChange={(e) => setApplyName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={applyEmail}
                      onChange={(e) => setApplyEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Message / Background</label>
                    <textarea
                      required
                      value={applyBackground}
                      onChange={(e) => setApplyBackground(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all h-24"
                      placeholder="Tell us why you'd like to join..."
                    />
                  </div>
                  {error && <div className="p-3 bg-red-50 border border-red-100 text-red-500 text-xs rounded-xl font-medium">{error}</div>}
                  {success && <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-xs rounded-xl font-medium">{success}</div>}
                  <Button type="submit" disabled={loading} className="w-full py-3">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Application'}
                  </Button>
                  <button type="button" onClick={() => setMode('login')} className="w-full text-xs font-bold text-gray-400 hover:text-black uppercase mt-4">Back to Login</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
