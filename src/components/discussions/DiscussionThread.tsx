import { useState } from 'react';
import { motion } from 'motion/react';
import { Card, Button } from '../ui/Card';
import { ArrowLeft, User, Trash2 } from 'lucide-react';

interface DiscussionThreadProps {
  discussion: any;
  posts: any[];
  onBack: () => void;
  onReply: (content: string) => void;
  onDeletePost: (postId: string) => void;
  currentUserId: string;
  isTeacher: boolean;
}

export function DiscussionThread({
  discussion,
  posts,
  onBack,
  onReply,
  onDeletePost,
  currentUserId,
  isTeacher
}: DiscussionThreadProps) {
  const [replyContent, setReplyContent] = useState('');

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Threads
      </button>

      <div className="space-y-4">
        <div className="p-6 bg-black text-white rounded-3xl shadow-xl">
          <h2 className="text-xl font-black">{discussion.title}</h2>
          <p className="text-xs opacity-60 font-bold uppercase tracking-widest mt-2">
            Thread started by {discussion.author_name || 'User'}
          </p>
        </div>

        <div className="space-y-4">
          {posts.map((post, idx) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-3xl border ${
                post.author_id === currentUserId ? 'border-black bg-gray-50' : 'border-gray-100 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <span className="text-xs font-black text-gray-900">{post.author_name}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {(post.author_id === currentUserId || isTeacher) && (
                  <button 
                    onClick={() => onDeletePost(post.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed pl-8">{post.content}</p>
            </motion.div>
          ))}
        </div>

        <div className="p-4 bg-white border border-gray-100 rounded-3xl space-y-3 shadow-sm">
          <textarea 
            placeholder="Type your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:border-black transition-all h-24 resize-none"
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => { onReply(replyContent); setReplyContent(''); }}
              disabled={!replyContent.trim()}
              className="bg-black text-white px-6"
            >
              Post Reply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
