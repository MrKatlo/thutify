import { Card, Button } from './ui/Card';
import { Calendar, Check, X, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export function Attendance() {
  const { profile } = useAuth();
  const courses = ['Advanced Mathematics', 'Physics 101', 'Introduction to Programming'];
  const students = [
    { name: 'Alex Johnson', status: 'present' },
    { name: 'Maria Garcia', status: 'absent' },
    { name: 'James Wilson', status: 'late' },
    { name: 'Emma Davis', status: 'present' },
    { name: 'Liam Smith', status: 'present' },
  ];

  if (profile?.role === 'student') {
    const studentHistory = [
      { date: 'May 16, 2024', course: 'Advanced Mathematics', time: '2:00 PM', status: 'present' },
      { date: 'May 15, 2024', course: 'Physics 101', time: '10:00 AM', status: 'present' },
      { date: 'May 14, 2024', course: 'Advanced Mathematics', time: '2:00 PM', status: 'late' },
      { date: 'May 13, 2024', course: 'Introduction to Programming', time: '11:00 AM', status: 'present' },
      { date: 'May 10, 2024', course: 'Physics 101', time: '10:00 AM', status: 'absent' },
    ];

    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Attendance Report</h1>
          <p className="text-gray-500 mt-1 font-medium">Monitor your presence, absences, and overall punctuality.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-black text-white border-none shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Check className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Overall Attendance</span>
            </div>
            <h3 className="text-3xl font-black">92%</h3>
            <p className="text-xs mt-2 opacity-60 font-bold uppercase tracking-widest">Target: 85% Minimum Requirement</p>
          </Card>

          <Card className="bg-green-50 border-green-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Total Classes Present</span>
            </div>
            <h3 className="text-3xl font-black text-green-900">24 Sessions</h3>
            <p className="text-xs mt-2 text-green-500 font-bold uppercase tracking-widest">Active & Consistent</p>
          </Card>

          <Card className="bg-red-50 border-red-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Absences & Late Arrivals</span>
            </div>
            <h3 className="text-3xl font-black text-red-900">1 Absent • 1 Late</h3>
            <p className="text-xs mt-2 text-red-500 font-bold uppercase tracking-widest">Excellent Punctuality</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card title="Subject Attendance Breakdown">
              <div className="space-y-4 mt-6">
                {[
                  { course: 'Advanced Mathematics', percent: 95, present: 11, total: 12 },
                  { course: 'Physics 101', percent: 88, present: 8, total: 9 },
                  { course: 'Introduction to Programming', percent: 100, present: 5, total: 5 },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm text-gray-900">{item.course}</p>
                      <span className="text-xs font-bold text-gray-500">{item.percent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                      <div className="bg-black h-1.5 rounded-full" style={{ width: `${item.percent}%` }}></div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Attended {item.present} of {item.total} classes
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card title="Recent Attendance Ledger" description="History of recent class attendance activities.">
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistory.map((h, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm font-bold text-gray-900">{h.date}</td>
                        <td className="py-4 px-4 text-sm font-semibold text-gray-700">{h.course}</td>
                        <td className="py-4 px-4 text-sm text-gray-500">{h.time}</td>
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1 font-medium">Record and track student attendance across all courses.</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-black text-white hover:bg-gray-800">
            <Calendar className="w-4 h-4 mr-2" />
            Today: {new Date().toLocaleDateString()}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card title="Select Course">
            <div className="space-y-2 mt-4">
              {courses.map((course, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border ${idx === 0 ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'} cursor-pointer transition-all`}
                >
                  <p className={`font-semibold ${idx === 0 ? 'text-black' : 'text-gray-700'}`}>{course}</p>
                  <p className="text-xs text-gray-500 mt-1">12 Enrolled • 2:00 PM</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Attendance Stats">
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-green-800 text-sm font-bold">Present</p>
                <p className="text-2xl font-extrabold text-green-900 mt-1">85%</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-red-800 text-sm font-bold">Absent</p>
                <p className="text-2xl font-extrabold text-red-900 mt-1">10%</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-yellow-800 text-sm font-bold">Late Arrivals</p>
                  <p className="text-2xl font-extrabold text-yellow-900 mt-1">5%</p>
                </div>
                <AlertCircle className="text-yellow-600 w-8 h-8 opacity-50" />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Mark Attendance" description="Advanced Mathematics - Module 4">
            <div className="mt-6 space-y-3">
              {students.map((student, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                      {student.name.charAt(0)}
                    </div>
                    <p className="font-semibold">{student.name}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
                    <button className={`p-2 rounded-md transition-colors ${student.status === 'present' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-gray-200'}`}>
                      <Check className="w-4 h-4" />
                    </button>
                    <button className={`p-2 rounded-md transition-colors ${student.status === 'absent' ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:bg-gray-200'}`}>
                      <X className="w-4 h-4" />
                    </button>
                    <button className={`p-2 rounded-md transition-colors ${student.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400 hover:bg-gray-200'}`}>
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-6">
              <Button variant="outline">Reset</Button>
              <Button className="bg-black text-white hover:bg-gray-800">Save Attendance</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
