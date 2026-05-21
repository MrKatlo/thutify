import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Plus, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as cfApi from '../services/cfApi';

// Sub-components
import { AssignmentList } from './assignments/AssignmentList';
import { AssignmentEditor } from './assignments/AssignmentEditor';
import { SubmissionList } from './assignments/SubmissionList';
import { GradingInterface } from './assignments/GradingInterface';
import { QuizList } from './quizzes/QuizList';
import { QuizBuilder } from './quizzes/QuizBuilder';
import { QuizAttempt } from './quizzes/QuizAttempt';
import { QuizResults } from './quizzes/QuizResults';

export function Assessment() {
  const { profile, institutionId } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'assignments' | 'submissions' | 'quizzes'>('assignments');
  const [loading, setLoading] = useState(true);

  // Lists
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);

  // Modals & Form Visibility
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  
  // Student Quiz Attempt State
  const [activeQuizAttempt, setActiveQuizAttempt] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizScoreResult, setQuizScoreResult] = useState<number | null>(null);
  const [activeQuizReview, setActiveQuizReview] = useState<any | null>(null);

  // Student Assignment Submission State
  const [submitAssignmentTarget, setSubmitAssignmentTarget] = useState<any | null>(null);
  const [studentSubmitLink, setStudentSubmitLink] = useState('');
  const [studentSubmitNotes, setStudentSubmitNotes] = useState('');

  // Assignment Form State
  const [assignFormData, setAssignFormData] = useState({
    title: '',
    description: '',
    course: '',
    dueDate: '',
    fileUrl: ''
  });
  const [isEditingAssign, setIsEditingAssign] = useState<any | null>(null);

  // Quiz Form State
  const [quizFormData, setQuizFormData] = useState({
    title: '',
    course: '',
    timeLimit: '15',
    questions: [{ question: '', options: ['', '', '', ''], answer: '' }]
  });

  // Grading Form State
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  useEffect(() => {
    fetchData();
  }, [profile, institutionId]);

  const fetchData = async () => {
    if (!profile || !institutionId) return;
    setLoading(true);
    try {
      const [fetchedCourses, fetchedAssign, fetchedSubmissions, fetchedQuizzes, fetchedQuizAttempts] = await Promise.all([
        cfApi.listCourses(institutionId),
        cfApi.listAssignments(institutionId),
        cfApi.listSubmissions(institutionId),
        cfApi.listQuizzes(institutionId),
        cfApi.listQuizAttempts(institutionId, profile.uid)
      ]);

      setCourses(fetchedCourses);

      if (profile.role === 'teacher') {
        setAssignments(fetchedAssign.filter((a: any) => a.teacher_id === profile.uid));
        setQuizzes(fetchedQuizzes.filter((q: any) => q.teacher_id === profile.uid));
        setSubmissions(fetchedSubmissions);
      } else {
        setAssignments(fetchedAssign);
        setQuizzes(fetchedQuizzes.filter((q: any) => q.status === 'published'));
        setSubmissions(fetchedSubmissions.filter((s: any) => s.student_id === profile.uid));
        setQuizAttempts(fetchedQuizAttempts);
      }
    } catch (err) {
      console.error("Assessment data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !institutionId) return;
    try {
      if (isEditingAssign) {
        await cfApi.updateAssignment(isEditingAssign.id, {
          title: assignFormData.title,
          description: assignFormData.description,
          course_name: assignFormData.course,
          due_date: assignFormData.dueDate,
          file_url: assignFormData.fileUrl
        });
      } else {
        await cfApi.createAssignment(institutionId, {
          title: assignFormData.title,
          description: assignFormData.description,
          course_name: assignFormData.course,
          due_date: assignFormData.dueDate,
          file_url: assignFormData.fileUrl,
          teacher_id: profile.uid
        });
      }
      setShowAssignForm(false);
      resetAssignForm();
      fetchData();
      alert("Assignment saved!");
    } catch (error) {
      console.error("Failed to save assignment:", error);
    }
  };

  const resetAssignForm = () => {
    setAssignFormData({ title: '', description: '', course: '', dueDate: '', fileUrl: '' });
    setIsEditingAssign(null);
  };

  const handleGradeSubmission = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    try {
      await cfApi.gradeSubmission(gradingSubmission.id, Number(gradeInput), feedbackInput);
      setGradingSubmission(null);
      setGradeInput('');
      setFeedbackInput('');
      fetchData();
    } catch (err) {
      console.error("Grading failed:", err);
    }
  };

  const handleSaveQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !institutionId) return;
    try {
      await cfApi.createQuiz(institutionId, {
        title: quizFormData.title,
        course_name: quizFormData.course,
        time_limit: Number(quizFormData.timeLimit),
        questions: quizFormData.questions,
        teacher_id: profile.uid,
        status: 'published'
      });
      setShowQuizForm(false);
      setQuizFormData({ title: '', course: '', timeLimit: '15', questions: [{ question: '', options: ['', '', '', ''], answer: '' }] });
      fetchData();
    } catch (err) {
      console.error("Quiz creation failed:", err);
    }
  };

  const handleQuizSubmit = async (answers: Record<number, string>) => {
    let score = 0;
    activeQuizAttempt.questions.forEach((q: any, idx: number) => {
      if (answers[idx] === q.answer) score += 1;
    });
    const finalPercent = Math.round((score / activeQuizAttempt.questions.length) * 100);

    if (profile && institutionId) {
      try {
        await cfApi.submitQuizAttempt(institutionId, {
          quiz_id: activeQuizAttempt.id,
          quiz_title: activeQuizAttempt.title,
          course_name: activeQuizAttempt.course_name || activeQuizAttempt.courseName,
          student_id: profile.uid,
          student_name: profile.fullName,
          answers,

          score: finalPercent,
          questions: activeQuizAttempt.questions,
          status: 'completed'
        });
      } catch (err) {
        console.error("Quiz submission failed:", err);
      }
    }
    setQuizScoreResult(finalPercent);
    fetchData();
  };

  if (profile?.role === 'student') {
    if (activeQuizAttempt) {
      return (
        <QuizAttempt 
          quiz={activeQuizAttempt} 
          onClose={() => { setActiveQuizAttempt(null); setQuizAnswers({}); setQuizScoreResult(null); }}
          onSubmit={handleQuizSubmit}
          quizAnswers={quizAnswers}
          setQuizAnswers={setQuizAnswers}
          scoreResult={quizScoreResult}
        />
      );
    }

    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Assignments & Exams</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">View active assignments and take live quizzes.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AssignmentList 
              assignments={assignments}
              onEdit={() => {}}
              onDelete={() => {}}
              isTeacher={false}
              onSelect={(a) => setSubmitAssignmentTarget(a)}
            />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <QuizList 
              quizzes={quizzes} 
              isTeacher={false} 
              onTakeQuiz={(q) => setActiveQuizAttempt(q)} 
            />
            <Card title="My Performance Logs">
              <div className="space-y-4 mt-6">
                {quizAttempts.map((attempt) => (
                  <div key={attempt.id} className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-xs text-gray-900">{attempt.quizTitle || attempt.quiz_title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Score: {attempt.score}%</p>
                    </div>
                    <Button onClick={() => setActiveQuizReview(attempt)} variant="outline" className="text-[10px] py-1 px-2.5">Review</Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
        <QuizResults show={!!activeQuizReview} onClose={() => setActiveQuizReview(null)} attempt={activeQuizReview} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Assignments & Exams</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Design assignments, track uploads, and grade submissions.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowQuizForm(true)} variant="outline">Create Quiz</Button>
          <Button onClick={() => { resetAssignForm(); setShowAssignForm(true); }} className="bg-black text-white"><Plus className="w-4 h-4 mr-2" /> Create Assignment</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-100 pb-px">
        {['assignments', 'submissions', 'quizzes'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab as any)}
            className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSubTab === tab ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? <div className="h-64 bg-gray-50 rounded-3xl animate-pulse" /> : (
        <div className="space-y-6">
          {activeSubTab === 'assignments' && (
            <AssignmentList 
              assignments={assignments} 
              isTeacher={true} 
              onEdit={(a) => { setIsEditingAssign(a); setAssignFormData({ title: a.title, description: a.description, course: a.course_name || a.courseName, dueDate: a.dueDate, fileUrl: a.fileUrl || '' }); setShowAssignForm(true); }}
              onDelete={async (id) => { if (confirm("Delete?")) { await cfApi.deleteAssignment(id); fetchData(); } }}
            />
          )}
          {activeSubTab === 'submissions' && <SubmissionList submissions={submissions} onGrade={(s) => setGradingSubmission(s)} />}
          {activeSubTab === 'quizzes' && <QuizList quizzes={quizzes} isTeacher={true} onDelete={async (id) => { if (confirm("Delete?")) { await cfApi.deleteQuiz(id); fetchData(); } }} />}
        </div>
      )}

      <AssignmentEditor 
        show={showAssignForm} 
        onClose={() => { setShowAssignForm(false); resetAssignForm(); }} 
        onSave={handleSaveAssignment}
        isEditing={!!isEditingAssign}
        courses={courses}
        formData={assignFormData}
        setFormData={setAssignFormData}
      />

      <QuizBuilder 
        show={showQuizForm} 
        onClose={() => setShowQuizForm(false)} 
        onSave={handleSaveQuiz}
        courses={courses}
        quizData={quizFormData}
        setQuizData={setQuizFormData}
      />

      <GradingInterface 
        submission={gradingSubmission} 
        onClose={() => setGradingSubmission(null)} 
        onGrade={handleGradeSubmission}
        gradeInput={gradeInput}
        setGradeInput={setGradeInput}
        feedbackInput={feedbackInput}
        setFeedbackInput={setFeedbackInput}
      />
    </div>
  );
}
