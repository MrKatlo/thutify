import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Palette, Globe, Shield, CreditCard, User, Clock, Bell, ImageIcon, Check, Lock, Mail, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import * as cfApi from '../services/cfApi';

interface SystemSettingsProps {
  initialActiveTab?: string;
}

export function SystemSettings({ initialActiveTab }: SystemSettingsProps) {
  const { profile, institutionId } = useAuth();

  const personalTabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'notifications', label: 'Notification Prefs', icon: Bell },
  ];

  const ownerTabs = [
    { id: 'branding', label: 'Branding & Theme', icon: Palette },
    { id: 'logo', label: 'Logo Upload', icon: ImageIcon },
    { id: 'theme', label: 'Theme Colors', icon: Palette },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'timezone', label: 'Timezone', icon: Clock },
    { id: 'currency', label: 'Currency', icon: DollarSign },
    { id: 'gateways', label: 'Payment Gateways', icon: CreditCard },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
  ];

  const availableTabs = profile?.role === 'owner' ? [...personalTabs, ...ownerTabs] : personalTabs;
  const defaultTab = initialActiveTab && availableTabs.some(tab => tab.id === initialActiveTab)
    ? initialActiveTab
    : (profile?.role === 'teacher' || profile?.role === 'student' ? 'profile' : 'branding');

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [institution, setInstitution] = useState<any>(null);

  // Live Settings State (Owner)
  const [platformName, setPlatformName] = useState('LearnFlow');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('black');
  const [emailSender, setEmailSender] = useState('no-reply@learnflow.com');
  const [language, setLanguage] = useState('English');
  const [timezoneValue, setTimezoneValue] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [gateway, setGateway] = useState('Stripe');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  
  // Personal States (Student/Teacher)
  const [displayName, setDisplayName] = useState(profile?.fullName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');

  useEffect(() => {
    if (!initialActiveTab) return;
    if (availableTabs.some(tab => tab.id === initialActiveTab)) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab, availableTabs]);

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
      setLogoUrl(inst.logoUrl || inst.logo_url || '');
      setPrimaryColor(inst.primaryColor || inst.primary_color || 'black');
      setEmailSender(inst.emailSender || inst.email_sender || 'no-reply@learnflow.com');
      setLanguage(inst.language || inst.locale || 'English');
      setTimezoneValue(inst.timezone || 'UTC');
      setCurrency(inst.currency || 'USD');
      setGateway(inst.paymentGateway || inst.payment_gateway || 'Stripe');
      setEmailNotifications(inst.emailNotifications ?? inst.email_notifications ?? true);
      setSmsNotifications(inst.smsNotifications ?? inst.sms_notifications ?? false);
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
      if (profile?.role === 'owner') {
        await cfApi.updateInstitution(institutionId, {
          name: platformName,
          logo_url: logoUrl,
          primary_color: primaryColor,
          email_sender: emailSender,
          language,
          timezone: timezoneValue,
          currency,
          payment_gateway: gateway,
          email_notifications: emailNotifications,
          sms_notifications: smsNotifications,
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

  const tabs = profile?.role === 'owner' ? [...personalTabs, ...ownerTabs] : personalTabs;

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
                        {photoURL ? <img src={photoURL} className="w-full h-full object-cover" /> : profile?.fullName?.charAt(0)}
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

            {activeTab === 'notifications' && (
              <Card title="Notification Preferences">
                <div className="space-y-6 mt-6">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                    <div>
                      <p className="font-bold text-sm text-gray-900">Email Notifications</p>
                      <p className="text-xs text-gray-400 mt-0.5">Receive system updates and announcements in your inbox.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-black transition-colors" />
                      <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform"></span>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                    <div>
                      <p className="font-bold text-sm text-gray-900">SMS Alerts</p>
                      <p className="text-xs text-gray-400 mt-0.5">Enable or disable SMS-based activity alerts.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={smsNotifications} onChange={(e) => setSmsNotifications(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-black transition-colors" />
                      <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform"></span>
                    </label>
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

            {activeTab === 'logo' && (
              <Card title="Institution Logo" description="Update the branding image used across the institution portal.">
                <div className="space-y-6 mt-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-3xl flex items-center justify-center overflow-hidden">
                      {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain" alt="Institution Logo" /> : <ImageIcon className="w-8 h-8 text-gray-300" />}
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Logo URL</label>
                      <input 
                        type="text"
                        placeholder="https://..."
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-black text-sm"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'theme' && (
              <Card title="Theme Colors" description="Select the global accent color for your institution.">
                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                    {['black', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#0ea5e9'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPrimaryColor(color)}
                        className={`h-14 rounded-3xl shadow-sm transition-transform ${primaryColor === color ? 'scale-105 ring-4 ring-black/20' : 'hover:scale-105'}`}
                        style={{ backgroundColor: color === 'black' ? '#000' : color }}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-gray-500">The chosen color will be used across buttons, headers, and key accent elements.</div>
                </div>
              </Card>
            )}

            {activeTab === 'email' && (
              <Card title="Email Settings" description="Configure sender details and notification preferences.">
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Sender Address</label>
                    <input 
                      type="text"
                      value={emailSender}
                      onChange={(e) => setEmailSender(e.target.value)}
                      className="w-full max-w-md px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-100 rounded-3xl">
                      <p className="font-bold text-sm text-gray-900 mb-2">Account Updates</p>
                      <p className="text-xs text-gray-400">Notifications for system activity, invoices, and announcements.</p>
                    </div>
                    <div className="p-4 border border-gray-100 rounded-3xl">
                      <p className="font-bold text-sm text-gray-900 mb-2">Support Emails</p>
                      <p className="text-xs text-gray-400">Choose the address students and teachers see in outgoing communications.</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'localization' && (
              <Card title="Localization" description="Manage language and regional formatting preferences.">
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Default Language</label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full max-w-xs px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm"
                    >
                      {['English', 'Spanish', 'French', 'Portuguese', 'German'].map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">This setting adjusts the default interface language for new portal users.</p>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'timezone' && (
              <Card title="Timezone" description="Set the institution's primary timezone.">
                <div className="space-y-6 mt-6">
                  <select 
                    value={timezoneValue}
                    onChange={(e) => setTimezoneValue(e.target.value)}
                    className="w-full max-w-xs px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm"
                  >
                    {['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'].map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500">Student-facing timestamps and scheduling defaults are based on this timezone.</p>
                </div>
              </Card>
            )}

            {activeTab === 'currency' && (
              <Card title="Currency" description="Choose the default billing currency.">
                <div className="space-y-6 mt-6">
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full max-w-xs px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm"
                  >
                    {['USD', 'EUR', 'GBP', 'AUD', 'NGN'].map(currencyOption => (
                      <option key={currencyOption} value={currencyOption}>{currencyOption}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500">This currency is used for payments, invoices, and financial reports.</p>
                </div>
              </Card>
            )}

            {activeTab === 'gateways' && (
              <Card title="Payment Gateways" description="Select the preferred payment provider.">
                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Stripe', 'PayPal', 'Razorpay'].map(provider => (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setGateway(provider)}
                        className={`w-full p-4 rounded-3xl border transition-all ${gateway === provider ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-black/50'}`}
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">The selected gateway is used for tuition collection and refunds.</p>
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}
