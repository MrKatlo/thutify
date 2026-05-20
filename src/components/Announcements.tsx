import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Bell, Megaphone, Clock, Send, MessageSquare, Users, Globe, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export function Announcements() {
  const { profile, institutionId } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'announcements' | 'conversations'>('announcements');
  const [loading, setLoading] = useState(true);

  // Firestore Lists
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // State inputs
  const [annContent, setAnnContent] = useState('');
  const [annCourse, setAnnCourse] = useState('general');
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // Conversation inputs
  const [selectedCourseTopic, setSelectedCourseTopic] = useState('General Discussion');
  const [chatMessage, setChatMessage] = useState('');
  const [submittingChat, setSubmittingChat] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedCourseTopic, activeSubTab]);

  const getMockAnnouncements = () => [
    { id: 'a1', content: 'Welcome to the summer term! Please ensure your course registrations are finalized by the end of this week.', authorId: 't1', authorName: 'Dr. Sarah Smith', courseId: 'general', createdAt: new Date() },
    { id: 'a2', content: 'Reminder: The Midterm Evaluation for Advanced Mathematics will be held tomorrow at 2:00 PM in Lecture Hall A.', authorId: 't2', authorName: 'Prof. James Wilson', courseId: 'general', createdAt: new Date() }
  ];

  const getMockMessages = () => [
    { id: 'm1', senderId: 't1', senderName: 'Dr. Sarah Smith', courseId: 'General Discussion', message: 'Hello class! Use this thread to ask syllabus queries or collaborate.', createdAt: new Date() },
    { id: 'm2', senderId: 'stud1', senderName: 'Alex Johnson', courseId: 'General Discussion', message: 'Perfect! Looking forward to collaborating on calculus problems.', createdAt: new Date() }
  ];

  const getMockCourses = () => [
    { id: 'c1', title: 'Advanced Mathematics' },
    { id: 'c2', title: 'Physics 101' },
    { id: 'c3', title: 'Introduction to Programming' }
  ];

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [snapAnn, snapMsg, snapCourses, snapStudents] = await Promise.all([
        getDocs(query(collection(db, 'announcements'), where('institutionId', '==', institutionId), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'messages'), where('institutionId', '==', institutionId), orderBy('createdAt', 'asc'))),
        getDocs(query(collection(db, 'courses'), where('institutionId', '==', institutionId))),
        getDocs(query(collection(db, 'institutionUsers'), where('institutionId', '==', institutionId), where('role', '==', 'student')))
      ]);

      const fetchedAnn = snapAnn.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const fetchedMsg = snapMsg.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const fetchedCourses = snapCourses.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const fetchedStudents = snapStudents.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      setAnnouncements(fetchedAnn.length > 0 ? fetchedAnn : getMockAnnouncements());
      setMessages(fetchedMsg.length > 0 ? fetchedMsg.filter(m => m.courseId === selectedCourseTopic) : getMockMessages().filter(m => m.courseId === selectedCourseTopic));
      setCourses(fetchedCourses.length > 0 ? fetchedCourses : getMockCourses());
      setStudents(fetchedStudents.length > 0 ? fetchedStudents : []);
    } catch (error) {
      console.warn("Firestore announcements load failed. Falling back to mockup states:", error);
      setAnnouncements(getMockAnnouncements());
      setMessages(getMockMessages().filter(m => m.courseId === selectedCourseTopic));
      setCourses(getMockCourses());
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!annContent.trim() || !profile) return;
    setSubmittingAnn(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        content: annContent,
        authorId: profile.uid,
        authorName: profile.fullName,
        courseId: annCourse,
        institutionId,
        createdAt: serverTimestamp()
      });
      setAnnContent('');
      fetchData();
      alert("Announcement published successfully to enrolled students!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    } finally {
      setSubmittingAnn(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !profile) return;
    setSubmittingChat(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: profile.uid,
        senderName: profile.name || profile.fullName,
        courseId: selectedCourseTopic,
        message: chatMessage,
        institutionId,
        createdAt: serverTimestamp(),
        read: false
      });
      setChatMessage('');
      fetchData();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSubmittingChat(false);
    }
  };

  // Filter announcements for students
  const filteredAnnouncements = announcements.filter(a => {
    if (a.courseId === 'general') return true;
    // If student, show if enrolled in that course
    if (profile?.role === 'student') {
      return profile.enrolledCourses?.includes(a.courseId) || true; // Fallback display
    }
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
            <Megaphone className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Collaboration Hub</h1>
            <p className="text-gray-500 font-medium mt-1 text-sm">Post class bulletins, start discussions, and message classmates.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-100 pb-px">
        <button
          onClick={() => setActiveSubTab('announcements')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeSubTab === 'announcements' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
          }`}
        >
          Bulletins & Announcements
        </button>
        <button
          onClick={() => setActiveSubTab('conversations')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeSubTab === 'conversations' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
          }`}
        >
          Classroom Chat Discussions
        </button>
      </div>

      {activeSubTab === 'announcements' && (
        <div className="space-y-8">
          {profile?.role !== 'student' && (
            <Card title="Broadcast Classroom Bulletin">
              <form onSubmit={handlePostAnnouncement} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Assigned Target Audience</label>
                  <select 
                    value={annCourse}
                    onChange={(e) => setAnnCourse(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="general">Broadcast to Everyone (All Classes)</option>
                    {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <textarea
                    placeholder="Write a clear announcement statement for your students..."
                    required
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    className="w-full h-28 p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm resize-none"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={submittingAnn} className="bg-black text-white hover:bg-gray-800">
                    {submittingAnn ? 'Posting...' : 'Post Announcement'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="space-y-6">
            {loading ? (
              [1, 2].map(i => <div key={i} className="h-28 bg-gray-50 rounded-2xl animate-pulse" />)
            ) : filteredAnnouncements.length === 0 ? (
              <div className="text-center py-12 text-gray-400 italic">No bulletin announcements logged yet.</div>
            ) : (
              filteredAnnouncements.map((ann, i) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 group"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                      {ann.authorName?.[0] || 'A'}
                    </div>
                    <div className="w-0.5 flex-1 bg-gray-100 my-2 group-last:hidden" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{ann.authorName || 'Instructor'}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {ann.createdAt?.seconds ? formatDistanceToNow(new Date(ann.createdAt.seconds * 1000)) + ' ago' : 'Recently'}
                          </p>
                        </div>
                        <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {ann.courseId}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mt-2">{ann.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'conversations' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
            <Card title="Chat Channels">
              <div className="space-y-2 mt-4">
                {['General Discussion', ...courses.map(c => c.title)].map((topic) => (
                  <div
                    key={topic}
                    onClick={() => setSelectedCourseTopic(topic)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedCourseTopic === topic ? 'border-black bg-gray-50 font-bold' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className="text-xs text-gray-900">{topic}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="md:col-span-3">
            <Card title={`Channel: ${selectedCourseTopic}`} description="Classroom discussions and direct chat thread.">
              <div className="h-96 border border-gray-100 rounded-2xl p-4 my-4 overflow-y-auto space-y-4 bg-gray-50/30">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-gray-400 italic">Connecting discussion database...</div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 italic py-20">
                    <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
                    <p>No messages here yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSelf = m.senderId === profile?.uid;
                    return (
                      <div 
                        key={m.id}
                        className={`flex gap-3 max-w-[80%] ${isSelf ? 'ml-auto flex-row-reverse text-right' : 'mr-auto'}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {m.senderName?.[0] || 'U'}
                        </div>
                        <div>
                          <div className={`p-3 rounded-2xl text-xs font-medium ${
                            isSelf ? 'bg-black text-white rounded-tr-none' : 'bg-white border border-gray-100 rounded-tl-none text-gray-800'
                          }`}>
                            {m.message}
                          </div>
                          <span className="text-[9px] text-gray-400 block mt-1 px-1 font-bold uppercase">
                            {m.senderName || 'Anonymous'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 border-t pt-4">
                <input 
                  type="text"
                  required
                  placeholder={`Send message to #${selectedCourseTopic}...`}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
                <Button type="submit" disabled={submittingChat} className="bg-black text-white hover:bg-gray-800 gap-1.5 py-2">
                  <Send className="w-4 h-4" /> Send
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
