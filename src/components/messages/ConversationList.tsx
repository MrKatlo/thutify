import { Card } from '../ui/Card';
import { User, Search } from 'lucide-react';

interface ConversationListProps {
  conversations: any[];
  onSelect: (peerId: string) => void;
  selectedPeerId: string | null;
  loading: boolean;
}

export function ConversationList({ conversations, onSelect, selectedPeerId, loading }: ConversationListProps) {
  return (
    <Card title="Messages" className="h-full">
      <div className="mt-4 mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search contacts..."
          className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-xl text-xs focus:outline-none focus:border-black transition-all"
        />
      </div>

      <div className="space-y-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-xs italic">No conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.peerId}
              onClick={() => onSelect(c.peerId)}
              className={`p-3 rounded-2xl cursor-pointer flex items-center gap-3 transition-all ${
                selectedPeerId === c.peerId ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                selectedPeerId === c.peerId ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
              }`}>
                {c.peerName?.charAt(0) || <User className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{c.peerName}</p>
                <p className={`text-[10px] truncate ${selectedPeerId === c.peerId ? 'text-white/60' : 'text-gray-400'}`}>
                  {c.lastMessage}
                </p>
              </div>
              {c.unreadCount > 0 && selectedPeerId !== c.peerId && (
                <div className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
