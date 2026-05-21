import { Card } from '../ui/Card';

interface AttendanceReportProps {
  history: any[];
}

export function AttendanceReport({ history }: AttendanceReportProps) {
  return (
    <Card title="Recent Attendance Ledger" description="History of recent class attendance activities.">
      <div className="overflow-x-auto mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-4 text-sm font-bold text-gray-900">{h.date}</td>
                <td className="py-4 px-4 text-sm font-semibold text-gray-700">{h.course || h.course_name}</td>
                <td className="py-4 px-4 text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    h.status === 'present' ? 'bg-green-50 text-green-700' : h.status === 'late' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {h.status?.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
