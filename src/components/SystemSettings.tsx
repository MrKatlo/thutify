import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Palette, Globe, Shield, CreditCard, User, Clock, Bell, ImageIcon, Monitor, Lock, Check } from 'lucide-react';
import { motion } from 'motion/react';

export function SystemSettings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState((profile?.role === 'teacher' || profile?.role === 'student') ? 'profile' : 'branding');
  const [loading, setLoading] = useState(false);

  // Live Settings State (Admin)
  const [platformName, setPlatformName] = useState('LearnFlow');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('black');
  
  // Payment methods checkboxes
  const [methods, setMethods] = useState({
    transfer: true,
    cash: false,
    card: true
  });

  // Personal States (Student/Teacher)
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [availability, setAvailability] = useState('Active');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchPlatformSettings();
    }
  }, [profile]);

  const fetchPlatformSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'platform');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setPlatformName(data.platformName || 'LearnFlow');
        setLogoUrl(data.logoUrl || '');
        setPrimaryColor(data.primaryColor || 'black');
        if (data.paymentMethods) {
          setMethods(data.paymentMethods);
        }
      }
    } catch (err) {
      console.warn("Could not load platform settings from Firestore, using standard defaults:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      if (profile?.role === 'admin') {
        const docRef = doc(db, 'settings', 'platform');
        await setDoc(docRef, {
          platformName,
          logoUrl,
          primaryColor,
          paymentMethods: methods,
          updatedAt: new Date()
        });
        alert("Platform configurations successfully persisted to Firestore settings document!");
      } else {
        alert("Profile details saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings to live Firestore database.");
    } finally {
      setLoading(false);
    }
  };

  const adminTabs = [
    { id: 'branding', label: 'Branding & Theme', icon: Palette },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'security', label: 'Security & Roles', icon: Shield },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
  ];

  const teacherTabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'availability', label: 'Availability Status', icon: Clock },
    { id: 'notifications', label: 'Notification Prefs', icon: Bell },
    { id: 'theme', label: 'Theme (Dark Mode)', icon: Palette },
  ];

  const tabs = (profile?.role === 'teacher' || profile?.role === 'student') ? teacherTabs : adminTabs;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1 font-medium">Configure platform preferences, styling customization, and availability status.</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={loading} className="bg-black text-white hover:bg-gray-800">
          {loading ? 'Saving...' : 'Save Settings'}
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
            {activeTab === 'profile' && (
              <Card title="Edit Profile Details">
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      defaultValue={profile?.email || ''} 
                      className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed focus:outline-none text-sm" 
                      disabled 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Profile Picture Link</label>
                    <div className="flex items-center gap-6">
                      <img 
                        src={photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
                        className="w-16 h-16 rounded-full border border-gray-200"
                        alt="Profile avatar"
                      />
                      <input 
                        type="text"
                        placeholder="https://..."
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                        className="w-full max-w-xs px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'availability' && (
              <Card title="Availability Status" description="Indicate your availability status to students and administrative staff.">
                <div className="space-y-4 mt-6">
                  {['Active', 'Busy', 'Offline'].map((status) => (
                    <div 
                      key={status}
                      onClick={() => setAvailability(status)}
                      className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                        availability === status ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-900">{status}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {status === 'Active' ? 'Open for student Q&As and grading.' : status === 'Busy' ? 'Currently teaching or preparing syllabus.' : 'Do not disturb.'}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${availability === status ? 'border-black' : 'border-gray-300'}`}>
                        {availability === status && <div className="w-2 h-2 rounded-full bg-black"></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card title="Notification Preferences" description="Choose how you receive assignment submissions, exam alerts, and student enrollment alerts.">
                <div className="space-y-4 mt-6">
                  {[
                    { label: 'Email Notifications', desc: 'Syllabus changes, weekly logs, financial alerts' },
                    { label: 'SMS Notifications', desc: 'Urgent meeting schedules and student alerts' },
                    { label: 'Push Notifications', desc: 'New messages, forum replies, and student enrollments' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{item.label}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'theme' && (
              <Card title="Theme & Appearance" description="Customize interface theme elements for maximum eye comfort.">
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Theme mode</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Enable Dark Mode interface settings</p>
                    </div>
                    <div 
                      onClick={() => setDarkMode(!darkMode)}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${darkMode ? 'bg-black' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${darkMode ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Admin specific tabs */}
            {activeTab === 'branding' && (
              <Card title="Website Branding">
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Platform Name</label>
                    <input 
                      type="text" 
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-semibold" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Primary Logo Link</label>
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain rounded-xl" alt="Logo preview" /> : <ImageIcon className="w-6 h-6 text-gray-400" />}
                      </div>
                      <input 
                        type="text"
                        placeholder="https://..."
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full max-w-xs px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Theme Primary Color</label>
                    <div className="flex gap-4">
                      {['black', 'blue-600', 'emerald-600', 'purple-600'].map(color => (
                        <div 
                          key={color}
                          onClick={() => setPrimaryColor(color)}
                          className={`w-10 h-10 rounded-full border cursor-pointer flex items-center justify-center transition-all ${
                            color === 'black' ? 'bg-black' : color === 'blue-600' ? 'bg-blue-600' : color === 'emerald-600' ? 'bg-emerald-600' : 'bg-purple-600'
                          } ${primaryColor === color ? 'ring-2 ring-offset-2 ring-blackScale' : ''}`}
                        >
                          {primaryColor === color && <Check className="w-4 h-4 text-white" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'payment' && (
              <Card title="Payment Gateways" description="Enable or disable payment collection avenues for students.">
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Bank Transfer</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Students can upload wire transaction reference receipts.</p>
                    </div>
                    <div 
                      onClick={() => setMethods(prev => ({ ...prev, transfer: !prev.transfer }))}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${methods.transfer ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${methods.transfer ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Cash Payment</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Over-the-counter payments registered by administrators.</p>
                    </div>
                    <div 
                      onClick={() => setMethods(prev => ({ ...prev, cash: !prev.cash }))}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${methods.cash ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${methods.cash ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Credit / Debit Card</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Instant online payment clearance using Stripe / Gateway integration.</p>
                    </div>
                    <div 
                      onClick={() => setMethods(prev => ({ ...prev, card: !prev.card }))}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${methods.card ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${methods.card ? 'right-1' : 'left-1'}`}></div>
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
                      <h4 className="font-bold text-sm text-gray-900">Two-Factor Authentication</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Require 2FA for all admin and teacher accounts.</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Login History Tracking</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Keep logs of all user logins, sessions, and client IPs.</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'localization' && (
              <Card title="Localization & Formats">
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Primary Language</h4>
                      <p className="text-xs text-gray-500 mt-0.5">English (United States)</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Default Currency</h4>
                      <p className="text-xs text-gray-500 mt-0.5">USD ($) - US Dollar</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
