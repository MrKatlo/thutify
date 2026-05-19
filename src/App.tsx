import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CourseList } from './components/courses/CourseList';
import { Announcements } from './components/Announcements';
import { Financials } from './components/Financials';
import { StudentManagement } from './components/StudentManagement';
import { UserManagement } from './components/UserManagement';
import { Reports } from './components/Reports';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, AlertCircle, LogOut } from 'lucide-react';
import { Button } from './components/ui/Card';
import { logout } from './lib/firebase';

export default function App() {
  const { user, profile, loading, isAuthenticated, isActive, isAdmin, isTeacher } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
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

  if (!user) {
    return <AuthPage />;
  }

  // Institutional Check: User is logged in but has no institutional profile
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-6 text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Unauthorized Access</h1>
          <p className="text-gray-500 mb-8">Your account is not associated with this institution. Please contact your administrator for an invite.</p>
          <Button onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // Suspended Check
  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-6 text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
          <p className="text-gray-500 mb-8">Your institutional access has been suspended. Please contact the administrative office for more information.</p>
          <Button onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
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
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <div className="flex flex-1 min-h-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className="flex-1 overflow-y-auto w-full flex flex-col">
          <header className="lg:hidden bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Menu className="text-white w-4 h-4" />
              </div>
              <span className="font-bold tracking-tight">LearnFlow</span>
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
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
