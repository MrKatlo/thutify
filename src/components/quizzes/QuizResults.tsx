import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Card';

interface QuizResultsProps {
  show: boolean;
  onClose: () => void;
  attempt: any;
}

export function QuizResults({ show, onClose, attempt }: QuizResultsProps) {
  if (!show || !attempt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syllabus Evaluation Review</span>
            <h3 className="text-xl font-black text-gray-900 mt-1">{attempt.quizTitle}</h3>
            <p className="text-xs text-gray-500 mt-1">Your final graded score: <span className="font-extrabold text-black">{attempt.score}%</span></p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg font-bold text-gray-500 hover:text-black">✕</button>
        </div>

        <div className="space-y-6">
          {attempt.questions?.map((q: any, qIdx: number) => {
            const studentAns = attempt.answers?.[qIdx];
            return (
              <div key={qIdx} className="p-4 border border-gray-100 rounded-2xl space-y-3">
                <p className="font-bold text-sm text-gray-900">{qIdx + 1}. {q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options?.map((opt: string) => {
                    const isSelected = studentAns === opt;
                    const isCorrect = q.answer === opt;
                    
                    let borderClass = "border-gray-100";
                    let bgClass = "bg-white";
                    if (isSelected) {
                      borderClass = isCorrect ? "border-green-500" : "border-red-500";
                      bgClass = isCorrect ? "bg-green-50/50" : "bg-red-50/50";
                    } else if (isCorrect) {
                      borderClass = "border-green-400 border-dashed";
                      bgClass = "bg-green-50/20";
                    }

                    return (
                      <div key={opt} className={`p-2.5 border rounded-xl flex items-center justify-between ${borderClass} ${bgClass}`}>
                        <span className="text-xs font-semibold text-gray-700">{opt}</span>
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {isCorrect ? 'Correct' : 'Your Answer'}
                            </span>
                          )}
                          {!isSelected && isCorrect && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                              Correct Option
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <Button onClick={onClose} className="bg-black text-white hover:bg-gray-800 text-xs">
            Close Review Panel
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
