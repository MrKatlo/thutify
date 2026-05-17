import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Announcement } from '../types';
import { Card, Button } from './ui/Card';
import { Bell, Paperclip, Send, Megaphone, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export function Announcements() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const getMockAnnouncements = (): Announcement[] => [
    { id: 'a1', content: 'Welcome to the summer term! Please ensure your course registrations are finalized by the end of this week.', authorId: 't1', authorName: 'Dr. Sarah Smith', courseId: 'general', createdAt: null },
    { id: 'a2', content: 'Reminder: The Midterm Evaluation for Advanced Mathematics will be held tomorrow at 2:00 PM in Lecture Hall A.', authorId: 't2', authorName: 'Prof. James Wilson', courseId: 'general', createdAt: null }
  ];

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Announcement));
      setAnnouncements(fetched.length > 0 ? fetched : getMockAnnouncements());
    } catch (error) {
      console.warn("Firestore announcements fetch failed (likely rules or uninitialized). Falling back to mock data:", error);
      setAnnouncements(getMockAnnouncements());
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!newContent.trim() || !profile) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        content: newContent,
        authorId: profile.uid,
        authorName: profile.name,
        courseId: 'general', // Default for now, could be specific courses
        createdAt: serverTimestamp(),
      });
      setNewContent('');
      fetchAnnouncements();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
          <Megaphone className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Announcements</h1>
          <p className="text-gray-500 font-medium">Stay updated with the latest news from LearnFlow.</p>
        </div>
      </div>

      {profile?.role !== 'student' && (
        <Card className="mb-10 p-0 overflow-hidden border-2 border-black/5 shadow-xl shadow-black/5">
          <div className="p-6">
            <textarea
              placeholder="What's the update today?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full h-32 bg-transparent text-lg font-medium resize-none outline-none placeholder:text-gray-300"
            />
          </div>
          <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex gap-2">
               <button className="p-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-white">
                 <Paperclip className="w-4 h-4" />
               </button>
            </div>
            <Button onClick={handlePost} disabled={submitting} className="px-6 py-2">
              {submitting ? 'Posting...' : 'Post Announcement'}
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-8">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-3xl animate-pulse" />)
        ) : (
          announcements.map((ann, i) => (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex gap-6 group">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                    <Bell className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                  </div>
                  <div className="w-0.5 flex-1 bg-gray-100 my-2 group-last:hidden" />
                </div>
                <div className="flex-1 pb-10">
                  <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm group-hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[10px] text-white font-bold">
                          {ann.authorName?.[0] || 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{ann.authorName || 'Staff'}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            <Clock className="w-3 h-3" />
                            {ann.createdAt ? formatDistanceToNow(ann.createdAt.toDate()) + ' ago' : 'Just now'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed font-sans">{ann.content}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
        
        {!loading && announcements.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
             <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
             <p className="text-gray-500 font-medium">No announcements yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
