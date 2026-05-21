import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Card';
import * as cfApi from '../../services/cfApi';
import { useAuth } from '../../hooks/useAuth';

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { institutionId } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && institutionId) {
      fetchNotifications();
    }
  }, [isOpen, institutionId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const list = await cfApi.listNotifications(institutionId);
      setNotifications(list);
    } catch (err) {
      console.error("Fetch notifications failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async () => {
    if (!institutionId) return;
    try {
      await cfApi.markNotificationsRead(institutionId);
      fetchNotifications();
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-4 z-50 w-80 md:w-96 bg-white border border-gray-100 rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div>
          <h3 className="font-bold text-gray-900">Notifications</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">In-app activity feed</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleMarkRead} className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest">Mark all read</button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-black transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-8 space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No recent notifications.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div key={n.id} className={`p-4 flex gap-3 hover:bg-gray-50 transition-all ${!n.read_at ? 'bg-blue-50/20' : ''}`}>
                <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${
                  n.type === 'assignment' ? 'bg-blue-100 text-blue-600' : 
                  n.type === 'grade' ? 'bg-green-100 text-green-600' : 
                  'bg-gray-100 text-gray-600'
                }`}>
                  <Info className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-gray-900 leading-tight">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">{n.body}</p>
                  <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {n.link && (
                  <button className="self-center p-2 text-gray-300 hover:text-black"><ExternalLink className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-gray-50/50 border-t border-gray-100 text-center">
        <button className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">Clear All History</button>
      </div>
    </div>
  );
}
