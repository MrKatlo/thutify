import { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationPanel } from './NotificationPanel';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all text-gray-500 hover:text-black relative shadow-sm"
      >
        <Bell className="w-5 h-5" />
        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-gray-50 animate-pulse"></span>
      </button>
      
      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
