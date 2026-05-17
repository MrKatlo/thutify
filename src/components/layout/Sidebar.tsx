import { BookOpen, Home, LogOut, Users, Bell, DollarSign, BarChart2, CheckSquare, Award, Settings, FileText, Activity, PenTool, GraduationCap, Video, Calendar, Folder } from 'lucide-react';
import { Button } from '../ui/Card';
import { logout, db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';

export function Sidebar({ 
  activeTab, 
  setActiveTab,
  isOpen,
  setIsOpen
}: { 
  activeTab: string, 
  setActiveTab: (tab: string) => void,
  isOpen: boolean,
  setIsOpen: (open: boolean) => void
}) {
  const { profile } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'teacher', 'student'] },
    { id: 'courses', label: 'Courses', icon: BookOpen, roles: ['admin', 'teacher', 'student'] },
    { id: 'students', label: 'Students', icon: Users, roles: ['admin', 'teacher'] },
    { id: 'teachers', label: 'Teachers', icon: GraduationCap, roles: ['admin'] },
    { id: 'financials', label: 'Financials', icon: DollarSign, roles: ['admin', 'student'] },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare, roles: ['admin', 'teacher', 'student'] },
    { id: 'assessment', label: 'Assignments', icon: PenTool, roles: ['admin', 'teacher', 'student'] },
    { id: 'liveclasses', label: 'Live Classes', icon: Video, roles: ['admin', 'teacher'] },
    { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ['admin', 'teacher', 'student'] },
    { id: 'library', label: 'Content Library', icon: Folder, roles: ['admin', 'teacher'] },
    { id: 'certificates', label: 'Certificates', icon: Award, roles: ['admin', 'student'] },
    { id: 'announcements', label: 'Announcements', icon: Bell, roles: ['admin', 'teacher', 'student'] },
    { id: 'reports', label: 'Reports', icon: BarChart2, roles: ['admin', 'teacher', 'student'] },
    { id: 'content', label: 'CMS Content', icon: FileText, roles: ['admin'] },
    { id: 'monitoring', label: 'Monitoring', icon: Activity, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'teacher', 'student'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  const handleRoleChange = async (newRole: any) => {
    localStorage.setItem('user_role', newRole);
    if (profile?.uid) {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          role: newRole
        });
      } catch (err) {
        console.error("Failed to persist role change to Firestore:", err);
      }
    }
    window.location.reload();
  };

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden",
          isOpen ? "block" : "hidden"
        )}
        onClick={() => setIsOpen(false)}
      />
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col z-50 transition-transform lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <BookOpen className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">LearnFlow</span>
        </div>

        <nav className="space-y-1">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id 
                ? "bg-gray-100 text-black" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-4 px-2">
          <img 
            src={profile?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
            className="w-10 h-10 rounded-full border border-gray-200"
            alt="User avatar"
          />
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold truncate">{profile?.name || 'User'}</p>
            <select
              value={profile?.role || 'admin'}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="text-xs text-gray-500 font-bold uppercase bg-gray-50 border border-gray-200 rounded px-1 py-0.5 mt-0.5 outline-none cursor-pointer hover:bg-gray-100 hover:text-black transition-all"
            >
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={logout}
          className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
      </div>
    </>
  );
}
