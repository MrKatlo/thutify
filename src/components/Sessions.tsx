import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { TutoringSession, Course } from '../types';
import { Card, Button } from './ui/Card';
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, ChevronRight, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export function Sessions() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<TutoringSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [courseId, setCourseId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qSessions = query(collection(db, 'sessions'), orderBy('startTime', 'asc'));
      const qCourses = query(collection(db, 'courses'));
      
      const [snapSessions, snapCourses] = await Promise.all([
        getDocs(qSessions),
        getDocs(qCourses)
      ]);

      const fetchedCourses = snapCourses.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(fetchedCourses);

      const fetchedSessions = snapSessions.docs.map(doc => {
        const data = doc.data();
        const course = fetchedCourses.find(c => c.id === data.courseId);
        return {
          id: doc.id,
          ...data,
          courseTitle: course?.title || 'Unknown Course'
        } as TutoringSession;
      });
      setSessions(fetchedSessions);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !courseId) return;

    try {
      await addDoc(collection(db, 'sessions'), {
        courseId,
        tutorId: profile.uid,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        studentIds: [],
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Session Schedule</h1>
          <p className="text-gray-500 mt-1">Manage and join upcoming tutoring sessions.</p>
        </div>
        {profile?.role !== 'student' && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Schedule Session
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-10" title="Schedule New Session">
          <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">Select Course</label>
              <select 
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
              >
                <option value="">Choose a course...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Start Time</label>
              <input 
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">End Time</label>
              <input 
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit">Schedule</Button>
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="bg-white border border-gray-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-lg transition-all group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100 group-hover:bg-black group-hover:border-black transition-colors">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest leading-none mb-1 group-hover:text-white/60">
                      {session.startTime?.toDate ? format(session.startTime.toDate(), 'MMM') : '...'}
                    </span>
                    <span className="text-xl font-extrabold leading-none group-hover:text-white">
                      {session.startTime?.toDate ? format(session.startTime.toDate(), 'dd') : '..'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{session.courseTitle}</h3>
                    <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {session.startTime?.toDate ? format(session.startTime.toDate(), 'p') : ''} - {session.endTime?.toDate ? format(session.endTime.toDate(), 'p') : ''}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {session.studentIds.length} Students
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Button variant="outline" className="flex-1 md:flex-none py-3">View Details</Button>
                  <Button className="flex-1 md:flex-none py-3">
                    {profile?.role === 'student' ? 'Join Session' : 'Manage'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {!loading && sessions.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
               <CalendarIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
               <p className="text-gray-500 font-medium">No sessions scheduled.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
