import { Card, Button } from '../ui/Card';
import { ArrowLeft, HelpCircle, CheckCircle } from 'lucide-react';

interface QuizAttemptProps {
  quiz: any;
  onClose: () => void;
  onSubmit: (answers: Record<number, string>) => void;
  quizAnswers: Record<number, string>;
  setQuizAnswers: (v: any) => void;
  scoreResult: number | null;
}

export function QuizAttempt({
  quiz,
  onClose,
  onSubmit,
  quizAnswers,
  setQuizAnswers,
  scoreResult
}: QuizAttemptProps) {
  if (scoreResult !== null) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Panel
          </button>
        </div>
        <Card title="Evaluation Completed!" description="Your answers have been graded automatically.">
          <div className="text-center py-8 space-y-4 animate-fadeIn">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto animate-bounce" />
            <h3 className="text-2xl font-black">Success!</h3>
            <div className="bg-black text-white p-6 rounded-3xl max-w-sm mx-auto shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Your Score</p>
              <h4 className="text-4xl font-black mt-2">{scoreResult}%</h4>
              <p className="text-xs opacity-60 font-bold uppercase tracking-widest mt-2">
                {scoreResult >= 80 ? 'Grade: A • Distinction' : scoreResult >= 60 ? 'Grade: B • Passed' : 'Grade: F • Retake suggested'}
              </p>
            </div>
            <Button onClick={onClose} className="bg-black text-white px-8 py-3">
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel Quiz
        </button>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Interactive Evaluation Engine</span>
      </div>

      <Card title={quiz.title} description={`${quiz.course_name || quiz.courseName} • Limit: ${quiz.time_limit || quiz.timeLimit} minutes`}>
        <div className="space-y-8 mt-6">
          {(quiz.questions || []).map((q: any, qIdx: number) => (
            <div key={qIdx} className="p-5 border border-gray-100 rounded-2xl space-y-4">
              <p className="font-bold text-gray-900 flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <span>{qIdx + 1}. {q.question}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                {(q.options || []).map((opt: string) => (
                  <div 
                    key={opt}
                    onClick={() => setQuizAnswers({ ...quizAnswers, [qIdx]: opt })}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      quizAnswers[qIdx] === opt ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-sm font-semibold text-gray-700">{opt}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${quizAnswers[qIdx] === opt ? 'border-black' : 'border-gray-300'}`}>
                      {quizAnswers[qIdx] === opt && <div className="w-2 h-2 rounded-full bg-black"></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <Button 
              onClick={() => onSubmit(quizAnswers)}
              disabled={Object.keys(quizAnswers).length < (quiz.questions?.length || 0)}
              className="bg-black text-white hover:bg-gray-800 px-8"
            >
              Submit Quiz & Grade
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
