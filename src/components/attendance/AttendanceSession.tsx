import { Card } from '../ui/Card';
import { Check, X, Clock, Search } from 'lucide-react';

interface AttendanceSessionProps {
  students: any[];
  attendanceRecords: any[];
  onMark: (studentId: string, status: 'present' | 'absent' | 'late') => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  loading: boolean;
  selectedCourseName: string;
}

export function AttendanceSession({
  students,
  attendanceRecords,
  onMark,
  searchTerm,
  setSearchTerm,
  loading,
  selectedCourseName,
}: AttendanceSessionProps) {
  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
  const filteredStudents = students
    .filter((s) => {
      const firstName = String(s.firstName || s.first_name || '').toLowerCase();
      const lastName = String(s.lastName || s.last_name || '').toLowerCase();
      const fullName = String(s.fullName || s.name || `${firstName} ${lastName}`.trim() || '').toLowerCase();
      const studentId = String(s.studentId || s.student_id || s.id || '').toLowerCase();
      const studentNumber = String(s.studentNumber || s.student_number || '').toLowerCase();
      const email = String(s.email || '').toLowerCase();
      return (
        normalizedSearch === '' ||
        [fullName, firstName, lastName, studentId, studentNumber, email].some((value) => value.includes(normalizedSearch))
      );
    })
    .sort((a, b) =>
      String(a.lastName || a.last_name || a.fullName || a.name || '')
        .localeCompare(String(b.lastName || b.last_name || b.fullName || b.name || '')) ||
      String(a.firstName || a.first_name || '').localeCompare(String(b.firstName || b.first_name || '')),
    );

  return (
    <Card title="Mark Roll Call" description={`Auditing student roster for ${selectedCourseName}`}>
      <div className="my-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          list="attendance-search-options"
          placeholder="Search by first name, last name, student ID, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
        />
        <datalist id="attendance-search-options">
          {students.map((student) => {
            const firstName = student.firstName || student.first_name || '';
            const lastName = student.lastName || student.last_name || '';
            const displayName = `${firstName} ${lastName}`.trim() || student.fullName || student.name || '';
            const studentId = student.studentId || student.student_id || student.id || '';
            return (
              <option key={student.id} value={`${displayName} ${studentId}`.trim()} />
            );
          })}
        </datalist>
      </div>

      {!loading && (
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>{filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'} shown</span>
          {searchTerm && <span>Filtering by “{searchTerm}”</span>}
        </div>
      )}

      {loading ? (
        <div className="h-48 bg-gray-50 rounded-2xl animate-pulse" />
      ) : filteredStudents.length === 0 ? (
        <div className="py-12 text-center text-gray-400 italic">No enrolled students found in this course.</div>
      ) : (
        <div className="space-y-3 mt-4">
          {filteredStudents.map((student) => {
            const record = attendanceRecords.find(
              (r) => r.student_id === student.id || r.studentId === student.id,
            );
            const currentStatus = record ? record.status : '';

            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
                    {String(student.fullName || student.name || '').charAt(0) || 'S'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{student.fullName || student.name}</p>
                    <p className="text-xs text-gray-400">{student.studentNumber || student.student_number || student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg">
                  <button
                    onClick={() => onMark(student.id, 'present')}
                    className={`p-2 rounded-md transition-colors ${
                      currentStatus === 'present'
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-gray-200'
                    }`}
                    title="Mark Present"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onMark(student.id, 'absent')}
                    className={`p-2 rounded-md transition-colors ${
                      currentStatus === 'absent'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-gray-200'
                    }`}
                    title="Mark Absent"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onMark(student.id, 'late')}
                    className={`p-2 rounded-md transition-colors ${
                      currentStatus === 'late'
                        ? 'bg-yellow-500 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-gray-200'
                    }`}
                    title="Mark Late"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
