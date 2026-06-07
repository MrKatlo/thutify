import { Printer, Edit2, Trash2 } from 'lucide-react';
import { formatMoney } from '../../lib/currency';

interface PaymentListProps {
  payments: any[];
  onEdit: (p: any) => void;
  onDelete: (p: any) => void;
  onReceipt: (p: any) => void;
  loading: boolean;
  readonly?: boolean;
  currency?: string;
}

export function PaymentList({ payments, onEdit, onDelete, onReceipt, loading, readonly = false, currency = 'BWP' }: PaymentListProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student & Course</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Paid</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Outstanding</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reference & Method</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">No payment transactions found.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    <p className="font-bold text-gray-900">{p.student_name || p.studentName}</p>
                    <p className="text-xs text-gray-500">{p.course_name || p.courseName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{formatMoney(p.amount_paid || p.amountPaid || 0, currency)}</p>
                    <p className="text-[10px] text-gray-400">Total: {formatMoney(p.total_fee || p.totalFee || 0, currency)}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-red-500">
                    {formatMoney(p.balance || 0, currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'paid' ? 'bg-green-50 text-green-700' : p.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600 font-semibold">
                    <p>Ref: {p.reference_number || p.referenceNumber || 'N/A'}</p>
                    <p className="text-gray-400">{p.payment_method || p.paymentMethod}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => onReceipt(p)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-50"><Printer className="w-4 h-4" /></button>
                      {!readonly && (
                        <>
                          <button onClick={() => onEdit(p)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-50"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => onDelete(p)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
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
