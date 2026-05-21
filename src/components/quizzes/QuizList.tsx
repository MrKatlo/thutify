import { Card } from '../ui/Card';

interface QuizListProps {
  quizzes: any[];
  isTeacher: boolean;
  onTakeQuiz?: (quiz: any) => void;
  onDelete?: (id: string) => void;
}

export function QuizList({ quizzes, isTeacher, onTakeQuiz, onDelete }: QuizListProps) {
  return (
    <Card title="Configured Quizzes" description="Review available quizzes with auto-grading rules.">
      <div className="overflow-x-auto mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quiz Name</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Time Limit</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400 italic">No quizzes published yet.</td></tr>
            ) : (
              quizzes.map(q => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-900 text-sm">{q.title}</td>
                  <td className="py-4 px-4 text-xs font-bold text-gray-600">{q.courseName}</td>
                  <td className="py-4 px-4 text-xs font-bold text-gray-500">{q.questions?.length || 0} Questions</td>
                  <td className="py-4 px-4 text-xs font-bold text-gray-500 text-right">
                    {q.timeLimit} mins
                    {!isTeacher && onTakeQuiz && (
                      <button 
                        onClick={() => onTakeQuiz(q)}
                        className="ml-4 px-3 py-1 bg-black text-white text-[10px] font-bold rounded-lg uppercase tracking-wider"
                      >
                        Take
                      </button>
                    )}
                    {isTeacher && onDelete && (
                      <button 
                        onClick={() => onDelete(q.id)}
                        className="ml-4 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
