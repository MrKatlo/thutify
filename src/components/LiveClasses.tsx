import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, where, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Video, Calendar, Plus, ExternalLink, Trash2, X, Globe, VideoOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function LiveClasses() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [courseName, setCourseName] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [platform, setPlatform] = useState('Zoom');

  useEffect(() => {
    fetchClasses();
    fetchCourses();
  }, [profile]);

  const getMockClasses = () => [
    { id: 'l1', title: 'Calculus Advanced Module 4', dateTime: '2026-06-01T14:00', platform: 'Zoom', meetingLink: 'https://zoom.us/j/123456789', courseName: 'Advanced Mathematics', teacherId: profile?.uid || 't1' },
    { id: 'l2', title: 'Classical Physics Lab', dateTime: '2026-06-02T10:00', platform: 'Google Meet', meetingLink: 'https://meet.google.com/abc-defg-hij', courseName: 'Physics 101', teacherId: profile?.uid || 't2' }
  ];

  const getMockCourses = () => [
    { id: 'c1', title: 'Advanced Mathematics' },
    { id: 'c2', title: 'Physics 101' },
    { id: 'c3', title: 'Introduction to Programming' }
  ];

  const fetchCourses = async () => {
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setCourses(list.length > 0 ? list : getMockCourses());
    } catch (err) {
      setCourses(getMockCourses());
    }
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'liveClasses'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as any));
      
      // Filter for teachers
      if (profile?.role === 'teacher') {
        setClasses(list.length > 0 ? list.filter(l => l.teacherId === profile.uid) : getMockClasses());
      } else {
        setClasses(list.length > 0 ? list : getMockClasses());
      }
    } catch (err) {
      console.warn("Could not load live classes from Firestore. Loading mock roster:", err);
      setClasses(getMockClasses());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await addDoc(collection(db, 'liveClasses'), {
        title,
        courseName,
        dateTime,
        meetingLink,
        platform,
        teacherId: profile.uid,
        createdAt: serverTimestamp()
      });
      setShowForm(false);
      setTitle('');
      setCourseName('');
      setDateTime('');
      setMeetingLink('');
      setPlatform('Zoom');
      fetchClasses();
      alert("Live interactive session successfully scheduled!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'liveClasses');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to cancel this live class?")) return;
    try {
      await deleteDoc(doc(db, 'liveClasses', classId));
      fetchClasses();
      alert("Live class cancelled successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `liveClasses/${classId}`);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Live Online Classes</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Schedule and start live interactive sessions with Zoom or Google Meet.</p>
        </div>
        {profile?.role !== 'student' && (
          <Button onClick={() => setShowForm(true)} className="bg-black text-white hover:bg-gray-800 shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Live Class
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Upcoming Live Sessions">
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-2xl animate-pulse mt-6" />
          ) : classes.length === 0 ? (
            <div className="py-20 text-center text-gray-400 italic">No live sessions scheduled.</div>
          ) : (
            <div className="space-y-4 mt-6">
              {classes.map((cls, idx) => (
                <motion.div 
                  key={cls.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl gap-4 hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${cls.platform === 'Zoom' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{cls.title}</h4>
                      <p className="text-xs text-gray-500 font-semibold mt-1">
                        {new Date(cls.dateTime).toLocaleString()} • {cls.courseName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={cls.meetingLink} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-all shrink-0"
                    >
                      Join Class <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {profile?.role !== 'student' && (
                      <button 
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Quick Integrations">
          <div className="space-y-4 mt-6">
            <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-900">Zoom Integration</p>
                <p className="text-xs text-green-600 font-bold uppercase tracking-wider mt-0.5">Connected</p>
              </div>
              <Button variant="outline" className="text-xs py-1 px-3">Disconnect</Button>
            </div>
            <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-900">Google Meet</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Not Setup</p>
              </div>
              <Button className="bg-black text-white hover:bg-gray-800 text-xs py-1 px-3">Connect</Button>
            </div>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowForm(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight">Schedule Live Class</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Class Title</label>
                  <input 
                    type="text" 
                    required 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    placeholder="e.g. Advanced Calculus Q&A"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Assign Course</label>
                    <select 
                      required
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
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
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Date & Time</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Platform</label>
                    <select 
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                    >
                      <option value="Zoom">Zoom</option>
                      <option value="Google Meet">Google Meet</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Meeting Link</label>
                    <input 
                      type="url" 
                      required 
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-2 bg-black text-white hover:bg-gray-800">Schedule Class</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
