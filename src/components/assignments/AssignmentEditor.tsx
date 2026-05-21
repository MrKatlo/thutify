import { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Card';
import { X } from 'lucide-react';

interface AssignmentEditorProps {
  show: boolean;
  onClose: () => void;
  onSave: (e: FormEvent) => void;
  isEditing: boolean;
  courses: any[];
  formData: {
    title: string;
    description: string;
    course: string;
    dueDate: string;
    fileUrl: string;
  };
  setFormData: (data: any) => void;
}

export function AssignmentEditor({
  show,
  onClose,
  onSave,
  isEditing,
  courses,
  formData,
  setFormData
}: AssignmentEditorProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">{isEditing ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Title</label>
            <input 
              type="text" 
              required 
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Description</label>
            <textarea 
              required 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm h-20 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Course Name</label>
              <select
                required
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              >
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.course_name || c.title}>{c.course_name || c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Reference Link / File URL (Optional)</label>
            <input 
              type="url" 
              value={formData.fileUrl}
              onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-2 bg-black text-white">{isEditing ? 'Save Changes' : 'Create Assignment'}</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
