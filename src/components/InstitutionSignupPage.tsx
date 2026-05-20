import { useState, FormEvent, ChangeEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { BookOpen, User, Mail, Lock, Phone, Globe, Shield, Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button, Card } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import { motion, AnimatePresence } from 'motion/react';

export function InstitutionSignupPage() {
  // Input fields
  const [instName, setInstName] = useState('');
  const [instSlug, setInstSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [instType, setInstType] = useState<'school' | 'college' | 'training_center' | 'company'>('school');
  const [logoUrl, setLogoUrl] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  
  // Custom Validation State
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const getFieldError = (field: string): string => {
    switch (field) {
      case 'instName':
        if (!instName.trim()) return 'Institution name is required';
        if (instName.trim().length < 2) return 'Institution name must be at least 2 characters';
        return '';
      case 'instSlug':
        if (!instSlug.trim()) return 'Portal URL slug is required';
        if (instSlug.trim().length < 3) return 'Portal URL slug must be at least 3 characters';
        if (slugStatus === 'invalid') return 'This portal URL slug is already taken';
        if (slugStatus === 'none' && !checkingSlug) return 'Please enter a unique URL slug';
        return '';
      case 'country':
        if (!country.trim()) return 'Country is required';
        return '';
      case 'ownerName':
        if (!ownerName.trim()) return 'Owner full name is required';
        return '';
      case 'phone':
        if (!phone.trim()) return 'Owner phone number is required';
        return '';
      case 'ownerEmail':
        if (!ownerEmail.trim()) return 'Email address is required';
        if (!/\S+@\S+\.\S+/.test(ownerEmail)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!password) return 'Admin password is required';
        if (password.length < 6) return 'Password must be at least 6 characters';
        return '';
      default:
        return '';
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInstName(value);
    
    // Auto-generate slug
    const generated = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // strip special chars
      .replace(/\s+/g, '-')         // replace spaces with dash
      .replace(/-+/g, '-')          // replace multiple dashes with single dash
      .trim();
    
    setInstSlug(generated);
    if (generated.length > 2) {
      checkSlugUniqueness(generated);
    } else {
      setSlugStatus('none');
    }
  };

  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '') // allow only lowercase alphanum and dashes
      .replace(/-+/g, '-');
    
    setInstSlug(value);
    if (value.length > 2) {
      checkSlugUniqueness(value);
    } else {
      setSlugStatus('none');
    }
  };

  const checkSlugUniqueness = async (slug: string) => {
    setCheckingSlug(true);
    try {
      const q = query(collection(db, 'institutions'), where('slug', '==', slug));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setSlugStatus('invalid');
      } else {
        setSlugStatus('valid');
      }
    } catch (err) {
      console.error("Error checking slug uniqueness:", err);
      // Fallback to valid to prevent blocking the user if background database check fails
      setSlugStatus('valid');
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to trigger visual validation
    const requiredFields = ['instName', 'instSlug', 'country', 'ownerName', 'phone', 'ownerEmail', 'password'];
    const newTouched: Record<string, boolean> = {};
    requiredFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    // Collect errors
    const errorsList = requiredFields
      .map(field => getFieldError(field))
      .filter(error => error !== '');

    if (errorsList.length > 0) {
      showToast(errorsList[0], "error");
      return;
    }

    if (checkingSlug) {
      showToast("Checking portal URL slug availability...", "error");
      return;
    }

    if (slugStatus !== 'valid') {
      showToast("Please enter a unique, valid institution slug.", "error");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Re-verify slug uniqueness right before creating
      const q = query(collection(db, 'institutions'), where('slug', '==', instSlug));
      const slugSnap = await getDocs(q);
      if (!slugSnap.empty) {
        setSlugStatus('invalid');
        showToast("Slug is already taken. Please enter a different one.", "error");
        setLoading(false);
        return;
      }

      // Step 2: Create Firebase Auth credentials
      const userCredential = await createUserWithEmailAndPassword(auth, ownerEmail, password);
      const ownerUid = userCredential.user.uid;

      // Step 3: Initialize documents in Firestore using batch write
      const batch = writeBatch(db);
      
      // A. Create Institution
      const instRef = doc(collection(db, 'institutions'));
      const instId = instRef.id;
      
      batch.set(instRef, {
        id: instId,
        name: instName,
        slug: instSlug,
        logoUrl: logoUrl || null,
        primaryColor: 'black',
        country,
        institutionType: instType,
        ownerUserId: ownerUid,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // B. Create Platform User Profile
      const userRef = doc(db, 'users', ownerUid);
      batch.set(userRef, {
        uid: ownerUid,
        fullName: ownerName,
        email: ownerEmail,
        phone,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // C. Create Institution membership record
      const membershipRef = doc(db, 'institutionUsers', `${ownerUid}_${instId}`);
      batch.set(membershipRef, {
        id: `${ownerUid}_${instId}`,
        institutionId: instId,
        userId: ownerUid,
        role: 'owner',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Commit Batch
      await batch.commit();

      showToast("Institution registered successfully! Redirecting to admin dashboard...", "success");
      
      setTimeout(() => {
        navigate(`/${instSlug}/admin`);
      }, 1500);

    } catch (err: any) {
      console.error("Institution signup error:", err);
      showToast(err.message || "Failed to create institution.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getInputClass = (fieldName: string, baseClass = "w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium transition-all") => {
    const hasError = touched[fieldName] && getFieldError(fieldName);
    if (hasError) {
      return `${baseClass} border-red-300 focus:border-red-500 focus:ring-red-500/10 text-red-900 placeholder-red-300`;
    }
    return `${baseClass} border-gray-100 focus:border-black`;
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4 font-sans selection:bg-black selection:text-white relative overflow-x-hidden">
      {/* Toast Alert */}
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

      <div className="w-full max-w-2xl py-12">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/10 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/')}>
            <BookOpen className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Create an Institution</h1>
          <p className="text-gray-500 text-sm font-semibold mt-1">Set up your school or academy and start teaching in minutes.</p>
        </div>

        <Card className="p-8 md:p-10 shadow-xl border-gray-100 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* Section 1: Institution Info */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1.5 w-full">
                <Sparkles className="w-3.5 h-3.5 text-black" /> Institution Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Institution Name</label>
                  <input
                    type="text"
                    value={instName}
                    onChange={handleNameChange}
                    onBlur={() => handleBlur('instName')}
                    className={getInputClass('instName')}
                    placeholder="e.g. Brain Education"
                  />
                  {touched.instName && getFieldError('instName') && (
                    <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{getFieldError('instName')}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Portal URL Slug</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={instSlug}
                      onChange={handleSlugChange}
                      onBlur={() => handleBlur('instSlug')}
                      className={`w-full pl-4 pr-10 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-semibold transition-all ${
                        touched.instSlug && getFieldError('instSlug') ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10 text-red-900 placeholder-red-300' :
                        slugStatus === 'valid' ? 'border-green-200 focus:border-green-500' :
                        slugStatus === 'invalid' ? 'border-red-200 focus:border-red-500' : 'border-gray-100 focus:border-black'
                      }`}
                      placeholder="brain-education"
                    />
                    <div className="absolute right-3 top-3.5">
                      {checkingSlug ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> :
                       slugStatus === 'valid' && !(touched.instSlug && getFieldError('instSlug')) ? <Check className="w-4 h-4 text-green-500 font-bold" /> :
                       (slugStatus === 'invalid' || (touched.instSlug && getFieldError('instSlug'))) ? <AlertCircle className="w-4 h-4 text-red-500" /> : null}
                    </div>
                  </div>
                  {touched.instSlug && getFieldError('instSlug') ? (
                    <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{getFieldError('instSlug')}</p>
                  ) : (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                      Your portal link will be: <span className="text-black font-semibold">/{instSlug || 'your-slug'}/login</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Institution Type</label>
                  <select
                    value={instType}
                    onChange={(e) => setInstType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-sm font-semibold"
                  >
                    <option value="school">School</option>
                    <option value="college">College / University</option>
                    <option value="training_center">Training Center</option>
                    <option value="company">Corporate Company</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Country</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      onBlur={() => handleBlur('country')}
                      className={getInputClass('country', "w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium transition-all")}
                      placeholder="e.g. United States"
                    />
                  </div>
                  {touched.country && getFieldError('country') && (
                    <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{getFieldError('country')}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Logo URL (Optional)</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-sm font-medium"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Owner Info */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1.5 w-full">
                <Shield className="w-3.5 h-3.5 text-black" /> Owner / Administrative Account
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Owner Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      onBlur={() => handleBlur('ownerName')}
                      className={getInputClass('ownerName', "w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium transition-all")}
                      placeholder="John Doe"
                    />
                  </div>
                  {touched.ownerName && getFieldError('ownerName') && (
                    <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{getFieldError('ownerName')}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Owner Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      className={getInputClass('phone', "w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium transition-all")}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  {touched.phone && getFieldError('phone') && (
                    <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{getFieldError('phone')}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      onBlur={() => handleBlur('ownerEmail')}
                      className={getInputClass('ownerEmail', "w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium transition-all")}
                      placeholder="owner@academy.edu"
                    />
                  </div>
                  {touched.ownerEmail && getFieldError('ownerEmail') && (
                    <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{getFieldError('ownerEmail')}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Create Admin Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      className={getInputClass('password', "w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium transition-all")}
                      placeholder="••••••••"
                    />
                  </div>
                  {touched.password && getFieldError('password') && (
                    <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{getFieldError('password')}</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-base font-bold rounded-2xl shadow-xl shadow-black/10 mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : 'Create Institution'}
            </Button>
          </form>
        </Card>
        
        <div className="text-center mt-6">
          <button onClick={() => navigate('/find-institution')} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">
            Looking for your School? Search Institution
          </button>
        </div>
      </div>
    </div>
  );
}
