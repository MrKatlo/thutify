import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ui/Toast';
import { Card, Button } from './ui/Card';
import { User, CalendarCheck, TrendingUp, Loader2 } from 'lucide-react';
import * as cfApi from '../services/cfApi';

const VIEW_META: Record<string, { title: string; description: string; icon: typeof User }> = {
  profile: { title: 'My Profile', description: 'Update your professional details and contact information.', icon: User },
  attendance: { title: 'My Attendance', description: 'Read-only record of your institutional attendance.', icon: CalendarCheck },
  performance: { title: 'My Performance', description: 'Teaching metrics across your assigned courses.', icon: TrendingUp },
};

interface TeacherProfileProps {
  initialView?: string;
}

export function TeacherProfile({ initialView = 'profile' }: TeacherProfileProps) {
  const { institutionId } = useAuth();
  const toast = useToast();
  const view = VIEW_META[initialView] ? initialView : 'profile';
  const meta = VIEW_META[view];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    gender: '',
    address: '',
    qualification: '',
    profileImageUrl: '',
    notes: '',
  });

  useEffect(() => {
    if (!institutionId) return;
    loadData();
  }, [institutionId, view, month]);

  const loadData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      if (view === 'profile') {
        const data = await cfApi.getMyTeacherProfile(institutionId);
        setProfile(data);
        setForm({
          fullName: data.fullName || data.full_name || '',
          phone: data.phone || '',
          gender: data.gender || '',
          address: data.address || '',
          qualification: data.qualification || '',
          profileImageUrl: data.profileImageUrl || data.profile_image_url || '',
          notes: data.notes || '',
        });
      } else if (view === 'attendance') {
        setAttendance(await cfApi.getMyTeacherAttendance(institutionId, month));
      } else if (view === 'performance') {
        setPerformance(await cfApi.getMyTeacherPerformance(institutionId));
      }
    } catch (err) {
      console.error('Teacher profile load failed:', err);
      toast.error('Could not load teacher data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    setSaving(true);
    try {
      const updated = await cfApi.updateMyTeacherProfile(institutionId, {
        fullName: form.fullName,
        phone: form.phone,
        gender: form.gender,
        address: form.address,
        qualification: form.qualification,
        profileImageUrl: form.profileImageUrl,
        notes: form.notes,
      });
      setProfile(updated);
      toast.success('Profile updated.');
    } catch (err) {
      console.error(err);
      toast.error('Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const Icon = meta.icon;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 rounded-2xl">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{meta.title}</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">{meta.description}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
        </div>
      ) : view === 'profile' ? (
        <Card title="Professional Profile">
          <form onSubmit={handleSave} className="grid gap-4 mt-6 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-bold text-gray-500">Email</span>
              <input value={profile?.email || ''} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-xl text-gray-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-bold text-gray-500">Full name</span>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-4 py-3 border border-gray-100 rounded-xl" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-bold text-gray-500">Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-100 rounded-xl" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-bold text-gray-500">Gender</span>
              <input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-3 border border-gray-100 rounded-xl" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-bold text-gray-500">Qualification</span>
              <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className="w-full px-4 py-3 border border-gray-100 rounded-xl" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-bold text-gray-500">Address</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 border border-gray-100 rounded-xl" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-bold text-gray-500">Profile photo URL</span>
              <input value={form.profileImageUrl} onChange={(e) => setForm({ ...form, profileImageUrl: e.target.value })} className="w-full px-4 py-3 border border-gray-100 rounded-xl" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-bold text-gray-500">Notes</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-100 rounded-xl" />
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving} className="bg-black text-white">
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </Card>
      ) : view === 'attendance' ? (
        <Card title="Attendance History">
          <div className="mt-4 mb-4">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 border border-gray-100 rounded-xl text-sm" />
          </div>
          {attendance.length === 0 ? (
            <p className="text-sm text-gray-500">No attendance records for this month.</p>
          ) : (
            <div className="space-y-2">
              {attendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl text-sm">
                  <span className="font-medium">{record.attendance_date || record.attendanceDate}</span>
                  <span className={`font-bold uppercase text-xs ${record.status === 'present' ? 'text-green-600' : record.status === 'late' ? 'text-amber-600' : 'text-red-600'}`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Assigned Courses', value: performance?.assignedCoursesCount ?? 0 },
            { label: 'Assigned Students', value: performance?.assignedStudentsCount ?? 0 },
            { label: 'Course Completion', value: `${performance?.courseCompletionRate ?? 0}%` },
            { label: 'My Attendance', value: `${performance?.attendancePercentage ?? 0}%` },
            { label: 'Avg Assignment Grade', value: performance?.averageAssignmentGrade ?? '—' },
            { label: 'Avg Quiz Score', value: performance?.averageQuizScore ?? '—' },
          ].map((item) => (
            <Card key={item.label} className="p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-2xl font-black mt-2">{item.value}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
