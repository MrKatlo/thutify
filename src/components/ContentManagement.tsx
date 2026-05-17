import { Card, Button } from './ui/Card';
import { FileText, LayoutTemplate, MessageSquare, Image as ImageIcon, Edit, Trash } from 'lucide-react';
import { motion } from 'motion/react';

export function ContentManagement() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Content Management (CMS)</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage website pages, banners, FAQs, and blog articles.</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-black text-white hover:bg-gray-800">
            Create Content
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pages', count: 12, icon: LayoutTemplate, color: 'text-blue-500' },
          { label: 'Blog Posts', count: 48, icon: FileText, color: 'text-purple-500' },
          { label: 'Banners', count: 5, icon: ImageIcon, color: 'text-orange-500' },
          { label: 'FAQs', count: 24, icon: MessageSquare, color: 'text-green-500' },
        ].map((item, i) => (
          <Card key={i} className="p-6 flex flex-col items-center justify-center text-center">
            <item.icon className={`w-8 h-8 mb-3 ${item.color}`} />
            <h3 className="text-3xl font-bold">{item.count}</h3>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">{item.label}</p>
          </Card>
        ))}
      </div>

      <Card title="Recent Content Updates">
        <div className="space-y-4 mt-4">
          {[
            { title: 'Welcome to LearnFlow v2.0', type: 'Blog Post', status: 'Published', date: '2 hours ago' },
            { title: 'Homepage Hero Banner', type: 'Banner', status: 'Draft', date: '1 day ago' },
            { title: 'Refund Policy Update', type: 'Page', status: 'Published', date: '3 days ago' },
            { title: 'How to access certificates?', type: 'FAQ', status: 'Published', date: '1 week ago' },
          ].map((content, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-all bg-white"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{content.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider">{content.type}</span>
                    <span className="text-xs text-gray-400 font-medium">{content.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${content.status === 'Published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {content.status}
                </span>
                <button className="text-gray-400 hover:text-blue-600 p-1"><Edit className="w-4 h-4" /></button>
                <button className="text-gray-400 hover:text-red-600 p-1"><Trash className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
