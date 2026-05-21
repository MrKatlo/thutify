import { Card } from '../ui/Card';
import { AlertCircle } from 'lucide-react';

interface AttendanceAnalyticsProps {
  stats: {
    present: number;
    absent: number;
    late: number;
  };
  selectedCourseName: string;
}

export function AttendanceAnalytics({ stats, selectedCourseName }: AttendanceAnalyticsProps) {
  return (
    <Card title="Attendance Distribution" description={`Stats for ${selectedCourseName}`}>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <p className="text-green-800 text-xs font-bold uppercase tracking-wider">Present</p>
          <p className="text-2xl font-extrabold text-green-900 mt-1">{stats.present}%</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <p className="text-red-800 text-xs font-bold uppercase tracking-wider">Absent</p>
          <p className="text-2xl font-extrabold text-red-900 mt-1">{stats.absent}%</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 col-span-2 flex items-center justify-between">
          <div>
            <p className="text-yellow-800 text-xs font-bold uppercase tracking-wider">Late Arrivals</p>
            <p className="text-2xl font-extrabold text-yellow-900 mt-1">{stats.late}%</p>
          </div>
          <AlertCircle className="text-yellow-600 w-8 h-8 opacity-55" />
        </div>
      </div>
    </Card>
  );
}
