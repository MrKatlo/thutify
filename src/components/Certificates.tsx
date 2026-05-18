import { Card, Button } from './ui/Card';
import { Award, Download, CheckCircle, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export function Certificates() {
  const { profile } = useAuth();
  const certificates = [
    { id: 'CERT-2024-001', student: 'Alex Johnson', course: 'Advanced React Patterns', issueDate: 'May 15, 2024', status: 'Verified' },
    { id: 'CERT-2024-002', student: 'Maria Garcia', course: 'Introduction to Python', issueDate: 'May 14, 2024', status: 'Verified' },
    { id: 'CERT-2024-003', student: 'James Wilson', course: 'UI/UX Fundamentals', issueDate: 'Pending Approval', status: 'Pending' },
  ];

  if (profile?.role === 'student') {
    const studentCerts = [
      { id: 'CERT-2026-092', course: 'Coding Fundamentals', issueDate: 'May 12, 2026', status: 'Verified' }
    ];

    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">My Certificates</h1>
          <p className="text-gray-500 mt-1 font-medium">View and download your official, verified course completion credentials.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card title="Official Certificates" description="These certificates have been officially recorded on our verified database.">
              <div className="space-y-4 mt-6">
                {studentCerts.map((cert) => (
                  <div key={cert.id} className="p-6 border border-gray-100 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg hover:border-black/5 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-black text-white rounded-xl">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{cert.course}</h4>
                        <p className="text-xs text-gray-500 mt-1">Certificate ID: {cert.id} • Issued on {cert.issueDate}</p>
                        <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider w-max mt-2">
                          <CheckCircle className="w-3 h-3" /> {cert.status}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => alert(`Verified Certificate ID: ${cert.id}\nRecipient: ${profile.fullName}\nCourse: ${cert.course}\nStatus: Officially Verified`)}
                        variant="outline" 
                        className="text-xs py-2"
                      >
                        Verify details
                      </Button>
                      <Button 
                        onClick={() => {
                          const w = window.open();
                          if (w) {
                            w.document.write(`
                              <div style="font-family:sans-serif; text-align:center; padding:50px; border:20px solid black; margin:20px;">
                                <h1 style="font-size:40px; margin-bottom:10px;">CERTIFICATE OF COMPLETION</h1>
                                <p style="font-size:18px; color:#555;">This is proudly presented to</p>
                                <h2 style="font-size:32px; font-weight:bold; margin:20px 0;">${profile.fullName}</h2>
                                <p style="font-size:18px; color:#555;">for successfully completing the course</p>
                                <h3 style="font-size:24px; font-weight:bold; margin:20px 0;">${cert.course}</h3>
                                <p style="font-size:14px; color:#999; margin-top:50px;">Certificate ID: ${cert.id} • Issued on ${cert.issueDate}</p>
                                <button onclick="window.print()" style="margin-top:30px; padding:10px 20px; font-weight:bold; cursor:pointer;">Print Certificate</button>
                              </div>
                            `);
                            w.document.close();
                          }
                        }}
                        className="bg-black text-white hover:bg-gray-800 text-xs py-2 gap-2"
                      >
                        <Download className="w-4 h-4" /> Download PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card title="Verification Portal" className="bg-gradient-to-br from-gray-900 to-black text-white border-0 shadow-xl">
              <div className="space-y-4 mt-6">
                <p className="text-gray-400 text-xs leading-relaxed">Enter a unique Certificate ID below to instantly check its validity and authenticity against our verified platform.</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. CERT-2026-092" 
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                  />
                  <button className="bg-white text-black px-4 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm">Verify</button>
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs text-green-400 font-medium">
                  <Shield className="w-4 h-4" /> Secured Verification Engine
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Certificates</h1>
          <p className="text-gray-500 mt-1 font-medium">Generate, approve, and verify student course completion certificates.</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-black text-white hover:bg-gray-800">
            <Award className="w-4 h-4 mr-2" />
            Generate New
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Certificate Verification Tool" className="bg-gradient-to-br from-gray-900 to-black text-white border-0 shadow-xl">
          <div className="mt-6 space-y-4">
            <p className="text-gray-400 text-sm">Enter a certificate ID to verify its authenticity and details securely on our platform.</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. CERT-2024-001" 
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button className="bg-white text-black px-6 font-bold rounded-xl hover:bg-gray-100 transition-colors">Verify</button>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-green-400 font-medium">
              <Shield className="w-4 h-4" /> Securd via Blockchain Verification
            </div>
          </div>
        </Card>

        <Card title="Recent Certificates">
          <div className="space-y-4 mt-4">
            {certificates.map((cert, idx) => (
              <motion.div 
                key={cert.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-xl"
              >
                <div>
                  <h4 className="font-bold text-gray-900">{cert.student}</h4>
                  <p className="text-xs text-gray-500">{cert.course} • {cert.issueDate}</p>
                </div>
                <div className="flex items-center gap-2">
                  {cert.status === 'Verified' ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      <CheckCircle className="w-3 h-3" /> {cert.status}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      Pending
                    </span>
                  )}
                  <button className="p-1.5 text-gray-400 hover:text-black rounded-lg transition-colors"><Download className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-widest border-t border-gray-100 pt-4">View All Records</button>
        </Card>
      </div>
    </div>
  );
}
