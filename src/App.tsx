import { useState, useEffect } from 'react';
import { useAuth, setActiveInstitutionId } from './hooks/useAuth';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CourseList } from './components/courses/CourseList';
import { Announcements } from './components/Announcements';
import { Financials } from './components/Financials';
import { StudentManagement } from './components/StudentManagement';
import { UserManagement } from './components/UserManagement';
import { Reports } from './components/Reports';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, AlertCircle, LogOut } from 'lucide-react';
import { Button } from './components/ui/Card';
import { logout, db } from './lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useRouter, navigate } from './hooks/useRouter';
import { LandingPage } from './components/LandingPage';
import { InstitutionSignupPage } from './components/InstitutionSignupPage';
import { InstitutionSearchPage } from './components/InstitutionSearchPage';
import { PlatformAdminDashboard } from './components/PlatformAdminDashboard';
import { InstitutionLoginPage } from './components/InstitutionLoginPage';
import { StudentSignupPage } from './components/StudentSignupPage';
import { Institution } from './types';

export default function App() {
  const { route } = useRouter();
  const [activeInstitution, setActiveInstitution] = useState<Institution | null>(null);
  const [instLoading, setInstLoading] = useState(false);
  const [instError, setInstError] = useState<'not-found' | 'suspended' | null>(null);

  const { user, profile, loading: authLoading, isAdmin, isTeacher } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dynamic Institution Pre-loading based on URL Slug
  useEffect(() => {
    const slug = route.params.institutionSlug;
    if (!slug) {
      setActiveInstitution(null);
      setActiveInstitutionId(null);
      setInstError(null);
      setInstLoading(false);
      return;
    }

    let isMounted = true;
    setInstLoading(true);
    setInstError(null);

    const fetchInst = async () => {
      try {
        const q = query(collection(db, 'institutions'), where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);
        
        if (!isMounted) return;

        if (snapshot.empty) {
          setInstError('not-found');
          setActiveInstitution(null);
          setActiveInstitutionId(null);
        } else {
          const inst = snapshot.docs[0].data() as Institution;
          if (inst.status === 'suspended') {
            setInstError('suspended');
            setActiveInstitution(null);
            setActiveInstitutionId(null);
          } else {
            setActiveInstitution(inst);
            setActiveInstitutionId(inst.id); // Merges institutional context with useAuth
          }
        }
      } catch (err) {
        console.error("Error resolving institution slug:", err);
        if (isMounted) setInstError('not-found');
      } finally {
        if (isMounted) setInstLoading(false);
      }
    };

    fetchInst();

    return () => {
      isMounted = false;
    };
  }, [route.params.institutionSlug]);

  if (instLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc]">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 border-4 border-black border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (instError === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-6 text-center font-sans">
        <div className="max-w-md space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight">Academy Not Found</h1>
          <p className="text-gray-500 text-sm font-semibold leading-relaxed">
            The requested URL path does not correspond to any registered educational academy. Double-check your spelling, or find your school using our lookup service.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="primary" onClick={() => navigate('/find-institution')} className="font-bold text-xs py-3 rounded-xl shadow-lg shadow-black/5">
              Search Institution
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="font-bold text-xs py-3 rounded-xl">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (instError === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-6 text-center font-sans">
        <div className="max-w-md space-y-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight">Academy Suspended</h1>
          <p className="text-gray-500 text-sm font-semibold leading-relaxed">
            Access to this educational portal has been temporarily suspended by the platform administrator. Please contact your institution's support for assistance.
          </p>
          <div className="pt-2">
            <Button variant="outline" onClick={() => navigate('/')} className="font-bold text-xs py-3 px-6 rounded-xl">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // PLATFORM LEVEL PAGES ROUTER SWITCH
  switch (route.name) {
    case 'landing':
      return <LandingPage />;
    case 'signup-institution':
      return <InstitutionSignupPage />;
    case 'find-institution':
      return <InstitutionSearchPage />;
    case 'platform-admin':
      return <PlatformAdminDashboard />;
    case 'institution-login':
    case 'teacher-login':
      return <InstitutionLoginPage institution={activeInstitution!} />;
    case 'student-signup':
      return <StudentSignupPage institution={activeInstitution!} />;
    case 'institution-admin':
      // Admin dashboard requires authentication
      if (!user) {
        return <InstitutionLoginPage institution={activeInstitution!} />;
      }
      
      // Institutional Profile Checks
      if (!profile) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-6 text-center font-sans">
            <div className="max-w-md">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Unauthorized Access</h1>
              <p className="text-gray-500 mb-8 leading-relaxed font-semibold">
                Your account is not associated with this institution. Please contact your administrator for an invite.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/')}>Return Home</Button>
                <Button onClick={logout} className="gap-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        );
      }

      if (profile.status === 'suspended') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-6 text-center font-sans">
            <div className="max-w-md">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
              <p className="text-gray-500 mb-8 leading-relaxed font-semibold">
                Your institutional access has been suspended. Please contact the administrative office for more information.
              </p>
              <Button onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </div>
        );
      }

      if (profile.status === 'pending') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-6 text-center font-sans">
            <div className="max-w-md">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-blue-500 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Registration Pending</h1>
              <p className="text-gray-500 mb-8 leading-relaxed font-semibold">
                Your student application is currently pending approval. Once an administrator approves your request, you will receive full portal access.
              </p>
              <Button onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </div>
        );
      }

      // If active, render dashboard shell
      return (
        <div className="flex flex-col min-h-screen bg-[#fafafa] font-sans">
          <div className="flex flex-1 min-h-0">
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              isOpen={isSidebarOpen} 
              setIsOpen={setIsSidebarOpen}
              institution={activeInstitution} 
            />
            <main className="flex-1 overflow-y-auto w-full flex flex-col">
              <header className="lg:hidden bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    {activeInstitution?.logoUrl ? (
                      <img src={activeInstitution.logoUrl} className="w-full h-full object-contain rounded-lg" alt="" />
                    ) : (
                      <BookOpen className="text-black w-4 h-4" />
                    )}
                  </div>
                  <span className="font-bold tracking-tight">{activeInstitution?.name || 'LearnFlow'}</span>
                </div>
                <Button variant="ghost" onClick={() => setIsSidebarOpen(true)} className="p-2">
                  <Menu className="w-6 h-6 text-black" />
                </Button>
              </header>
              
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="min-h-full"
                  >
                    {(() => {
                      switch (activeTab) {
                        case 'dashboard':
                          return <Dashboard setActiveTab={setActiveTab} />;
                        case 'courses':
                          return <CourseList />;
                        case 'announcements':
                          return <Announcements />;
                        case 'financials':
                          return isAdmin ? <Financials /> : <Dashboard setActiveTab={setActiveTab} />;
                        case 'students':
                          return (isAdmin || isTeacher) ? <StudentManagement /> : <Dashboard setActiveTab={setActiveTab} />;
                        case 'users':
                          return isAdmin ? <UserManagement /> : <Dashboard setActiveTab={setActiveTab} />;
                        case 'reports':
                          return <Reports />;
                        default:
                          return (
                            <div className="p-8 flex items-center justify-center min-h-[50vh]">
                              <div className="text-center">
                                <p className="text-gray-400 font-medium italic mb-4 text-lg">Content for {activeTab} is coming soon...</p>
                                <button onClick={() => setActiveTab('dashboard')} className="text-black font-bold underline underline-offset-4">Return to Dashboard</button>
                              </div>
                            </div>
                          );
                      }
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>
        </div>
      );

    case 'not-found':
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-6 text-center font-sans">
          <div className="max-w-md space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">Page Not Found</h1>
            <p className="text-gray-500 text-sm font-semibold leading-relaxed">
              We couldn't locate the page you were searching for. It might have been relocated, or it does not exist.
            </p>
            <div className="pt-2">
              <Button variant="primary" onClick={() => navigate('/')} className="font-bold text-xs py-3 px-6 rounded-xl shadow-lg shadow-black/5">
                Go to Homepage
              </Button>
            </div>
          </div>
        </div>
      );
  }
}
