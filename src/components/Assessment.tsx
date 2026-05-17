import { Card, Button } from './ui/Card';
import { FileText, Plus, Clock, Users, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AlertCircle, HelpCircle, ArrowLeft } from 'lucide-react';

export function Assessment() {
  const { profile } = useAuth();
  const [activeQuiz, setActiveQuiz] = useState<boolean>(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<any>(null);
  const [submitLink, setSubmitLink] = useState('');

  const [studentAssignments, setStudentAssignments] = useState([
    { id: 1, title: 'Calculus Homework 1', type: 'Homework', course: 'Advanced Mathematics', dueDate: 'Tomorrow', status: 'Pending', grade: null },
    { id: 2, title: 'Mechanics Lab Report', type: 'Lab', course: 'Physics 101', dueDate: 'Next Week', status: 'Submitted', grade: null },
    { id: 3, title: 'Coding Practice 3', type: 'Project', course: 'Introduction to Programming', dueDate: 'Completed', status: 'Graded', grade: '95/100' },
  ]);

  const quizQuestions = [
    {
      id: 1,
      question: "What is the derivative of x^2 with respect to x?",
      options: ["x", "2x", "x^2", "2"],
      answer: "2x"
    },
    {
      id: 2,
      question: "Which of Newton's laws states that for every action, there is an equal and opposite reaction?",
      options: ["First Law", "Second Law", "Third Law", "Fourth Law"],
      answer: "Third Law"
    },
    {
      id: 3,
      question: "What does HTML stand for?",
      options: [
        "Hyper Text Markup Language",
        "Hyperlinks and Text Markup Language",
        "Home Tool Markup Language",
        "Hyper Tech Markup Language"
      ],
      answer: "Hyper Text Markup Language"
    }
  ];

  const handleQuizSubmit = () => {
    let correct = 0;
    quizQuestions.forEach((q) => {
      if (selectedAnswers[q.id] === q.answer) {
        correct += 1;
      }
    });
    const score = Math.round((correct / quizQuestions.length) * 100);
    setQuizResult(score);
  };

  const handleAssignmentSubmit = (e: any) => {
    e.preventDefault();
    setStudentAssignments(prev => prev.map(a => a.id === showSubmitModal.id ? { ...a, status: 'Submitted' } : a));
    setShowSubmitModal(null);
    setSubmitLink('');
    alert("Assignment successfully submitted!");
  };

  if (profile?.role === 'student') {
    if (activeQuiz) {
      return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => { setActiveQuiz(false); setQuizResult(null); setSelectedAnswers({}); }}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Assessments
            </button>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Interactive Quiz Engine</span>
          </div>

          <Card title="Module 1 Evaluation Quiz" description="Test your course understanding with automated direct evaluation.">
            {quizResult !== null ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-2xl font-black">Evaluation Completed!</h3>
                <p className="text-gray-500 font-medium">You have completed your evaluation quiz successfully.</p>
                <div className="bg-black text-white p-6 rounded-3xl max-w-sm mx-auto shadow-xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Your Score</p>
                  <h4 className="text-4xl font-black mt-2">{quizResult}%</h4>
                  <p className="text-xs opacity-60 font-bold uppercase tracking-widest mt-2">
                    {quizResult >= 80 ? 'Grade: A • Passed' : quizResult >= 60 ? 'Grade: B • Passed' : 'Grade: F • Retake Suggested'}
                  </p>
                </div>
                <Button 
                  onClick={() => { setActiveQuiz(false); setQuizResult(null); setSelectedAnswers({}); }}
                  className="bg-black text-white px-8 py-3"
                >
                  Return to Dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-8 mt-6">
                {quizQuestions.map((q, idx) => (
                  <div key={q.id} className="p-5 border border-gray-100 rounded-2xl space-y-4">
                    <p className="font-bold text-gray-900 flex items-start gap-2">
                      <HelpCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{idx + 1}. {q.question}</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                      {q.options.map((opt) => (
                        <div 
                          key={opt}
                          onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                            selectedAnswers[q.id] === opt ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-sm font-semibold text-gray-700">{opt}</span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedAnswers[q.id] === opt ? 'border-black' : 'border-gray-300'}`}>
                            {selectedAnswers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-black"></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <Button 
                    onClick={handleQuizSubmit}
                    disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                    className="bg-black text-white hover:bg-gray-800 px-8"
                  >
                    Submit Quiz & Grade
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Assignments & Exams</h1>
          <p className="text-gray-500 mt-1 font-medium">View active deliverables, submit your coursework, and take interactive evaluation quizzes.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card title="Active Assignments" description="Check due dates and submit files directly on this dashboard.">
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject & Type</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAssignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-gray-900 text-sm">{assignment.title}</td>
                        <td className="py-4 px-4">
                          <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded mr-2">{assignment.type}</span>
                          <span className="text-xs text-gray-500 font-semibold">{assignment.course}</span>
                        </td>
                        <td className="py-4 px-4 text-xs font-bold text-gray-600">{assignment.dueDate}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            assignment.status === 'Pending' ? 'bg-amber-50 text-amber-700' : assignment.status === 'Submitted' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {assignment.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {assignment.status === 'Pending' ? (
                            <Button 
                              onClick={() => setShowSubmitModal(assignment)}
                              className="text-xs py-1.5 bg-black text-white"
                            >
                              Submit Work
                            </Button>
                          ) : assignment.status === 'Graded' ? (
                            <span className="text-xs font-black text-black">{assignment.grade}</span>
                          ) : (
                            <span className="text-xs font-bold text-gray-400">Awaiting Grade</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card title="Evaluation Quizzes" description="Assessments with automatic immediate grading.">
              <div className="space-y-4 mt-6">
                {[
                  { title: 'Algebra Practice Quiz', desc: '10 questions • 15 minutes', status: 'Available' },
                  { title: 'Thermodynamics Test 1', desc: '5 questions • 10 minutes', status: 'Completed' }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 rounded-2xl flex flex-col gap-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    {item.status === 'Available' ? (
                      <Button 
                        onClick={() => setActiveQuiz(true)}
                        className="w-full text-xs py-2 bg-black text-white"
                      >
                        Take Quiz Now
                      </Button>
                    ) : (
                      <span className="text-center text-xs font-bold text-green-600 bg-green-50 py-1.5 rounded-lg">
                        Completed • 100%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Submit Assignment Modal */}
        <AnimatePresence>
          {showSubmitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div 
                onClick={() => setShowSubmitModal(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-8"
              >
                <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-2">Submit: {showSubmitModal.title}</h2>
                <p className="text-gray-500 text-xs mb-6">Course: {showSubmitModal.course}</p>
                <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Submission URL / Link</label>
                    <input 
                      type="url" 
                      required 
                      value={submitLink} 
                      onChange={(e) => setSubmitLink(e.target.value)}
                      placeholder="e.g. https://github.com/my-project" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Notes for Teacher</label>
                    <textarea 
                      placeholder="Enter optional description..." 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm h-24 resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" type="button" onClick={() => setShowSubmitModal(null)}>Cancel</Button>
                    <Button type="submit" className="bg-black text-white hover:bg-gray-800">Send Submission</Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

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
