import { useState } from 'react';
import { Card, Button } from '../ui/Card';
import { Award } from 'lucide-react';

interface CertificateGeneratorProps {
  onGenerate: (studentId: string, courseId: string) => void;
  courses: any[];
  students: any[];
}

export function CertificateGenerator({ onGenerate, courses, students }: CertificateGeneratorProps) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  return (
    <Card title="Issue New Certificate" description="Generate a verified completion credential for a student.">
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Recipient Student</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
          >
            <option value="">Select Student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.fullName || s.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Completed Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm"
          >
            <option value="">Select Course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.course_name || c.title}</option>)}
          </select>
        </div>
        <Button 
          onClick={() => onGenerate(selectedStudent, selectedCourse)}
          disabled={!selectedStudent || !selectedCourse}
          className="w-full bg-black text-white hover:bg-gray-800 gap-2 mt-2"
        >
          <Award className="w-4 h-4" />
          Issue Verified Certificate
        </Button>
      </div>
    </Card>
  );
}
