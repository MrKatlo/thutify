import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as cfApi from '../services/cfApi';
import { Card } from './ui/Card';

// Sub-components
import { ConversationList } from './messages/ConversationList';
import { Conversation } from './messages/Conversation';

export function Messaging() {
  const { profile, institutionId } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [profile, institutionId]);

  useEffect(() => {
    if (selectedPeerId) {
      fetchMessages();
    }
  }, [selectedPeerId]);

  const fetchConversations = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      // In D1, we might get messages and group them into conversations
      const allMessages = await cfApi.listMessages(institutionId);
      
      // Grouping logic (simplified)
      const convosMap: Record<string, any> = {};
      allMessages.forEach((m: any) => {
        const peerId = m.from_user_id === profile?.uid ? m.to_user_id : m.from_user_id;
        const peerName = m.from_user_id === profile?.uid ? m.to_user_name || 'User' : m.from_user_name || 'User';
        
        if (!convosMap[peerId] || new Date(m.created_at) > new Date(convosMap[peerId].lastDate)) {
          convosMap[peerId] = {
            peerId,
            peerName,
            lastMessage: m.content,
            lastDate: m.created_at,
            unreadCount: m.read_at ? 0 : (m.to_user_id === profile?.uid ? 1 : 0)
          };
        }
      });
      
      setConversations(Object.values(convosMap).sort((a: any, b: any) => 
        new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
      ));
    } catch (err) {
      console.error("Fetch conversations failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!institutionId || !selectedPeerId) return;
    setMessagesLoading(true);
    try {
      const list = await cfApi.listMessages(institutionId, selectedPeerId);
      setMessages(list);
    } catch (err) {
      console.error("Fetch messages failed:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!institutionId || !selectedPeerId) return;
    try {
      await cfApi.sendMessage(institutionId, selectedPeerId, content);
      fetchMessages();
      fetchConversations();
    } catch (err) {
      console.error("Send message failed:", err);
    }
  };

  const selectedConvo = conversations.find(c => c.peerId === selectedPeerId);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-100px)]">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Direct Messages</h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">Secure 1-on-1 communication channel.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-80px)]">
        <div className="lg:col-span-1 h-full">
          <ConversationList 
            conversations={conversations} 
            onSelect={setSelectedPeerId} 
            selectedPeerId={selectedPeerId}
            loading={loading}
          />
        </div>

        <div className="lg:col-span-2 h-full">
          {selectedPeerId ? (
            <Conversation 
              messages={messages} 
              onSend={handleSendMessage} 
              currentUserId={profile?.uid || ''} 
              peerName={selectedConvo?.peerName || 'User'}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <SendIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Your Inbox</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-2 leading-relaxed">Select a conversation from the left to start chatting with your peers or instructors.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}
