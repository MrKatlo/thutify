import { Printer, Download, Clock } from 'lucide-react';
import { Button } from '../ui/Card';

interface InvoiceListProps {
  invoices: any[];
  onDownload: (inv: any) => void;
  loading: boolean;
}

export function InvoiceList({ invoices, onDownload, loading }: InvoiceListProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Invoice Number</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Due Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">No invoices issued.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700">{inv.student_name}</td>
                  <td className="px-6 py-4 text-sm font-black text-black">${inv.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      inv.status === 'paid' ? 'bg-green-50 text-green-700' : 
                      inv.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-semibold">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button onClick={() => onDownload(inv)} variant="outline" className="text-xs py-1.5 gap-1.5">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
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
