import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CourseList } from './components/courses/CourseList';
import { Announcements } from './components/Announcements';
import { Sessions } from './components/Sessions';
import { Assessment } from './components/Assessment';
import { Financials } from './components/Financials';
import { StudentManagement } from './components/StudentManagement';
import { Reports } from './components/Reports';
import { TeacherManagement } from './components/TeacherManagement';
import { Attendance } from './components/Attendance';
import { Certificates } from './components/Certificates';
import { SystemSettings } from './components/SystemSettings';
import { ContentManagement } from './components/ContentManagement';
import { SystemMonitoring } from './components/SystemMonitoring';
import { LiveClasses } from './components/LiveClasses';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { ContentLibrary } from './components/ContentLibrary';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Button } from './components/ui/Card';

export default function App() {
  const { user, profile, loading, isMockMode } = useAuth();
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'courses':
        return <CourseList />;
      case 'announcements':
        return <Announcements />;
      case 'sessions':
        return <Sessions />;
      case 'assessment':
        return <Assessment />;
      case 'financials':
        return <Financials />;
      case 'students':
        return <StudentManagement />;
      case 'reports':
        return <Reports />;
      case 'teachers':
        return <TeacherManagement />;
      case 'attendance':
        return <Attendance />;
      case 'certificates':
        return <Certificates />;
      case 'content':
        return <ContentManagement />;
      case 'settings':
        return <SystemSettings />;
      case 'monitoring':
        return <SystemMonitoring />;
      case 'liveclasses':
        return <LiveClasses />;
      case 'calendar':
        return <ScheduleCalendar />;
      case 'library':
        return <ContentLibrary />;
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
      {isMockMode && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center justify-between gap-4 z-50">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚠️</span>
            <span>
              <strong>Firestore Permission Denied</strong>. Running in local mock mode. Please copy the rules in <code>firestore.rules</code> and publish them in your **Firebase Console** under Firestore -> Rules.
            </span>
          </div>
          <button 
            onClick={() => alert("1. Open your Firebase Console.\n2. Navigate to Firestore Database -> Rules.\n3. Copy the entire contents of your local 'firestore.rules' file.\n4. Paste them into the Firebase editor and click 'Publish'.\n\nOnce done, refresh this page and real roles will work perfectly!")}
            className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-1 rounded transition-all shrink-0 cursor-pointer"
          >
            How to fix?
          </button>
        </div>
      )}
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
