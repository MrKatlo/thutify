import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Payment, UserProfile } from '../types';
import { Card, Button } from './ui/Card';
import { DollarSign, Search, Plus, Filter, CheckCircle2, AlertCircle, Clock, MoreVertical, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export function Financials() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [method, setMethod] = useState('Transfer');
  const [reference, setReference] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qPayments = query(collection(db, 'payments'), orderBy('dueDate', 'desc'));
      const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
      
      const [snapPayments, snapStudents] = await Promise.all([
        getDocs(qPayments),
        getDocs(qStudents)
      ]);

      const fetchedStudents = snapStudents.docs.map(doc => doc.data() as UserProfile);
      setStudents(fetchedStudents);

      const fetchedPayments = snapPayments.docs.map(doc => {
        const data = doc.data();
        const student = fetchedStudents.find(s => s.uid === data.studentId);
        return {
          id: doc.id,
          ...data,
          studentName: student?.name || 'Unknown Student'
        } as Payment;
      });
      setPayments(fetchedPayments);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'payments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount) return;

    try {
      await addDoc(collection(db, 'payments'), {
        studentId,
        amount: Number(amount),
        amountPaid: 0,
        description,
        status: 'pending',
        method,
        reference,
        dueDate: new Date(dueDate),
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setStudentId('');
      setAmount('');
      setDescription('');
      setDueDate('');
      setReference('');
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
    }
  };

  const markAsPaid = async (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'paid',
        amountPaid: payment.amount,
        paidAt: serverTimestamp()
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${paymentId}`);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-50 text-green-700 border-green-100';
      case 'partial': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'overdue': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalPending = payments.reduce((sum, p) => sum + (p.amount - (p.amountPaid || 0)), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Financials</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage student invoices and track center revenue.</p>
        </div>
        {profile?.role !== 'student' && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-black text-white border-none shadow-xl shadow-black/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Total Collected</p>
            <h3 className="text-3xl font-black">${totalPaid.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Amount</p>
            <h3 className="text-3xl font-black text-gray-900">${totalPending.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center border border-yellow-100">
            <Clock className="w-6 h-6" />
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Expected</p>
            <h3 className="text-3xl font-black text-gray-900">${(totalPaid + totalPending).toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100">
            <TrendingUp className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Card title="New Student Invoice" description="Create a payment request for a student.">
            <form onSubmit={handleCreatePayment} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3">
                <label className="block text-sm font-bold mb-2">Select Student</label>
                <select 
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                >
                  <option value="">Choose a student...</option>
                  {students.map(s => (
                    <option key={s.uid} value={s.uid}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Amount ($)</label>
                <input 
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Due Date</label>
                <input 
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Payment Method</label>
                <select 
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                >
                  <option value="Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">Description</label>
                <input 
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                  placeholder="e.g. Monthly Tuition - June"
                />
              </div>
              <div className="">
                <label className="block text-sm font-bold mb-2">Ref / Receipt #</label>
                <input 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                  placeholder="Optional"
                />
              </div>
              <div className="md:col-span-3 flex gap-3 pt-2">
                <Button type="submit">Create Invoice</Button>
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Balance</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{p.studentName}</div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Due {p.dueDate?.toDate ? format(p.dueDate.toDate(), 'PP') : 'n/a'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {p.description}
                    <div className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">{p.method} • {p.reference || 'No ref'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-gray-900">${p.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold ${p.amount - (p.amountPaid || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      ${(p.amount - (p.amountPaid || 0)).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(p.status)}`}>
                      {p.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                      {p.status === 'partial' && <TrendingUp className="w-3 h-3" />}
                      {p.status === 'pending' && <Clock className="w-3 h-3" />}
                      {p.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {p.status !== 'paid' && (
                      <Button 
                        variant="outline" 
                        className="text-xs py-1.5 h-auto ml-auto"
                        onClick={() => markAsPaid(p.id)}
                      >
                        Full Payment
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-medium italic">
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
