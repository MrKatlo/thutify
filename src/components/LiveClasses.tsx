import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Plus } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as cfApi from '../services/cfApi';

// Sub-components
import { LiveClassList } from './live-classes/LiveClassList';
import { LiveClassCreate } from './live-classes/LiveClassCreate';

export function LiveClasses() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    title: '',
    courseName: '',
    dateTime: '',
    meetingLink: '',
    platform: 'Zoom'
  });

  useEffect(() => {
    fetchClasses();
    fetchCourses();
  }, [profile]);

  const fetchCourses = async () => {
    if (!profile?.institution_id) return;
    try {
      const list = await cfApi.listCourses(profile.institution_id);
      setCourses(list);
    } catch (err) {
      console.error("Fetch courses failed:", err);
    }
  };

  const fetchClasses = async () => {
    if (!profile?.institution_id) return;
    setLoading(true);
    try {
      const list = await cfApi.listLiveClasses(profile.institution_id);
      if (profile.role === 'teacher') {
        setClasses(list.filter((l: any) => l.teacher_id === profile.uid));
      } else {
        setClasses(list);
      }
    } catch (err) {
      console.error("Fetch live classes failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.institution_id) return;
    try {
      await cfApi.createLiveClass(profile.institution_id, {
        ...formData,
        teacher_id: profile.uid
      });
      setShowForm(false);
      setFormData({ title: '', courseName: '', dateTime: '', meetingLink: '', platform: 'Zoom' });
      fetchClasses();
      alert("Live class scheduled!");
    } catch (error) {
      console.error("Failed to create live class:", error);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Cancel this live class?")) return;
    try {
      await cfApi.deleteLiveClass(classId);
      fetchClasses();
    } catch (error) {
      console.error("Failed to delete live class:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Live Online Classes</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Schedule and start live interactive sessions.</p>
        </div>
        {profile?.role !== 'student' && (
          <Button onClick={() => setShowForm(true)} className="bg-black text-white shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Live Class
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveClassList 
            classes={classes} 
            onDelete={handleDeleteClass} 
            isTeacher={profile?.role !== 'student'} 
            loading={loading} 
          />
        </div>

        <Card title="Quick Integrations">
          <div className="space-y-4 mt-6">
            <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-900">Zoom Integration</p>
                <p className="text-xs text-green-600 font-bold uppercase tracking-wider mt-0.5">Connected</p>
              </div>
              <Button variant="outline" className="text-xs py-1 px-3">Disconnect</Button>
            </div>
            <div className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-900">Google Meet</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Not Setup</p>
              </div>
              <Button className="bg-black text-white text-xs py-1 px-3">Connect</Button>
            </div>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        <LiveClassCreate 
          show={showForm} 
          onClose={() => setShowForm(false)} 
          onSave={handleCreateClass}
          courses={courses}
          formData={formData}
          setFormData={setFormData}
        />
      </AnimatePresence>
    </div>
  );
}
