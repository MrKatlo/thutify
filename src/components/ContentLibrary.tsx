import { Card, Button } from './ui/Card';
import { Folder, FileText, Download, Plus, Search, MoreVertical, Film, Eye } from 'lucide-react';
import { motion } from 'motion/react';

export function ContentLibrary() {
  const files = [
    { name: 'Calculus Syllabus 2026.pdf', type: 'PDF', size: '1.2 MB', downloads: 124, date: 'May 10, 2026' },
    { name: 'Integration Techniques Video.mp4', type: 'Video', size: '45 MB', downloads: 89, date: 'May 12, 2026' },
    { name: 'Physics Lab Guide Sheet.docx', type: 'Document', size: '240 KB', downloads: 64, date: 'May 14, 2026' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Content Library</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage and share teaching materials, lecture videos, guides, and assignments.</p>
        </div>
        <Button className="bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Upload File
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card title="Categories">
            <div className="space-y-1 mt-4">
              {[
                { label: 'All Files', count: 18, active: true },
                { label: 'Lecture Videos', count: 4, active: false },
                { label: 'Syllabi & PDFs', count: 8, active: false },
                { label: 'Assignments sheets', count: 6, active: false }
              ].map((item, idx) => (
                <button 
                  key={idx}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    item.active ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${item.active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{item.count}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search file library..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>

            <div className="space-y-3">
              {files.map((file, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/50 border border-gray-100 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-white border border-gray-200 ${file.type === 'Video' ? 'text-blue-500' : 'text-red-500'}`}>
                      {file.type === 'Video' ? <Film className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{file.size} • Uploaded {file.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">{file.downloads} Downloads</span>
                    <button className="p-2 text-gray-400 hover:text-black hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-200"><Download className="w-4 h-4" /></button>
                    <button className="p-2 text-gray-400 hover:text-black hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-200"><Eye className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
