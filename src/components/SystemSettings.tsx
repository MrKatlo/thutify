import { useState } from 'react';
import { Card, Button } from './ui/Card';
import { Settings, Image as ImageIcon, Globe, Shield, CreditCard, Palette, Monitor } from 'lucide-react';
import { motion } from 'motion/react';

export function SystemSettings() {
  const [activeTab, setActiveTab] = useState('branding');

  const tabs = [
    { id: 'branding', label: 'Branding & Theme', icon: Palette },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'security', label: 'Security & Roles', icon: Shield },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">System Settings</h1>
          <p className="text-gray-500 mt-1 font-medium">Configure application preferences, integrations, and security policies.</p>
        </div>
        <Button className="bg-black text-white hover:bg-gray-800">
          Save All Changes
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-8">
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-black text-white shadow-md shadow-black/10' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-black'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'branding' && (
              <Card title="Website Branding">
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Platform Name</label>
                    <input type="text" defaultValue="LearnFlow" className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Primary Logo</label>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <Button variant="outline">Upload New Image</Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Theme Colors</label>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-black border-2 border-transparent ring-2 ring-black ring-offset-2"></div>
                      <div className="w-10 h-10 rounded-full bg-blue-600 border border-gray-200 cursor-pointer"></div>
                      <div className="w-10 h-10 rounded-full bg-emerald-600 border border-gray-200 cursor-pointer"></div>
                      <div className="w-10 h-10 rounded-full bg-purple-600 border border-gray-200 cursor-pointer"></div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card title="Security Features">
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div>
                      <h4 className="font-bold">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div>
                      <h4 className="font-bold">Login History Tracking</h4>
                      <p className="text-sm text-gray-500">Keep logs of all user logins and IPs</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4 flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Monitor className="w-4 h-4" /> View Activity Logs
                  </Button>
                </div>
              </Card>
            )}

            {activeTab !== 'branding' && activeTab !== 'security' && (
              <Card title={`${tabs.find(t => t.id === activeTab)?.label} Settings`}>
                <div className="h-48 flex items-center justify-center text-gray-400 font-medium italic">
                  Configuration options coming soon.
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
