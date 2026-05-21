import { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Card';

interface GradingInterfaceProps {
  submission: any;
  onClose: () => void;
  onGrade: (e: FormEvent) => void;
  gradeInput: string;
  setGradeInput: (v: string) => void;
  feedbackInput: string;
  setFeedbackInput: (v: string) => void;
}

export function GradingInterface({
  submission,
  onClose,
  onGrade,
  gradeInput,
  setGradeInput,
  feedbackInput,
  setFeedbackInput
}: GradingInterfaceProps) {
  if (!submission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <h2 className="text-xl font-bold tracking-tight mb-2">Grade Assignment</h2>
        <p className="text-xs text-gray-500 mb-6">Student: {submission.studentName} • {submission.assignmentTitle}</p>

        <form onSubmit={onGrade} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Score (0-100)</label>
            <input 
              type="number" 
              required 
              min="0"
              max="100"
              value={gradeInput}
              onChange={(e) => setGradeInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              placeholder="95"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Feedback / Comments</label>
            <textarea 
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm h-24 resize-none"
              placeholder="Excellent integration work..."
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-2 bg-black text-white hover:bg-gray-800">Submit Grade</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
