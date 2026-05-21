import { FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Card';
import { Plus, X } from 'lucide-react';

interface QuizBuilderProps {
  show: boolean;
  onClose: () => void;
  onSave: (e: FormEvent) => void;
  courses: any[];
  quizData: {
    title: string;
    course: string;
    timeLimit: string;
    questions: any[];
  };
  setQuizData: (data: any) => void;
}

export function QuizBuilder({
  show,
  onClose,
  onSave,
  courses,
  quizData,
  setQuizData
}: QuizBuilderProps) {
  if (!show) return null;

  const handleAddQuestion = () => {
    setQuizData({
      ...quizData,
      questions: [...quizData.questions, { question: '', options: ['', '', '', ''], answer: '' }]
    });
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.filter((_, i) => i !== idx)
    });
  };

  const handleQuestionChange = (idx: number, field: string, val: string) => {
    const nextQ = [...quizData.questions];
    nextQ[idx].question = val;
    setQuizData({ ...quizData, questions: nextQ });
  };

  const handleOptionChange = (qIdx: number, oIdx: number, val: string) => {
    const nextQ = [...quizData.questions];
    nextQ[qIdx].options[oIdx] = val;
    setQuizData({ ...quizData, questions: nextQ });
  };

  const handleAnswerSelect = (qIdx: number, val: string) => {
    const nextQ = [...quizData.questions];
    nextQ[qIdx].answer = val;
    setQuizData({ ...quizData, questions: nextQ });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
          <h2 className="text-xl font-bold tracking-tight">Quiz & Exam Authoring Tool</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Quiz Title</label>
              <input 
                type="text" 
                required 
                value={quizData.title}
                onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                placeholder="e.g. Calculus Midterm Evaluation"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Time Limit (Mins)</label>
              <input 
                type="number" 
                required 
                value={quizData.timeLimit}
                onChange={(e) => setQuizData({ ...quizData, timeLimit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Assign Course</label>
            <select 
              required 
              value={quizData.course}
              onChange={(e) => setQuizData({ ...quizData, course: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
            >
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.course_name || c.title}>{c.course_name || c.title}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-t pt-4">
              <h3 className="font-bold text-gray-900 text-sm">Questions Config</h3>
              <Button type="button" onClick={handleAddQuestion} className="text-xs bg-gray-50 hover:bg-gray-100 text-black border border-gray-200 gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Question
              </Button>
            </div>

            {quizData.questions.map((q, idx) => (
              <div key={idx} className="p-4 border border-gray-100 bg-gray-50/50 rounded-2xl relative space-y-3">
                {quizData.questions.length > 1 && (
                  <button type="button" onClick={() => handleRemoveQuestion(idx)} className="absolute right-3 top-3 text-red-500 text-xs font-semibold hover:underline">
                    Delete
                  </button>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Question {idx + 1}</label>
                  <input 
                    type="text" 
                    required 
                    value={q.question}
                    onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-sm"
                    placeholder="What is..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt: string, oIdx: number) => (
                    <div key={oIdx}>
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Option {String.fromCharCode(65 + oIdx)}</label>
                      <input 
                        type="text" 
                        required 
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-xs"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Correct Answer Key</label>
                  <select 
                    required 
                    value={q.answer}
                    onChange={(e) => handleAnswerSelect(idx, e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-xs"
                  >
                    <option value="">Select Correct Option</option>
                    {q.options.map((opt: string) => opt && (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 sticky bottom-0 bg-white z-10 pt-4 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-2 bg-black text-white hover:bg-gray-800">Publish Quiz</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
