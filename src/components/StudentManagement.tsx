import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { UserProfile, UserRole } from '../types';
import { Card, Button } from './ui/Card';
import { Users, Search, Plus, Mail, Phone, Calendar, Trash2, Edit, ChevronRight, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export function StudentManagement() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'student'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => doc.data() as UserProfile);
      setStudents(fetched);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // In a real app we might use Firebase Auth Admin or invite links,
      // here we just create the profile.
      const studentId = crypto.randomUUID(); 
      await addDoc(collection(db, 'users'), {
        uid: studentId,
        name,
        email,
        phone,
        role: 'student',
        createdAt: serverTimestamp(),
      });
      setName('');
      setEmail('');
      setPhone('');
      setShowForm(false);
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this student profile?')) return;
    try {
      // Find the document ID (which might be the uid if we set it that way, but let's check)
      const q = query(collection(db, 'users'), where('uid', '==', uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'users', snap.docs[0].id));
        fetchStudents();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Student Management</h1>
          <p className="text-gray-500 mt-1 font-medium">Add, manage, and track individual student performance.</p>
        </div>
        <div className="flex gap-3">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               placeholder="Search students..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all w-64"
             />
           </div>
           {profile?.role !== 'student' && (
             <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
               <Plus className="w-4 h-4" />
               Add Student
             </Button>
           )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <Card title="Add New Student" description="Create a manual record for a new student.">
              <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Full Name</label>
                  <input 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Email Address</label>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Phone Number</label>
                  <input 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="md:col-span-3 flex gap-3 pt-2">
                  <Button type="submit">Create Record</Button>
                  <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse" />)
        ) : (
          filteredStudents.map((student, i) => (
            <motion.div
              key={student.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="bg-white border border-gray-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 overflow-hidden shrink-0 group-hover:border-black transition-colors">
                    {student.photoURL ? (
                      <img src={student.photoURL} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="text-gray-300 w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{student.name}</h3>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-widest">
                        <Mail className="w-3.5 h-3.5" />
                        {student.email}
                      </div>
                      {student.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-widest">
                          <Phone className="w-3.5 h-3.5" />
                          {student.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5" />
                        Joined {student.createdAt?.toDate ? format(student.createdAt.toDate(), 'PP') : 'Recently'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                   <Button variant="outline" className="p-3 text-red-500 hover:bg-red-50 hover:text-red-600 border-gray-100" onClick={() => handleDelete(student.uid)}>
                      <Trash2 className="w-4 h-4" />
                   </Button>
                   <Button variant="outline" className="p-3 border-gray-100">
                      <Edit className="w-4 h-4" />
                   </Button>
                   <Button className="flex-1 md:flex-none py-3">
                      View Profile
                      <ChevronRight className="w-4 h-4 ml-1" />
                   </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}

        {!loading && filteredStudents.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
             <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
             <p className="text-gray-500 font-medium">No students found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
