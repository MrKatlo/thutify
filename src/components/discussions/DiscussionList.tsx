import { useState } from 'react';
import { Card, Button } from '../ui/Card';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface DiscussionListProps {
  discussions: any[];
  onCreate: (title: string) => void;
  onSelect: (discussion: any) => void;
  loading: boolean;
}

export function DiscussionList({ discussions, onCreate, onSelect, loading }: DiscussionListProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = discussions.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card title="Course Discussions" description="Collaborative Q&A threads and study groups.">
      <div className="mt-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search threads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
            />
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-black text-white shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 border border-black rounded-2xl space-y-3">
            <input 
              type="text" 
              placeholder="Thread Title (e.g. Question about Module 3)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="text-xs py-1 px-3">Cancel</Button>
              <Button 
                onClick={() => { onCreate(newTitle); setNewTitle(''); setShowCreate(false); }}
                className="bg-black text-white text-xs py-1 px-3"
                disabled={!newTitle.trim()}
              >
                Start Thread
              </Button>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="h-48 bg-gray-50 rounded-2xl animate-pulse" />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 italic">No discussion threads found.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((d) => (
              <div 
                key={d.id}
                onClick={() => onSelect(d)}
                className="p-4 border border-gray-100 rounded-2xl hover:border-black/20 hover:bg-gray-50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{d.title}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      Started by {d.author_name || 'User'} • {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase">
                  {d.post_count || 0} posts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
