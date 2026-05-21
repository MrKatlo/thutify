import { Card, Button } from '../ui/Card';

interface SubmissionListProps {
  submissions: any[];
  onGrade: (s: any) => void;
}

export function SubmissionList({ submissions, onGrade }: SubmissionListProps) {
  return (
    <Card title="Student Submissions Ledger" description="Grade and view uploaded coursework.">
      <div className="overflow-x-auto mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Name</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignment</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Link</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Grade</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400 italic">No submissions logged yet.</td></tr>
            ) : (
              submissions.map(sub => (
                <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-900 text-sm">{sub.studentName}</td>
                  <td className="py-4 px-4 text-xs font-bold text-gray-600">{sub.assignmentTitle}</td>
                  <td className="py-4 px-4 text-xs">
                    <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="text-black underline font-semibold">View File</a>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      sub.status === 'graded' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {sub.status === 'graded' ? (
                      <div>
                        <span className="font-black text-sm text-gray-950">{sub.grade}%</span>
                        {sub.feedback && <p className="text-[10px] text-gray-400 italic mt-0.5">"{sub.feedback}"</p>}
                      </div>
                    ) : (
                      <Button 
                        onClick={() => onGrade(sub)}
                        className="text-xs py-1.5 bg-black text-white hover:bg-gray-800"
                      >
                        Grade Sub
                      </Button>
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
