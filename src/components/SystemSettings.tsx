import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Palette, Globe, Shield, CreditCard, User, Clock, Bell, ImageIcon, Check, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import * as cfApi from '../services/cfApi';

export function SystemSettings() {
  const { profile, institutionId } = useAuth();
  const [activeTab, setActiveTab] = useState((profile?.role === 'teacher' || profile?.role === 'student') ? 'profile' : 'branding');
  const [loading, setLoading] = useState(false);
  const [institution, setInstitution] = useState<any>(null);

  // Live Settings State (Admin)
  const [platformName, setPlatformName] = useState('LearnFlow');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('black');
  
  // Personal States (Student/Teacher)
  const [displayName, setDisplayName] = useState(profile?.full_name || '');
  const [photoURL, setPhotoURL] = useState(profile?.photo_url || '');

  useEffect(() => {
    if (institutionId) {
      fetchData();
    }
  }, [institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const inst = await cfApi.getInstitution(institutionId);
      setInstitution(inst);
      setPlatformName(inst.name || 'LearnFlow');
      setLogoUrl(inst.logo_url || '');
      setPrimaryColor(inst.primary_color || 'black');
    } catch (err) {
      console.error("Fetch institution failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      if (profile?.role === 'admin' || profile?.role === 'owner') {
        await cfApi.updateInstitution(institutionId, {
          name: platformName,
          logo_url: logoUrl,
          primary_color: primaryColor
        });
        alert("Institutional settings saved successfully!");
      } else {
        await cfApi.updateCurrentUser({
          fullName: displayName,
          photoUrl: photoURL
        });
        alert("Profile details saved successfully!");
      }
      fetchData();
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const adminTabs = [
    { id: 'branding', label: 'Branding & Theme', icon: Palette },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
    { id: 'payment', label: 'Payment Settings', icon: CreditCard },
  ];

  const personalTabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'notifications', label: 'Notification Prefs', icon: Bell },
  ];

  const tabs = (profile?.role === 'admin' || profile?.role === 'owner') ? [...personalTabs, ...adminTabs] : personalTabs;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Settings Hub</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Configure your personal profile and institutional preferences.</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={loading} className="bg-black text-white px-8">
          {loading ? 'Processing...' : 'Commit Changes'}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-8">
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-black text-white shadow-xl shadow-black/10' 
                  : 'text-gray-400 hover:bg-gray-100 hover:text-black'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            {activeTab === 'profile' && (
              <Card title="Personal Profile Identification">
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Public Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full max-w-md px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Avatar Source URL</label>
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-xl overflow-hidden shadow-lg shadow-black/10">
                         {photoURL ? <img src={photoURL} className="w-full h-full object-cover" /> : profile?.full_name?.charAt(0)}
                      </div>
                      <input 
                        type="text"
                        placeholder="https://..."
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                        className="w-full max-w-xs px-4 py-2 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'branding' && (
              <Card title="Institutional Branding" description="Customize how your institution appears to students and staff.">
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Institution Name</label>
                    <input 
                      type="text" 
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="w-full max-w-md px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Institutional Logo URL</label>
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain p-2" alt="Logo" /> : <ImageIcon className="w-6 h-6 text-gray-300" />}
                      </div>
                      <input 
                        type="text"
                        placeholder="https://..."
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full max-w-xs px-4 py-2 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Primary Aesthetic Color</label>
                    <div className="flex gap-4">
                      {['black', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'].map(color => (
                        <div 
                          key={color}
                          onClick={() => setPrimaryColor(color)}
                          className={`w-10 h-10 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all ${primaryColor === color ? 'border-black scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                          style={{ backgroundColor: color === 'black' ? '#000' : color }}
                        >
                          {primaryColor === color && <Check className="w-4 h-4 text-white" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card title="Security & API Access">
                 <div className="space-y-4 mt-6">
                    <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
                       <div>
                         <p className="font-bold text-sm text-gray-900">Enforce Institution-only Login</p>
                         <p className="text-xs text-gray-400 mt-0.5">Restrict access to verified institutional emails only.</p>
                       </div>
                       <div className="w-10 h-5 bg-green-500 rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute right-1 top-1"></div></div>
                    </div>
                    <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed bg-gray-50">
                       <div>
                         <p className="font-bold text-sm text-gray-900">Advanced API Webhooks</p>
                         <p className="text-xs text-gray-400 mt-0.5">Trigger external actions on course enrollment or completion.</p>
                       </div>
                       <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                 </div>
              </Card>
            )}

            {activeTab === 'payment' && (
              <Card title="Payment Engine Config">
                 <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl">
                    <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h4 className="font-bold text-gray-900">Automated Clearing House</h4>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-2">The financial clearing engine is managed at the platform level. Contact support to change your payout currency or gateway provider.</p>
                 </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
