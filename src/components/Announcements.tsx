import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ui/Toast';
import { Card, Button } from './ui/Card';
import { Megaphone, Clock, Send, MessageSquare, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import * as cfApi from '../services/cfApi';

export function Announcements() {
  const { profile, institutionId } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'announcements' | 'conversations'>('announcements');
  const [loading, setLoading] = useState(true);

  // Lists
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // State inputs
  const [annContent, setAnnContent] = useState('');
  const [annCourseId, setAnnCourseId] = useState('general');
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // Conversation inputs
  const [selectedCourseId, setSelectedCourseId] = useState('general');
  const [chatMessage, setChatMessage] = useState('');
  const [submittingChat, setSubmittingChat] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile, institutionId]);

  const toast = useToast();

  useEffect(() => {
    if (activeSubTab === 'conversations') {
      fetchChatMessages();
    }
  }, [selectedCourseId, activeSubTab]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [fetchedAnn, fetchedCourses] = await Promise.all([
        cfApi.listAnnouncements(institutionId),
        cfApi.listCourses(institutionId)
      ]);

      setAnnouncements(fetchedAnn);
      setCourses(fetchedCourses);
    } catch (error) {
      console.error("Fetch announcements error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async () => {
    if (!institutionId) return;
    try {
      const list = await cfApi.listDiscussions(institutionId, selectedCourseId === 'general' ? undefined : selectedCourseId);
      // For simplicity in this migrated component, we use Discussions as the "chat" backend
      // In a real app, this would be more specialized
      setMessages(list);
    } catch (err) {
      console.error("Fetch chat error:", err);
    }
  };

  const handlePostAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!annContent.trim() || !profile || !institutionId) return;
    setSubmittingAnn(true);
    try {
      await cfApi.createAnnouncement(institutionId, {
        content: annContent,
        course_id: annCourseId === 'general' ? undefined : annCourseId,
        priority: 'normal'
      });
      setAnnContent('');
      fetchData();
      toast.success("Announcement published!");
    } catch (error) {
      console.error("Post announcement error:", error);
      toast.error("Unable to publish announcement.");
    } finally {
      setSubmittingAnn(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !profile || !institutionId) return;
    setSubmittingChat(true);
    try {
      await cfApi.createDiscussion(institutionId, selectedCourseId, chatMessage);
      setChatMessage('');
      fetchChatMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSubmittingChat(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
          <Megaphone className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Collaboration Hub</h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">Post class bulletins, start discussions, and message classmates.</p>
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
                    value={annCourseId}
                    onChange={(e) => setAnnCourseId(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="general">Broadcast to Everyone (All Classes)</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
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
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-gray-400 italic">No bulletin announcements logged yet.</div>
            ) : (
              announcements.map((ann, i) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 group"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                      {ann.author_name?.[0] || 'A'}
                    </div>
                    <div className="w-0.5 flex-1 bg-gray-100 my-2 group-last:hidden" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{ann.author_name || 'Instructor'}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {ann.created_at ? formatDistanceToNow(new Date(ann.created_at)) + ' ago' : 'Recently'}
                          </p>
                        </div>
                        {ann.course_name && (
                          <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {ann.course_name}
                          </span>
                        )}
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
                {[{ id: 'general', title: 'General Discussion' }, ...courses].map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => setSelectedCourseId(topic.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedCourseId === topic.id ? 'border-black bg-gray-50 font-bold' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className="text-xs text-gray-900">{topic.title}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="md:col-span-3">
            <Card title={`Channel: ${courses.find(c => c.id === selectedCourseId)?.title || 'General Discussion'}`} description="Classroom discussions and direct chat thread.">
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
                    const isSelf = m.author_id === profile?.uid;
                    return (
                      <div 
                        key={m.id}
                        className={`flex gap-3 max-w-[80%] ${isSelf ? 'ml-auto flex-row-reverse text-right' : 'mr-auto'}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {m.author_name?.[0] || 'U'}
                        </div>
                        <div>
                          <div className={`p-3 rounded-2xl text-xs font-medium ${
                            isSelf ? 'bg-black text-white rounded-tr-none' : 'bg-white border border-gray-100 rounded-tl-none text-gray-800'
                          }`}>
                            {m.title}
                          </div>
                          <span className="text-[9px] text-gray-400 block mt-1 px-1 font-bold uppercase">
                            {m.author_name || 'Anonymous'}
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
                  placeholder={`Start a new thread in #${courses.find(c => c.id === selectedCourseId)?.title || 'General'}...`}
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
