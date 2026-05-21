import { motion } from 'motion/react';
import { Card } from '../ui/Card';
import { Video, ExternalLink, Trash2 } from 'lucide-react';

interface LiveClassListProps {
  classes: any[];
  onDelete: (id: string) => void;
  isTeacher: boolean;
  loading: boolean;
}

export function LiveClassList({ classes, onDelete, isTeacher, loading }: LiveClassListProps) {
  return (
    <Card title="Upcoming Live Sessions">
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
                    {new Date(cls.scheduled_at).toLocaleString()} • {cls.course_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={cls.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-all shrink-0"
                >
                  Join Class <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {isTeacher && (
                  <button
                    onClick={() => onDelete(cls.id)}
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
  );
}
