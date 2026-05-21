import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, User } from 'lucide-react';
import { Button } from '../ui/Card';

interface ConversationProps {
  messages: any[];
  onSend: (content: string) => void;
  currentUserId: string;
  peerName: string;
}

export function Conversation({ messages, onSend, currentUserId, peerName }: ConversationProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
          {peerName.charAt(0)}
        </div>
        <p className="font-bold text-sm text-gray-900">{peerName}</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
        {messages.map((m, idx) => {
          const isMe = m.from_user_id === currentUserId || m.fromUserId === currentUserId;
          return (
            <motion.div
              key={m.id || idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                isMe ? 'bg-black text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                <p className="leading-relaxed">{m.content}</p>
                <p className={`text-[9px] mt-1.5 font-bold uppercase tracking-tighter opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-2">
        <input 
          type="text" 
          placeholder="Message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-all"
        />
        <Button onClick={handleSend} className="bg-black text-white px-3 py-2 rounded-xl">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
