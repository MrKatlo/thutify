import { BookOpen, Home, LogOut, Users, Bell, DollarSign, BarChart2, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '../ui/Card';
import { logout } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { Institution } from '../../types';

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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'owner', 'teacher', 'student'] },
    { id: 'courses', label: 'Courses', icon: BookOpen, roles: ['admin', 'owner', 'teacher', 'student'] },
    { id: 'students', label: 'Student Directory', icon: Users, roles: ['admin', 'owner', 'teacher'] },
    { id: 'users', label: 'User Management', icon: ShieldCheck, roles: ['admin', 'owner'] },
    { id: 'financials', label: 'Financials', icon: DollarSign, roles: ['admin', 'owner'] },
    { id: 'reports', label: 'Reports', icon: BarChart2, roles: ['admin', 'owner', 'teacher', 'student'] },
    { id: 'announcements', label: 'Announcements', icon: Bell, roles: ['admin', 'owner', 'teacher', 'student'] },
    { id: 'tracker', label: 'Admin Tracker', icon: ShieldCheck, roles: ['admin', 'owner'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

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
        "fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col z-50 transition-transform lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            {institution?.logoUrl ? (
              <img src={institution.logoUrl} className="w-full h-full object-contain rounded-xl" alt="" />
            ) : (
              <BookOpen className="text-black w-5 h-5" />
            )}
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900 truncate">
            {institution?.name || 'LearnFlow'}
          </span>
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
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{profile?.fullName || 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
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
