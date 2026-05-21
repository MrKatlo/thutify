import { Card, Button } from '../ui/Card';
import { Edit2, Trash2 } from 'lucide-react';

interface AssignmentListProps {
  assignments: any[];
  onEdit: (a: any) => void;
  onDelete: (id: string) => void;
  isTeacher: boolean;
  onSelect?: (a: any) => void;
}

export function AssignmentList({ assignments, onEdit, onDelete, isTeacher, onSelect }: AssignmentListProps) {
  return (
    <Card title="Assigned Coursework" description="List of assignments authored for your classes.">
      <div className="overflow-x-auto mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400 italic">No assignments authored yet.</td></tr>
            ) : (
              assignments.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-900 text-sm">
                    <p>{a.title}</p>
                    {a.description && <p className="text-xs font-normal text-gray-400 mt-0.5">{a.description}</p>}
                  </td>
                  <td className="py-4 px-4 text-xs font-bold text-gray-600">{a.courseName}</td>
                  <td className="py-4 px-4 text-xs font-semibold text-gray-500">{a.dueDate}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isTeacher && (
                        <>
                          <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-50"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => onDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                      {!isTeacher && onSelect && (
                        <Button onClick={() => onSelect(a)} className="text-xs py-1 bg-black text-white hover:bg-gray-800">
                          Submit Work
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
