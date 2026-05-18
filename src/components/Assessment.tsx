import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { FileText, Plus, Clock, CheckCircle, Trash2, Edit2, User, ArrowLeft, HelpCircle, GraduationCap, Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Assessment() {
  const { profile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'assignments' | 'submissions' | 'quizzes'>('assignments');
  const [loading, setLoading] = useState(true);

  // Firestore Lists
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Modals & Form Visibility
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  
  // Student Quiz Attempt State
  const [activeQuizAttempt, setActiveQuizAttempt] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizScoreResult, setQuizScoreResult] = useState<number | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [activeQuizReview, setActiveQuizReview] = useState<any | null>(null);

  // Student Assignment Submission State
  const [submitAssignmentTarget, setSubmitAssignmentTarget] = useState<any | null>(null);
  const [studentSubmitLink, setStudentSubmitLink] = useState('');
  const [studentSubmitNotes, setStudentSubmitNotes] = useState('');

  // Assignment Form State
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignCourse, setAssignCourse] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignFileUrl, setAssignFileUrl] = useState('');
  const [isEditingAssign, setIsEditingAssign] = useState<any | null>(null);

  // Quiz Form State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizCourse, setQuizCourse] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('15');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([
    { question: '', options: ['', '', '', ''], answer: '' }
  ]);

  // Grading Form State
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  useEffect(() => {
    fetchData();
  }, [profile]);

  const getMockCourses = () => [
    { id: 'c1', title: 'Advanced Mathematics' },
    { id: 'c2', title: 'Physics 101' },
    { id: 'c3', title: 'Introduction to Programming' }
  ];

  const getMockAssignments = () => [
    { id: 'a1', title: 'Calculus Homework 1', description: 'Complete derivation sheet.', courseId: 'c1', courseName: 'Advanced Mathematics', dueDate: '2026-06-01', fileUrl: '', teacherId: profile?.uid || 't1' },
    { id: 'a2', title: 'Mechanics Lab Report', description: 'Submit experimental write-up.', courseId: 'c2', courseName: 'Physics 101', dueDate: '2026-06-05', fileUrl: '', teacherId: profile?.uid || 't2' }
  ];

  const getMockSubmissions = () => [
    { id: 's1', assignmentId: 'a1', assignmentTitle: 'Calculus Homework 1', studentId: 'stud1', studentName: 'Alex Johnson', courseName: 'Advanced Mathematics', fileUrl: 'https://github.com/alexj/math', submittedAt: new Date(), grade: '', feedback: '', status: 'pending' },
    { id: 's2', assignmentId: 'a2', assignmentTitle: 'Mechanics Lab Report', studentId: 'stud2', studentName: 'Maria Garcia', courseName: 'Physics 101', fileUrl: 'https://drive.google.com/mariag', submittedAt: new Date(), grade: '90', feedback: 'Great job!', status: 'graded' }
  ];

  const getMockQuizzes = () => [
    {
      id: 'q1',
      title: 'Algebra Evaluation Quiz',
      courseName: 'Advanced Mathematics',
      timeLimit: 15,
      questions: [
        { question: 'What is the derivative of x^2?', options: ['x', '2x', 'x^2', '2'], answer: '2x' },
        { question: 'Solve: 3x + 5 = 20', options: ['3', '5', '6', '4'], answer: '5' }
      ],
      status: 'published'
    }
  ];

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [snapAssign, snapSubmissions, snapQuizzes, snapCourses, snapStudents, snapQuizAttempts] = await Promise.all([
        getDocs(collection(db, 'assignments')),
        getDocs(collection(db, 'submissions')),
        getDocs(collection(db, 'quizzes')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'quizAttempts'))
      ]);

      const fetchedAssign = snapAssign.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as any));
      const fetchedSubmissions = snapSubmissions.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as any));
      const fetchedQuizzes = snapQuizzes.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as any));
      const fetchedCourses = snapCourses.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as any));
      const fetchedStudents = snapStudents.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as any));
      const fetchedQuizAttempts = snapQuizAttempts.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as any));

      setCourses(fetchedCourses.length > 0 ? fetchedCourses : getMockCourses());
      setStudents(fetchedStudents.length > 0 ? fetchedStudents : []);
      
      // Filter based on roles
      if (profile.role === 'teacher') {
        // Teacher sees only assignments they created
        setAssignments(fetchedAssign.length > 0 ? fetchedAssign.filter(a => a.teacherId === profile.uid) : getMockAssignments());
        setQuizzes(fetchedQuizzes.length > 0 ? fetchedQuizzes.filter(q => q.teacherId === profile.uid) : getMockQuizzes());
        setSubmissions(fetchedSubmissions.length > 0 ? fetchedSubmissions : getMockSubmissions());
      } else {
        // Students see everything published
        setAssignments(fetchedAssign.length > 0 ? fetchedAssign : getMockAssignments());
        setQuizzes(fetchedQuizzes.length > 0 ? fetchedQuizzes.filter(q => q.status === 'published') : getMockQuizzes());
        setSubmissions(fetchedSubmissions.length > 0 ? fetchedSubmissions.filter(s => s.studentId === profile.uid) : getMockSubmissions());
        setQuizAttempts(fetchedQuizAttempts.filter(qa => qa.studentId === profile.uid));
      }
    } catch (err) {
      console.warn("Firestore assessment load failed. Using structured fallback mock models:", err);
      setCourses(getMockCourses());
      setAssignments(getMockAssignments());
      setSubmissions(getMockSubmissions());
      setQuizzes(getMockQuizzes());
    } finally {
      setLoading(false);
    }
  };

  // Assignment Actions
  const handleSaveAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      if (isEditingAssign) {
        await updateDoc(doc(db, 'assignments', isEditingAssign.id), {
          title: assignTitle,
          description: assignDesc,
          courseName: assignCourse,
          dueDate: assignDueDate,
          fileUrl: assignFileUrl
        });
      } else {
        await addDoc(collection(db, 'assignments'), {
          title: assignTitle,
          description: assignDesc,
          courseName: assignCourse,
          dueDate: assignDueDate,
          fileUrl: assignFileUrl,
          teacherId: profile.uid,
          createdAt: serverTimestamp()
        });
      }
      resetAssignForm();
      setShowAssignForm(false);
      fetchData();
      alert("Assignment successfully synchronized with Firestore!");
    } catch (error) {
      handleFirestoreError(error, isEditingAssign ? OperationType.UPDATE : OperationType.CREATE, 'assignments');
    }
  };

  const handleEditAssign = (a: any) => {
    setIsEditingAssign(a);
    setAssignTitle(a.title);
    setAssignDesc(a.description);
    setAssignCourse(a.courseName);
    setAssignDueDate(a.dueDate);
    setAssignFileUrl(a.fileUrl || '');
    setShowAssignForm(true);
  };

  const handleDeleteAssign = async (assignId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await deleteDoc(doc(db, 'assignments', assignId));
      fetchData();
      alert("Assignment permanently deleted.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignments/${assignId}`);
    }
  };

  const resetAssignForm = () => {
    setAssignTitle('');
    setAssignDesc('');
    setAssignCourse('');
    setAssignDueDate('');
    setAssignFileUrl('');
    setIsEditingAssign(null);
  };

  // Submission & Grading Actions
  const handleGradeSubmission = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    try {
      await updateDoc(doc(db, 'submissions', gradingSubmission.id), {
        grade: gradeInput,
        feedback: feedbackInput,
        status: 'graded'
      });
      setGradingSubmission(null);
      setGradeInput('');
      setFeedbackInput('');
      fetchData();
      alert("Grade and feedback registered successfully!");
    } catch (err) {
      console.error("Grading failed:", err);
    }
  };

  // Quiz Form Actions
  const handleAddQuestion = () => {
    setQuizQuestions([...quizQuestions, { question: '', options: ['', '', '', ''], answer: '' }]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: string, val: string) => {
    const nextQ = [...quizQuestions];
    nextQ[idx].question = val;
    setQuizQuestions(nextQ);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, val: string) => {
    const nextQ = [...quizQuestions];
    nextQ[qIdx].options[oIdx] = val;
    setQuizQuestions(nextQ);
  };

  const handleAnswerSelect = (qIdx: number, val: string) => {
    const nextQ = [...quizQuestions];
    nextQ[qIdx].answer = val;
    setQuizQuestions(nextQ);
  };

  const handleSaveQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await addDoc(collection(db, 'quizzes'), {
        title: quizTitle,
        courseName: quizCourse,
        timeLimit: Number(quizTimeLimit),
        questions: quizQuestions,
        teacherId: profile.uid,
        status: 'published',
        createdAt: serverTimestamp()
      });
      setShowQuizForm(false);
      setQuizTitle('');
      setQuizCourse('');
      setQuizTimeLimit('15');
      setQuizQuestions([{ question: '', options: ['', '', '', ''], answer: '' }]);
      fetchData();
      alert("Evaluation Quiz published successfully!");
    } catch (err) {
      console.error("Quiz creation failed:", err);
    }
  };

  // Student Actions: Take Quiz
  const handleQuizAnswersSubmit = async () => {
    let score = 0;
    activeQuizAttempt.questions.forEach((q: any, idx: number) => {
      if (quizAnswers[qIdxAsNumber(idx)] === q.answer) {
        score += 1;
      }
    });
    const finalPercent = Math.round((score / activeQuizAttempt.questions.length) * 100);
    
    if (profile) {
      try {
        await addDoc(collection(db, 'quizAttempts'), {
          quizId: activeQuizAttempt.id,
          quizTitle: activeQuizAttempt.title,
          courseName: activeQuizAttempt.courseName,
          studentId: profile.uid,
          studentName: profile.fullName,
          answers: quizAnswers,
          score: finalPercent,
          submittedAt: new Date(),
          questions: activeQuizAttempt.questions,
          status: 'completed'
        });
      } catch (err) {
        console.error("Failed to save quiz attempt:", err);
      }
    }

    setQuizScoreResult(finalPercent);
    fetchData();
  };

  const qIdxAsNumber = (idx: any) => {
    return Number(idx);
  };

  // Student Actions: Submit Assignment
  const handleStudentSubmitAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !submitAssignmentTarget) return;
    try {
      const existing = submissions.find(s => s.assignmentId === submitAssignmentTarget.id && s.studentId === profile.uid);
      
      if (existing) {
        // Edit existing submission
        await updateDoc(doc(db, 'submissions', existing.id), {
          fileUrl: studentSubmitLink,
          notes: studentSubmitNotes,
          submittedAt: new Date()
        });
        alert("Homework submission updated successfully!");
      } else {
        // Create new submission
        await addDoc(collection(db, 'submissions'), {
          assignmentId: submitAssignmentTarget.id,
        assignmentTitle: submitAssignmentTarget.title,
        studentId: profile.uid,
        studentName: profile.fullName,
        courseName: submitAssignmentTarget.courseName,
        fileUrl: studentSubmitLink,
        notes: studentSubmitNotes,
        submittedAt: new Date(),
        grade: '',
        feedback: '',
        status: 'pending'
      });
        alert("Homework successfully submitted to classroom!");
      }
      
      setSubmitAssignmentTarget(null);
      setStudentSubmitLink('');
      setStudentSubmitNotes('');
      fetchData();
    } catch (err) {
      console.error("Assignment submission failed:", err);
    }
  };

  const teacherSubTabs = [
    { id: 'assignments', label: 'Homework & Assignments', count: assignments.length },
    { id: 'submissions', label: 'Submissions & Grading', count: submissions.filter(s => s.status === 'pending').length },
    { id: 'quizzes', label: 'Evaluation Quizzes', count: quizzes.length }
  ];

  if (profile?.role === 'student') {
    if (activeQuizAttempt) {
      return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => { setActiveQuizAttempt(null); setQuizAnswers({}); setQuizScoreResult(null); }}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" /> Cancel Quiz
            </button>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Interactive Evaluation Engine</span>
          </div>

          <Card title={activeQuizAttempt.title} description={`${activeQuizAttempt.courseName} • Limit: ${activeQuizAttempt.timeLimit} minutes`}>
            {quizScoreResult !== null ? (
              <div className="text-center py-8 space-y-4 animate-fadeIn">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto animate-bounce" />
                <h3 className="text-2xl font-black">Evaluation Completed!</h3>
                <p className="text-gray-500 font-medium">Your answers have been graded automatically.</p>
                <div className="bg-black text-white p-6 rounded-3xl max-w-sm mx-auto shadow-xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Your Score</p>
                  <h4 className="text-4xl font-black mt-2">{quizScoreResult}%</h4>
                  <p className="text-xs opacity-60 font-bold uppercase tracking-widest mt-2">
                    {quizScoreResult >= 80 ? 'Grade: A • Distinction' : quizScoreResult >= 60 ? 'Grade: B • Passed' : 'Grade: F • Retake suggested'}
                  </p>
                </div>
                <Button 
                  onClick={() => { setActiveQuizAttempt(null); setQuizAnswers({}); setQuizScoreResult(null); }}
                  className="bg-black text-white px-8 py-3"
                >
                  Return to Panel
                </Button>
              </div>
            ) : (
              <div className="space-y-8 mt-6">
                {activeQuizAttempt.questions.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="p-5 border border-gray-100 rounded-2xl space-y-4">
                    <p className="font-bold text-gray-900 flex items-start gap-2">
                      <HelpCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{qIdx + 1}. {q.question}</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                      {q.options.map((opt: string) => (
                        <div 
                          key={opt}
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: opt }))}
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
                    onClick={handleQuizAnswersSubmit}
                    disabled={Object.keys(quizAnswers).length < activeQuizAttempt.questions.length}
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
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Assignments & Exams</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">View active assignments, submit your homework, and take live quizzes.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card title="Active Assignments" description="Check due dates and submit files directly on this dashboard.">
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const submission = submissions.find(s => s.assignmentId === a.id);
                      return (
                        <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-gray-900 text-sm">
                            <p>{a.title}</p>
                            {a.description && <p className="text-xs font-normal text-gray-500 mt-0.5">{a.description}</p>}
                          </td>
                          <td className="py-4 px-4 text-xs font-bold text-gray-600">{a.courseName}</td>
                          <td className="py-4 px-4 text-xs font-bold text-gray-500">{a.dueDate}</td>
                          <td className="py-4 px-4 text-right">
                            {submission ? (
                              submission.status === 'graded' ? (
                                <div className="text-right">
                                  <span className="text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">Score: {submission.grade}</span>
                                  {submission.feedback && <p className="text-[10px] text-gray-400 mt-0.5 italic">"{submission.feedback}"</p>}
                                </div>
                              ) : (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wide">Awaiting Grade</span>
                                  <button 
                                    onClick={() => {
                                      setSubmitAssignmentTarget(a);
                                      setStudentSubmitLink(submission.fileUrl || '');
                                      setStudentSubmitNotes(submission.notes || '');
                                    }}
                                    className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-wider underline underline-offset-2"
                                  >
                                    Edit Submission
                                  </button>
                                </div>
                              )
                            ) : (
                              <Button 
                                onClick={() => setSubmitAssignmentTarget(a)}
                                className="text-xs py-1 bg-black text-white hover:bg-gray-800"
                              >
                                Submit Work
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card title="Available Quizzes" description="Assessments with automated immediate grading.">
              <div className="space-y-4 mt-6">
                {quizzes.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4">No active quizzes assigned.</p>
                ) : (
                  quizzes.map((quiz) => (
                    <div key={quiz.id} className="p-4 border border-gray-100 rounded-2xl flex flex-col gap-3">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{quiz.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{quiz.courseName} • {quiz.questions?.length || 0} Questions</p>
                      </div>
                      <Button 
                        onClick={() => setActiveQuizAttempt(quiz)}
                        className="w-full text-xs py-2 bg-black text-white hover:bg-gray-800"
                      >
                        Take Quiz Now
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="My Performance Logs" description="Review past attempts and check correct answers.">
              <div className="space-y-4 mt-6">
                {quizAttempts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4">No completed attempts recorded.</p>
                ) : (
                  quizAttempts.map((attempt) => (
                    <div key={attempt.id} className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-xs text-gray-900">{attempt.quizTitle}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{attempt.courseName || 'Course'} • Score: {attempt.score}%</p>
                      </div>
                      <Button 
                        onClick={() => setActiveQuizReview(attempt)}
                        variant="outline"
                        className="text-[10px] py-1 px-2.5"
                      >
                        Review
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Student Submit Modal */}
        <AnimatePresence>
          {submitAssignmentTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={() => setSubmitAssignmentTarget(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
                <h2 className="text-xl font-bold tracking-tight mb-2">Submit Homework</h2>
                <p className="text-xs text-gray-500 mb-6">Deliverable: {submitAssignmentTarget.title}</p>

                <form onSubmit={handleStudentSubmitAssign} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Submission Link (PDF/Drive/GitHub)</label>
                    <input 
                      type="url" 
                      required 
                      value={studentSubmitLink}
                      onChange={(e) => setStudentSubmitLink(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Notes for Instructor</label>
                    <textarea 
                      value={studentSubmitNotes}
                      onChange={(e) => setStudentSubmitNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm h-24 resize-none"
                      placeholder="Add descriptions..."
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" type="button" onClick={() => { setSubmitAssignmentTarget(null); setStudentSubmitLink(''); setStudentSubmitNotes(''); }} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-2 bg-black text-white">Upload Deliverable</Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Student Quiz Answers Review Modal */}
        <AnimatePresence>
          {activeQuizReview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={() => setActiveQuizReview(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 max-h-[85vh] overflow-y-auto shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syllabus Evaluation Review</span>
                    <h3 className="text-xl font-black text-gray-900 mt-1">{activeQuizReview.quizTitle}</h3>
                    <p className="text-xs text-gray-500 mt-1">Your final graded score: <span className="font-extrabold text-black">{activeQuizReview.score}%</span></p>
                  </div>
                  <button onClick={() => setActiveQuizReview(null)} className="p-1 hover:bg-gray-100 rounded-lg font-bold text-gray-500 hover:text-black">✕</button>
                </div>

                <div className="space-y-6">
                  {activeQuizReview.questions?.map((q: any, qIdx: number) => {
                    const studentAns = activeQuizReview.answers?.[qIdx];
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
                  <Button onClick={() => setActiveQuizReview(null)} className="bg-black text-white hover:bg-gray-800 text-xs">
                    Close Review Panel
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Teacher Main View
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Assignments & Exams</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Design assignments, track student uploads, grade submissions, and author quizzes.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => setShowQuizForm(true)} variant="outline" className="gap-2">
            Create Quiz
          </Button>
          <Button onClick={() => { resetAssignForm(); setShowAssignForm(true); }} className="gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Create Assignment
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-100 pb-px">
        {teacherSubTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all relative ${
              activeSubTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-black rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-gray-50 rounded-3xl animate-pulse" />
      ) : (
        <div className="space-y-6">
          {activeSubTab === 'assignments' && (
            <Card title="Assigned Coursework" description="List of assignments authored for your classes.">
              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-gray-400 italic">No assignments authored yet.</td></tr>
                    ) : (
                      assignments.map(a => (
                        <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-gray-900 text-sm">
                            <p>{a.title}</p>
                            {a.description && <p className="text-xs font-normal text-gray-400 mt-0.5">{a.description}</p>}
                          </td>
                          <td className="py-4 px-4 text-xs font-bold text-gray-600">{a.courseName}</td>
                          <td className="py-4 px-4 text-xs font-semibold text-gray-500">{a.dueDate}</td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => handleEditAssign(a)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-50"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteAssign(a.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeSubTab === 'submissions' && (
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
                                onClick={() => setGradingSubmission(sub)}
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
          )}

          {activeSubTab === 'quizzes' && (
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
                          <td className="py-4 px-4 text-xs font-bold text-gray-500 text-right">{q.timeLimit} mins</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Assignment Creator Modal */}
      <AnimatePresence>
        {showAssignForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={resetAssignForm} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight">{isEditingAssign ? 'Edit Assignment' : 'Create Assignment'}</h2>
                <button onClick={() => { resetAssignForm(); setShowAssignForm(false); }} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveAssignment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Title</label>
                  <input 
                    type="text" 
                    required 
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Description</label>
                  <textarea 
                    required 
                    value={assignDesc}
                    onChange={(e) => setAssignDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm h-20 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Course Name</label>
                    <select 
                      required
                      value={assignCourse}
                      onChange={(e) => setAssignCourse(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                      <option value="Advanced Mathematics">Advanced Mathematics</option>
                      <option value="Physics 101">Physics 101</option>
                      <option value="Introduction to Programming">Introduction to Programming</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Due Date</label>
                    <input 
                      type="date" 
                      required 
                      value={assignDueDate}
                      onChange={(e) => setAssignDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Reference Link / File URL (Optional)</label>
                  <input 
                    type="url" 
                    value={assignFileUrl}
                    onChange={(e) => setAssignFileUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => { resetAssignForm(); setShowAssignForm(false); }} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-2 bg-black text-white">{isEditingAssign ? 'Save Changes' : 'Create Assignment'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Creator Modal */}
      <AnimatePresence>
        {showQuizForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowQuizForm(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
                <h2 className="text-xl font-bold tracking-tight">Quiz & Exam Authoring Tool</h2>
                <button onClick={() => setShowQuizForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveQuiz} className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Quiz Title</label>
                    <input 
                      type="text" 
                      required 
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="e.g. Calculus Midterm Evaluation"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Time Limit (Mins)</label>
                    <input 
                      type="number" 
                      required 
                      value={quizTimeLimit}
                      onChange={(e) => setQuizTimeLimit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Assign Course</label>
                  <select 
                    required 
                    value={quizCourse}
                    onChange={(e) => setQuizCourse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                    <option value="Advanced Mathematics">Advanced Mathematics</option>
                    <option value="Physics 101">Physics 101</option>
                    <option value="Introduction to Programming">Introduction to Programming</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-t pt-4">
                    <h3 className="font-bold text-gray-900 text-sm">Questions Config</h3>
                    <Button type="button" onClick={handleAddQuestion} className="text-xs bg-gray-50 hover:bg-gray-100 text-black border border-gray-200 gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add Question
                    </Button>
                  </div>

                  {quizQuestions.map((q, idx) => (
                    <div key={idx} className="p-4 border border-gray-100 bg-gray-50/50 rounded-2xl relative space-y-3">
                      {quizQuestions.length > 1 && (
                        <button type="button" onClick={() => handleRemoveQuestion(idx)} className="absolute right-3 top-3 text-red-500 text-xs font-semibold hover:underline">
                          Delete
                        </button>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Question {idx + 1}</label>
                        <input 
                          type="text" 
                          required 
                          value={q.question}
                          onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-sm"
                          placeholder="What is..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div key={oIdx}>
                            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Option {String.fromCharCode(65 + oIdx)}</label>
                            <input 
                              type="text" 
                              required 
                              value={opt}
                              onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-xs"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Correct Answer Key</label>
                        <select 
                          required 
                          value={q.answer}
                          onChange={(e) => handleAnswerSelect(idx, e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-xs"
                        >
                          <option value="">Select Correct Option</option>
                          {q.options.map((opt: string) => opt && (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 sticky bottom-0 bg-white z-10 pt-4 border-t border-gray-100">
                  <Button variant="outline" type="button" onClick={() => setShowQuizForm(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-2 bg-black text-white hover:bg-gray-800">Publish Quiz</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grading Modal */}
      <AnimatePresence>
        {gradingSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setGradingSubmission(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold tracking-tight mb-2">Grade Assignment</h2>
              <p className="text-xs text-gray-500 mb-6">Student: {gradingSubmission.studentName} • {gradingSubmission.assignmentTitle}</p>

              <form onSubmit={handleGradeSubmission} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Score (0-100)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    max="100"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    placeholder="95"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Feedback / Comments</label>
                  <textarea 
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm h-24 resize-none"
                    placeholder="Excellent integration work..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setGradingSubmission(null)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-2 bg-black text-white hover:bg-gray-800">Submit Grade</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface XProps {
  className?: string;
}

function X({ className }: XProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2} 
      stroke="currentColor" 
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
