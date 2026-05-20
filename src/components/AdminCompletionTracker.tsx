import { useState } from 'react';
import { Card } from './ui/Card';
import { ShieldCheck, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface TrackerItem {
  id: string;
  category: string;
  feature: string;
  status: 'not_started' | 'partial' | 'working' | 'broken';
  collection: string;
  notes: string;
  lastTested: string;
}

const initialChecklist: TrackerItem[] = [
  { id: '1', category: 'Authentication', feature: 'Admin/Owner Shared Access', status: 'working', collection: 'users / institutionUsers', notes: 'Dashboard logic correctly shares admin view for owners.', lastTested: new Date().toLocaleDateString() },
  { id: '2', category: 'Multi-Tenancy', feature: 'Students Management', status: 'broken', collection: 'users / institutionUsers', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '3', category: 'Multi-Tenancy', feature: 'Teachers Management', status: 'broken', collection: 'users / institutionUsers', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '4', category: 'Multi-Tenancy', feature: 'Courses Management', status: 'broken', collection: 'courses', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '5', category: 'Multi-Tenancy', feature: 'Modules Management', status: 'broken', collection: 'courses (sub-collection/array)', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '6', category: 'Multi-Tenancy', feature: 'Lessons Management', status: 'broken', collection: 'courses (sub-collection/array)', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '7', category: 'Multi-Tenancy', feature: 'Payments Management', status: 'broken', collection: 'payments', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '8', category: 'Multi-Tenancy', feature: 'Attendance Management', status: 'broken', collection: 'attendance', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '9', category: 'Multi-Tenancy', feature: 'Assignments Management', status: 'broken', collection: 'assignments / submissions', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '10', category: 'Multi-Tenancy', feature: 'Exams Management', status: 'broken', collection: 'assignments (type=exam)', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '11', category: 'Multi-Tenancy', feature: 'Announcements Management', status: 'broken', collection: 'announcements', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '12', category: 'Multi-Tenancy', feature: 'Certificates Management', status: 'broken', collection: 'certificates', notes: 'institutionId filtering & saving missing.', lastTested: new Date().toLocaleDateString() },
  { id: '13', category: 'Multi-Tenancy', feature: 'Reports Management', status: 'not_started', collection: 'reports / analytics', notes: 'Reports generation requires isolation.', lastTested: new Date().toLocaleDateString() },
  { id: '14', category: 'Multi-Tenancy', feature: 'System Settings', status: 'broken', collection: 'settings', notes: 'Settings must be per-institution.', lastTested: new Date().toLocaleDateString() },
  { id: '15', category: 'Multi-Tenancy', feature: 'Roles & Permissions', status: 'partial', collection: 'institutionUsers', notes: 'Role string filtering works in UI but lacks deeper backend validation.', lastTested: new Date().toLocaleDateString() },
];

export function AdminCompletionTracker() {
  const [items] = useState<TrackerItem[]>(initialChecklist);

  const getStatusConfig = (status: TrackerItem['status']) => {
    switch (status) {
      case 'working': return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Working' };
      case 'partial': return { icon: Loader2, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Partial' };
      case 'broken': return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Broken' };
      case 'not_started': default: return { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200', label: 'Not Started' };
    }
  };

  const completedCount = items.filter(i => i.status === 'working').length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-black" />
            Admin Panel Completion Tracker
          </h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            Live checklist enforcing the Admin Features Checklist requirements.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm min-w-[200px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</span>
            <span className="font-black text-lg">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-black transition-all duration-1000"
            />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-gray-200 shadow-xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="p-4 w-48">Category</th>
                <th className="p-4 min-w-[200px]">Feature</th>
                <th className="p-4 w-36">Status</th>
                <th className="p-4 min-w-[200px]">Collection</th>
                <th className="p-4 min-w-[300px]">Notes</th>
                <th className="p-4 w-32">Last Tested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => {
                const StatusConfig = getStatusConfig(item.status);
                const Icon = StatusConfig.icon;
                return (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="p-4">
                      <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">{item.category}</span>
                    </td>
                    <td className="p-4 font-bold text-sm text-gray-900">{item.feature}</td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${StatusConfig.bg} ${StatusConfig.color} ${StatusConfig.border}`}>
                        <Icon className={`w-3.5 h-3.5 ${item.status === 'partial' ? 'animate-spin' : ''}`} />
                        {StatusConfig.label}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono text-gray-500 bg-gray-50/50">{item.collection}</td>
                    <td className="p-4 text-xs font-medium text-gray-600 leading-relaxed">{item.notes}</td>
                    <td className="p-4 text-xs font-bold text-gray-400">{item.lastTested}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
