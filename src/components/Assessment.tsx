import { Card, Button } from './ui/Card';
import { FileText, Plus, Clock, Users, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Assessment() {
  const assignments = [
    { id: 1, title: 'Midterm Evaluation', type: 'Exam', course: 'Advanced Mathematics', dueDate: 'Tomorrow', submissions: 45, total: 50, status: 'Active' },
    { id: 2, title: 'React Final Project', type: 'Project', course: 'Web Development', dueDate: 'Next Week', submissions: 12, total: 30, status: 'Active' },
    { id: 3, title: 'Physics Quiz 3', type: 'Quiz', course: 'Physics 101', dueDate: 'Last Week', submissions: 40, total: 40, status: 'Graded' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Assignments & Exams</h1>
          <p className="text-gray-500 mt-1 font-medium">Create, manage, and grade assessments across your courses.</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-2" />
            Create Assessment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[
          { label: 'Active Assignments', value: '12', icon: FileText, color: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Grading', value: '45', icon: Clock, color: 'text-orange-600 bg-orange-50' },
          { label: 'Completed', value: '128', icon: CheckCircle, color: 'text-green-600 bg-green-50' }
        ].map((stat, i) => (
          <Card key={i} className="flex items-center gap-4 p-6">
            <div className={`p-4 rounded-xl ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type & Course</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submissions</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment, idx) => (
                <motion.tr 
                  key={assignment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-4 font-bold text-gray-900">{assignment.title}</td>
                  <td className="py-4 px-4">
                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded mr-2">{assignment.type}</span>
                    <span className="text-sm text-gray-500 font-medium">{assignment.course}</span>
                  </td>
                  <td className="py-4 px-4 text-sm font-medium">{assignment.dueDate}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 w-24">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(assignment.submissions/assignment.total)*100}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-500">{assignment.submissions}/{assignment.total}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                      assignment.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {assignment.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button variant="outline" className="text-xs py-1.5">View</Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
