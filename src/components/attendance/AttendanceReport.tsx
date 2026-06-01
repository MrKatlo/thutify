import { Card } from '../ui/Card';

interface AttendanceReportProps {
  history: any[];
  students: any[];
  courses: any[];
  teachers: any[];
  filters: {
    studentId: string;
    courseId: string;
    teacherId: string;
    startDate: string;
    endDate: string;
  };
  onFilterChange: (field: string, value: string) => void;
  onClearFilters: () => void;
}

export function AttendanceReport({ history, students, courses, teachers, filters, onFilterChange, onClearFilters }: AttendanceReportProps) {
  const sortedStudents = [...students].sort((a, b) =>
    String(a.fullName || a.full_name || '').localeCompare(String(b.fullName || b.full_name || '')),
  );
  const sortedTeachers = [...teachers].sort((a, b) =>
    String(a.fullName || a.full_name || '').localeCompare(String(b.fullName || b.full_name || '')),
  );
  const studentMap = new Map(sortedStudents.map((student) => [student.id, student.fullName || student.full_name || student.email]));
  const teacherMap = new Map(sortedTeachers.map((teacher) => [teacher.id, teacher.fullName || teacher.full_name || teacher.email]));

  const filteredHistory = history.filter((record) => {
    const recordDate = String(record.created_at || record.marked_at || record.date || '').slice(0, 10);
    if (filters.startDate && recordDate < filters.startDate) return false;
    if (filters.endDate && recordDate > filters.endDate) return false;
    if (filters.studentId && String(record.student_id || record.studentId) !== filters.studentId) return false;
    if (filters.courseId && String(record.course_id || record.courseId) !== filters.courseId) return false;
    if (filters.teacherId && String(record.marked_by || record.markedBy) !== filters.teacherId) return false;
    return true;
  });

  return (
    <Card title="Attendance Report" description="Filter attendance by student, course, teacher, and date range.">
      <div className="grid gap-3 lg:grid-cols-5 mt-4">
        <label className="space-y-1 text-xs text-gray-500">
          Student
          <select
            value={filters.studentId}
            onChange={(e) => onFilterChange('studentId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
          >
            <option value="">All students</option>
            {sortedStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName || student.full_name || student.studentNumber || student.student_number || student.email}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-500">
          Course
          <select
            value={filters.courseId}
            onChange={(e) => onFilterChange('courseId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_name || course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-500">
          Teacher
          <select
            value={filters.teacherId}
            onChange={(e) => onFilterChange('teacherId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
          >
            <option value="">All teachers</option>
            {sortedTeachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.fullName || teacher.full_name || teacher.email}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-500">
          From
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </label>
        <label className="space-y-1 text-xs text-gray-500">
          To
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="text-sm text-gray-600">
          Showing {filteredHistory.length} of {history.length} attendance records.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear filters
        </button>
      </div>

      <div className="overflow-x-auto mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((record, index) => {
              const recordDate = String(record.created_at || record.marked_at || record.date || '').slice(0, 10);
              const studentName = record.student_name || record.studentName || studentMap.get(record.student_id || record.studentId) || 'Unknown';
              const teacherName = teacherMap.get(record.marked_by || record.markedBy) || String(record.teacher_name || record.teacherName || 'Unknown');
              const courseName = record.course_name || record.courseName || record.course || 'Unknown';
              return (
                <tr key={`${record.id || index}-${recordDate}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 text-sm font-bold text-gray-900">{recordDate}</td>
                  <td className="py-4 px-4 text-sm text-gray-700">{studentName}</td>
                  <td className="py-4 px-4 text-sm text-gray-700">{courseName}</td>
                  <td className="py-4 px-4 text-sm text-gray-700">{teacherName}</td>
                  <td className="py-4 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        record.status === 'present'
                          ? 'bg-green-50 text-green-700'
                          : record.status === 'late'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {String(record.status || '').toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
