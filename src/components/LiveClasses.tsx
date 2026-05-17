import { Card, Button } from './ui/Card';
import { Video, Calendar, Plus, ExternalLink, VideoOff } from 'lucide-react';
import { motion } from 'motion/react';

export function LiveClasses() {
  const classes = [
    { id: 1, title: 'Calculus Advanced Module 4', time: 'Today, 2:00 PM', platform: 'Zoom', link: 'https://zoom.us/j/123456789', status: 'Upcoming' },
    { id: 2, title: 'Classical Physics lab', time: 'Tomorrow, 10:00 AM', platform: 'Google Meet', link: 'https://meet.google.com/abc-defg-hij', status: 'Scheduled' },
    { id: 3, title: 'React Hooks Deep Dive', time: 'May 20, 4:00 PM', platform: 'Zoom', link: 'https://zoom.us/j/987654321', status: 'Scheduled' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Live Online Classes</h1>
          <p className="text-gray-500 mt-1 font-medium">Schedule and start live interactive sessions with Zoom or Google Meet.</p>
        </div>
        <Button className="bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Live Class
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2" title="Upcoming Live Sessions">
          <div className="space-y-4 mt-6">
            {classes.map((cls, idx) => (
              <motion.div 
                key={cls.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl gap-4 hover:border-gray-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${cls.platform === 'Zoom' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{cls.title}</h4>
                    <p className="text-xs text-gray-500 font-medium">{cls.time} • Platform: <span className="font-bold">{cls.platform}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    cls.status === 'Upcoming' ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {cls.status}
                  </span>
                  <a 
                    href={cls.link} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-all shrink-0"
                  >
                    Start Class <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card title="Quick Integrations">
          <div className="space-y-4 mt-6">
            <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Zoom Integration</p>
                <p className="text-xs text-green-600 font-bold uppercase tracking-wider mt-0.5">Connected</p>
              </div>
              <Button variant="outline" className="text-xs py-1 px-3">Disconnect</Button>
            </div>
            <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Google Meet</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Not Setup</p>
              </div>
              <Button className="bg-black text-white hover:bg-gray-800 text-xs py-1 px-3">Connect</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
