import { Card, Button } from './ui/Card';
import { Calendar, Check, X, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Attendance() {
  const courses = ['Advanced Mathematics', 'Physics 101', 'Introduction to Programming'];
  const students = [
    { name: 'Alex Johnson', status: 'present' },
    { name: 'Maria Garcia', status: 'absent' },
    { name: 'James Wilson', status: 'late' },
    { name: 'Emma Davis', status: 'present' },
    { name: 'Liam Smith', status: 'present' },
  ];

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
