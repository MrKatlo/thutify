import { motion } from 'motion/react';
import { Card } from '../ui/Card';
import { Award, CheckCircle, Download } from 'lucide-react';

interface CertificateListProps {
  certificates: any[];
  onDownload?: (cert: any) => void;
  onVerify?: (cert: any) => void;
}

export function CertificateList({ certificates, onDownload, onVerify }: CertificateListProps) {
  return (
    <Card title="Official Certificates" description="These certificates have been officially recorded on our verified database.">
      <div className="space-y-4 mt-6">
        {certificates.length === 0 ? (
          <p className="text-gray-400 text-center py-8 italic">No certificates issued yet.</p>
        ) : (
          certificates.map((cert, idx) => (
            <div key={cert.id} className="p-6 border border-gray-100 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg hover:border-black/5 transition-all">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-black text-white rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{cert.course || cert.course_name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Certificate ID: {cert.id || cert.certificate_id} • Issued on {cert.issueDate || cert.issued_date}</p>
                  <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider w-max mt-2">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {onVerify && (
                  <button 
                    onClick={() => onVerify(cert)}
                    className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Verify details
                  </button>
                )}
                {onDownload && (
                  <button 
                    onClick={() => onDownload(cert)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-black rounded-xl hover:bg-gray-800"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
