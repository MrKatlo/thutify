import { Card } from './ui/Card';
import { Activity, Database, Server, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function SystemMonitoring() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">System Monitoring</h1>
          <p className="text-gray-500 mt-1 font-medium">Real-time overview of server status, database health, and performance.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200 font-bold text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          All Systems Operational
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Server Health" className="flex flex-col justify-between">
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Server className="w-6 h-6" /></div>
              <div>
                <p className="font-bold text-lg">99.98%</p>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Uptime</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">45ms</p>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Latency</p>
            </div>
          </div>
          <div className="mt-6 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} className="h-full bg-blue-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">CPU Load: 45%</p>
        </Card>

        <Card title="Database Status" className="flex flex-col justify-between">
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Database className="w-6 h-6" /></div>
              <div>
                <p className="font-bold text-lg">Firebase</p>
                <p className="text-xs text-green-500 font-bold tracking-wider uppercase">Connected</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">1.2 GB</p>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Storage</p>
            </div>
          </div>
          <div className="mt-6 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '25%' }} className="h-full bg-purple-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">Storage Used: 25%</p>
        </Card>

        <Card title="Active Traffic" className="flex flex-col justify-between">
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Activity className="w-6 h-6" /></div>
              <div>
                <p className="font-bold text-lg">245</p>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Active Users</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">12/s</p>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Requests</p>
            </div>
          </div>
          <div className="mt-6 h-10 flex items-end gap-1">
            {[40, 25, 60, 30, 80, 50, 45, 90, 60, 40].map((height, i) => (
              <motion.div 
                key={i} 
                initial={{ height: 0 }} 
                animate={{ height: `${height}%` }} 
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="flex-1 bg-orange-200 rounded-t-sm"
              />
            ))}
          </div>
        </Card>
      </div>

      <Card title="System Logs" className="mt-6">
        <div className="space-y-3 mt-4">
          {[
            { level: 'info', msg: 'Owner user logged in via IP 192.168.1.5', time: 'Just now' },
            { level: 'warning', msg: 'Database connection latency spike (120ms)', time: '5 mins ago' },
            { level: 'info', msg: 'Automated backup completed successfully', time: '1 hour ago' },
            { level: 'error', msg: 'Failed login attempt (Invalid credentials)', time: '2 hours ago' },
          ].map((log, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                {log.level === 'info' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                {log.level === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                {log.level === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                <span className={`font-medium text-sm ${log.level === 'error' ? 'text-red-700' : 'text-gray-700'}`}>
                  {log.msg}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium">{log.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
