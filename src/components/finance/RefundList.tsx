import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Card';

interface RefundListProps {
  refunds: any[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
  isOwner: boolean;
}

export function RefundList({ refunds, onApprove, onReject, loading, isOwner }: RefundListProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reason</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : refunds.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium italic">No refund requests found.</td></tr>
            ) : (
              refunds.map((ref) => (
                <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{ref.student_name}</td>
                  <td className="px-6 py-4 text-sm font-black text-red-600">${ref.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-medium italic">"{ref.reason}"</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ref.status === 'processed' ? 'bg-green-50 text-green-700' : 
                      ref.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {ref.status === 'pending' && isOwner && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onApprove(ref.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={() => onReject(ref.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
