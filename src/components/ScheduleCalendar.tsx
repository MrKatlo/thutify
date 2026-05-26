import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button } from './ui/Card';
import { Calendar as CalendarIcon, Clock, BookOpen, Bell, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import * as cfApi from '../services/cfApi';

export function ScheduleCalendar() {
  const { profile, institutionId } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    courseId: '',
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '11:00',
    room: 'Exam Hall A',
  });

  useEffect(() => {
    fetchData();
    fetchCourses();
  }, [institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const list = await cfApi.getTimetable(institutionId, profile?.role === 'teacher' ? profile.uid : undefined);
      setSchedule(list);
    } catch (err) {
      console.error('Fetch timetable failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    if (!institutionId) return;
    try {
      const list = await cfApi.listCourses(institutionId);
      setCourses(list);
      if (list.length > 0 && !formData.courseId) {
        setFormData((current) => ({ ...current, courseId: list[0].id }));
      }
    } catch (err) {
      console.error('Fetch courses failed:', err);
    }
  };

  const submitExamSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId || !formData.courseId) return;
    setSaving(true);

    try {
      await cfApi.createTimetableEntry(institutionId, {
        course_id: formData.courseId,
        day_of_week: Number(formData.dayOfWeek),
        start_time: formData.startTime,
        end_time: formData.endTime,
        room: formData.room,
        teacher_id: profile?.uid,
      });
      await fetchData();
      alert('Exam scheduled successfully.');
    } catch (err) {
      console.error('Exam scheduling failed:', err);
      alert('Unable to schedule exam. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getDayName = (day: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Exam Scheduling</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Create and review exam sessions using the institution timetable.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <Card title="Scheduled Exam Sessions">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-black animate-spin" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading exam schedule...</p>
              </div>
            ) : schedule.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl">
                <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-900">No exam sessions scheduled yet.</p>
                <p className="text-sm text-gray-500 mt-2">Use the form on the right to book an exam slot.</p>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {schedule.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 border-l-4 rounded-r-2xl border-black bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-black text-gray-400 w-24 shrink-0 uppercase">{getDayName(item.day_of_week)}</div>
                      <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/40">{item.start_time} - {item.end_time}</span>
                        <h4 className="font-bold text-gray-900 mt-0.5">{item.course_name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Room: {item.room || 'Virtual'}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase shrink-0">
                      <Clock className="w-3.5 h-3.5" /> EXAM
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Create New Exam" description="Book an exam session into the academic timetable.">
          <form className="space-y-5" onSubmit={submitExamSchedule}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Course</label>
              <select
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900"
                value={formData.courseId}
                onChange={(event) => setFormData((current) => ({ ...current, courseId: event.target.value }))}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Day of Week</label>
                <select
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900"
                  value={formData.dayOfWeek}
                  onChange={(event) => setFormData((current) => ({ ...current, dayOfWeek: event.target.value }))}
                >
                  {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((name, index) => (
                    <option key={index} value={index.toString()}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Room</label>
                <input
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900"
                  value={formData.room}
                  onChange={(event) => setFormData((current) => ({ ...current, room: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Start Time</label>
                <input
                  type="time"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900"
                  value={formData.startTime}
                  onChange={(event) => setFormData((current) => ({ ...current, startTime: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">End Time</label>
                <input
                  type="time"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900"
                  value={formData.endTime}
                  onChange={(event) => setFormData((current) => ({ ...current, endTime: event.target.value }))}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving || !courses.length}>
              {saving ? 'Scheduling Exam…' : 'Schedule Exam'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
