import { useState, useMemo } from 'react';
import { 
  Home, Users, User, BookOpen, Layers, Edit3, CalendarCheck, 
  DollarSign, BarChart2, Bell, Award, ShieldCheck, 
  LayoutTemplate, Settings, Activity, Search, LogOut,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '../ui/Card';
import { logout } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { effectiveMenuRole } from '../../lib/roles';
import { Institution } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface MenuItem {
  id: string;
  label: string;
  roles?: string[];
}

interface MenuGroup {
  id: string;
  label: string;
  icon: any;
  roles?: string[];
  items: MenuItem[];
}

const MENU_DATA: MenuGroup[] = [
  {
    id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['owner', 'teacher', 'student'],
    items: [
      { id: 'dashboard/overview', label: 'Overview' },
      { id: 'dashboard/analytics', label: 'Analytics' },
      { id: 'dashboard/recent-activity', label: 'Recent Activity' },
      { id: 'dashboard/quick-actions', label: 'Quick Actions' },
    ]
  },
  {
    id: 'students', label: 'Students', icon: Users, roles: ['owner', 'teacher'],
    items: [
      { id: 'students/all', label: 'All Students' },
      { id: 'students/add', label: 'Add Student' },
      { id: 'students/profiles', label: 'Student Profiles' },
      { id: 'students/progress', label: 'Student Progress' },
      { id: 'students/enrollment', label: 'Enrollment Management' },
      { id: 'students/attendance', label: 'Student Attendance' },
      { id: 'students/performance', label: 'Student Performance' },
      { id: 'students/suspend', label: 'Suspend/Activate Students' },
      { id: 'students/export', label: 'Export Students' },
    ]
  },
  {
    id: 'teachers', label: 'Teachers', icon: Users, roles: ['owner'],
    items: [
      { id: 'teachers/all', label: 'All Teachers' },
      { id: 'teachers/add', label: 'Add Teacher' },
      { id: 'teachers/profiles', label: 'Teacher Profiles' },
      { id: 'teachers/assign', label: 'Assign Courses' },
      { id: 'teachers/performance', label: 'Teacher Performance' },
      { id: 'teachers/approval', label: 'Teacher Approval' },
      { id: 'teachers/attendance', label: 'Teacher Attendance' },
    ]
  },
  {
    id: 'courses', label: 'Courses', icon: BookOpen, roles: ['owner', 'teacher', 'student'],
    items: [
      { id: 'courses/all', label: 'All Courses' },
      { id: 'courses/create', label: 'Create Course' },
      { id: 'courses/categories', label: 'Categories' },
      { id: 'courses/materials', label: 'Course Materials' },
      { id: 'courses/enrollment', label: 'Course Enrollment' },
      { id: 'courses/analytics', label: 'Course Analytics' },
      { id: 'courses/published', label: 'Published Courses' },
      { id: 'courses/drafts', label: 'Draft Courses' },
    ]
  },
  {
    id: 'content', label: 'Course Content', icon: Layers, roles: ['owner', 'teacher'],
    items: [
      { id: 'content/syllabus', label: 'Syllabus' },
      { id: 'content/modules', label: 'Modules' },
      { id: 'content/lessons', label: 'Lessons' },
      { id: 'content/video', label: 'Video Lessons' },
      { id: 'content/resources', label: 'Documents & Resources' },
      { id: 'content/upload', label: 'Upload Materials' },
    ]
  },
  {
    id: 'assignments', label: 'Assignments & Exams', icon: Edit3, roles: ['owner', 'teacher', 'student'],
    items: [
      { id: 'assignments/all', label: 'Assignments' },
      { id: 'assignments/create', label: 'Create Assignment' },
      { id: 'assignments/quizzes', label: 'Quizzes' },
      { id: 'assignments/exams', label: 'Exams' },
      { id: 'assignments/manual-grading', label: 'Manual Grading' },
      { id: 'assignments/auto-grading', label: 'Auto Grading' },
      { id: 'assignments/results', label: 'Results Publishing' },
      { id: 'assignments/scheduling', label: 'Exam Scheduling' },
    ]
  },
  {
    id: 'attendance', label: 'Attendance', icon: CalendarCheck, roles: ['owner', 'teacher'],
    items: [
      { id: 'attendance/dashboard', label: 'Attendance Dashboard' },
      { id: 'attendance/record', label: 'Record Attendance' },
      { id: 'attendance/reports', label: 'Attendance Reports' },
      { id: 'attendance/late', label: 'Late Attendance Tracking' },
    ]
  },
  {
    id: 'finance', label: 'Finance', icon: DollarSign, roles: ['owner'],
    items: [
      { id: 'finance/payments', label: 'Payments' },
      { id: 'finance/balances', label: 'Outstanding Balances' },
      { id: 'finance/paid', label: 'Paid Students' },
      { id: 'finance/unpaid', label: 'Unpaid Students' },
      { id: 'finance/partial', label: 'Partial Payments' },
      { id: 'finance/invoices', label: 'Invoices' },
      { id: 'finance/receipts', label: 'Receipts' },
      { id: 'finance/refunds', label: 'Refunds' },
      { id: 'finance/installments', label: 'Installments' },
      { id: 'finance/revenue', label: 'Revenue Analytics' },
      { id: 'finance/expenses', label: 'Expenses' },
      { id: 'finance/methods', label: 'Payment Methods' },
    ]
  },
  {
    id: 'my-account', label: 'My Account', icon: User, roles: ['teacher', 'student'],
    items: [
      { id: 'teacher/profile', label: 'My Profile', roles: ['teacher'] },
      { id: 'teacher/attendance', label: 'My Attendance', roles: ['teacher'] },
      { id: 'teacher/performance', label: 'My Performance', roles: ['teacher'] },
      { id: 'settings/profile', label: 'Personal Settings' },
      { id: 'student/attendance', label: 'My Attendance', roles: ['student'] },
      { id: 'finance/payments', label: 'My Payments', roles: ['student'] },
      { id: 'student/certificates', label: 'My Certificates', roles: ['student'] },
      { id: 'settings/notifications', label: 'Notification Prefs' },
    ]
  },
  {
    id: 'reports', label: 'Reports & Analytics', icon: BarChart2, roles: ['owner', 'teacher'],
    items: [
      { id: 'reports/student', label: 'Student Reports', roles: ['owner'] },
      { id: 'reports/financial', label: 'Financial Reports', roles: ['owner'] },
      { id: 'reports/revenue', label: 'Revenue Reports', roles: ['owner'] },
      { id: 'reports/course', label: 'Course Reports' },
      { id: 'reports/attendance', label: 'Attendance Reports' },
      { id: 'reports/assignments', label: 'Assignment Completion', roles: ['teacher'] },
      { id: 'reports/teacher', label: 'Teacher Reports', roles: ['owner'] },
      { id: 'reports/performance', label: 'Performance Analytics', roles: ['owner'] },
      { id: 'reports/export', label: 'Export Reports', roles: ['owner'] },
    ]
  },
  {
    id: 'communication', label: 'Communication', icon: Bell, roles: ['owner', 'teacher'],
    items: [
      { id: 'communication/announcements', label: 'Announcements' },
      { id: 'communication/live-classes', label: 'Live Classes' },
      { id: 'communication/email', label: 'Email Notifications' },
      { id: 'communication/sms', label: 'SMS Notifications' },
      { id: 'communication/in-app', label: 'In-App Notifications' },
      { id: 'communication/discussions', label: 'Discussions' },
      { id: 'communication/chat', label: 'Chat Management' },
    ]
  },
  {
    id: 'certificates', label: 'Certificates', icon: Award, roles: ['owner'],
    items: [
      { id: 'certificates/generate', label: 'Generate Certificates' },
      { id: 'certificates/approval', label: 'Certificate Approval' },
      { id: 'certificates/verification', label: 'Certificate Verification' },
    ]
  },
  {
    id: 'users', label: 'Users & Permissions', icon: ShieldCheck, roles: ['owner'],
    items: [
      { id: 'users/roles', label: 'Roles' },
      { id: 'users/permissions', label: 'Permissions' },
      { id: 'users/restrictions', label: 'Access Restrictions' },
    ]
  },
  {
    id: 'cms', label: 'Content Management', icon: LayoutTemplate, roles: ['owner'],
    items: [
      { id: 'cms/pages', label: 'Pages' },
      { id: 'cms/faqs', label: 'FAQs' },
      { id: 'cms/banners', label: 'Banners' },
    ]
  },
  {
    id: 'settings', label: 'Settings', icon: Settings, roles: ['owner'],
    items: [
      { id: 'settings/branding', label: 'Branding' },
      { id: 'settings/logo', label: 'Logo Upload' },
      { id: 'settings/theme', label: 'Theme Colors' },
      { id: 'settings/email', label: 'Email Settings' },
      { id: 'settings/localization', label: 'Localization' },
      { id: 'settings/timezone', label: 'Timezone' },
      { id: 'settings/currency', label: 'Currency' },
      { id: 'settings/gateways', label: 'Payment Gateways' },
      { id: 'settings/security', label: 'Security Settings' },
    ]
  },
  {
    id: 'monitoring', label: 'Monitoring', icon: Activity, roles: ['owner'],
    items: [
      { id: 'monitoring/activity', label: 'Activity Logs' },
      { id: 'monitoring/login', label: 'Login History' },
      { id: 'monitoring/errors', label: 'Error Logs' },
      { id: 'monitoring/database', label: 'Database Monitoring' },
      { id: 'monitoring/performance', label: 'Performance Monitoring' },
    ]
  }
];

export function Sidebar({ 
  activeTab, 
  setActiveTab,
  isOpen,
  setIsOpen,
  institution
}: { 
  activeTab: string, 
  setActiveTab: (tab: string) => void,
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  institution?: Institution | null
}) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Find which group contains the currently active tab so we can auto-expand it
  const initialExpandedGroupId = useMemo(() => {
    const foundGroup = MENU_DATA.find(group => group.items.some(item => item.id === activeTab));
    return foundGroup ? foundGroup.id : 'dashboard';
  }, [activeTab]);

  const [expandedGroups, setExpandedGroups] = useState<string[]>([initialExpandedGroupId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const filteredMenu = useMemo(() => {
    const menuRole = effectiveMenuRole(profile?.role);
    if (!menuRole) return [];

    return MENU_DATA.filter(group => {
      if (group.roles && !group.roles.includes(menuRole)) return false;
      
      // Search check
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesGroup = group.label.toLowerCase().includes(query);
        const matchesItems = group.items.some(item => item.label.toLowerCase().includes(query));
        return matchesGroup || matchesItems;
      }
      return true;
    }).map(group => {
      let items = group.items;

      if (group.id === 'my-account') {
        items = items.filter((item) => !item.roles || item.roles.includes(menuRole));
      }

      if (menuRole === 'teacher') {
        if (group.id === 'students') {
          items = items.filter((item) => !['students/add', 'students/suspend', 'students/export'].includes(item.id));
        }
        if (group.id === 'courses') {
          items = items.filter((item) => !['courses/create', 'courses/categories'].includes(item.id));
        }
        if (group.id === 'reports') {
          items = items.filter((item) => !item.roles || item.roles.includes('teacher'));
        }
        if (group.id === 'dashboard') {
          items = items.map((item) => {
            if (item.id === 'dashboard/analytics') {
              return { ...item, id: 'dashboard/my-classes', label: 'My Classes' };
            }
            if (item.id === 'dashboard/quick-actions') {
              return { ...item, id: 'dashboard/my-schedule', label: 'My Schedule' };
            }
            if (item.id === 'dashboard/recent-activity') {
              return { ...item, id: 'dashboard/pending-grading', label: 'Pending Grading' };
            }
            return item;
          });
        }
      }

      if (menuRole === 'student') {
        if (group.id === 'dashboard') {
          items = items
            .filter((item) => item.id === 'dashboard/overview' || item.id === 'dashboard/recent-activity' || item.id === 'dashboard/quick-actions')
            .map((item) => {
              if (item.id === 'dashboard/recent-activity') {
                return { ...item, label: 'Upcoming Tasks' };
              }
              if (item.id === 'dashboard/quick-actions') {
                return { ...item, id: 'courses/all', label: 'My Courses' };
              }
              return item;
            });
        }
        if (group.id === 'courses') {
          items = items
            .filter((item) => item.id === 'courses/all')
            .map((item) => ({ ...item, label: 'My Courses' }));
        }
        if (group.id === 'assignments') {
          items = items
            .filter((item) => ['assignments/all', 'assignments/quizzes', 'assignments/exams'].includes(item.id))
            .map((item) => (item.id === 'assignments/all' ? { ...item, label: 'My Assignments' } : item));
        }
      }

      if (!searchQuery) return { ...group, items };
      return {
        ...group,
        items: items.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || group.label.toLowerCase().includes(searchQuery.toLowerCase()))
      };
    });
  }, [profile?.role, searchQuery]);

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 z-40 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />
      <div className={cn(
        "fixed inset-y-0 left-0 w-72 bg-[#fdfdfc] border-r border-gray-100 flex flex-col z-50 transition-transform lg:relative lg:translate-x-0 overflow-hidden shadow-2xl lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 shrink-0 bg-[#fdfdfc] z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              {institution?.logoUrl ? (
                <img src={institution.logoUrl} className="w-full h-full object-contain rounded-xl" alt="" />
              ) : (
                <BookOpen className="text-black w-5 h-5" />
              )}
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900 truncate">
              {institution?.name || 'LearnFlow LMS'}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all placeholder:text-gray-400 font-medium"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 custom-scrollbar">
          {filteredMenu.map((group) => {
            const isExpanded = expandedGroups.includes(group.id) || !!searchQuery;
            const hasActiveChild = group.items.some(item => item.id === activeTab);
            
            return (
              <div key={group.id} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                    hasActiveChild ? "text-black" : "text-gray-600 hover:bg-gray-50 hover:text-black"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <group.icon className={cn("w-4 h-4", hasActiveChild ? "text-black" : "text-gray-400")} />
                    {group.label}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-10 pr-2 py-1 space-y-1 border-l-2 border-gray-100 ml-4 my-1">
                        {group.items.map(item => {
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveTab(item.id);
                                if (window.innerWidth < 1024) setIsOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all relative",
                                isActive 
                                  ? "bg-black/5 text-black" 
                                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              {isActive && (
                                <motion.div layoutId="activeTabIndicator" className="absolute left-[-18px] top-1/2 -translate-y-1/2 w-1 h-4 bg-black rounded-r-full" />
                              )}
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-gray-100 bg-[#fdfdfc]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img 
              src={profile?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
              className="w-10 h-10 rounded-full border border-gray-200"
              alt="User avatar"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{profile?.fullName || 'User'}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{profile?.role}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={logout}
            className="w-full justify-start text-red-600 hover:bg-red-50 py-2.5 rounded-xl font-bold"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #d1d5db; }
      `}</style>
    </>
  );
}
