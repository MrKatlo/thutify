import { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Card';
import { X } from 'lucide-react';

interface LiveClassCreateProps {
  show: boolean;
  onClose: () => void;
  onSave: (e: FormEvent) => void;
  courses: any[];
  formData: {
    title: string;
    courseName: string;
    dateTime: string;
    meetingLink: string;
    platform: string;
  };
  setFormData: (data: any) => void;
}

export function LiveClassCreate({
  show,
  onClose,
  onSave,
  courses,
  formData,
  setFormData
}: LiveClassCreateProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">Schedule Live Class</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Class Title</label>
            <input 
              type="text" 
              required 
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              placeholder="e.g. Advanced Calculus Q&A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Assign Course</label>
              <select
                required
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              >
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.course_name || c.title}>{c.course_name || c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Date & Time</label>
              <input 
                type="datetime-local" 
                required 
                value={formData.dateTime}
                onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Platform</label>
              <select 
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              >
                <option value="Zoom">Zoom</option>
                <option value="Google Meet">Google Meet</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Meeting Link</label>
              <input 
                type="url" 
                required 
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-2 bg-black text-white hover:bg-gray-800">Schedule Class</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
