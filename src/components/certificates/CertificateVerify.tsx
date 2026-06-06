import { useState } from 'react';
import { Card } from '../ui/Card';
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { CertificateVerificationResult } from '../../services/cfApi';

interface CertificateVerifyProps {
  onVerify: (code: string) => Promise<CertificateVerificationResult | void>;
  fullWidth?: boolean;
}

export function CertificateVerify({ onVerify, fullWidth }: CertificateVerifyProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateVerificationResult | null>(null);

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const verification = await onVerify(trimmed);
      if (verification) setResult(verification);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Verification Portal" className={`${fullWidth ? '' : 'bg-gradient-to-br from-gray-900 to-black text-white border-0 shadow-xl'}`}>
      <div className={`space-y-4 mt-6 ${fullWidth ? '' : ''}`}>
        <p className={`text-xs leading-relaxed ${fullWidth ? 'text-gray-500' : 'text-gray-400'}`}>
          Enter a unique certificate verification code to check its validity against our records.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. CERT-1730000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className={`flex-1 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
              fullWidth
                ? 'bg-gray-50 border border-gray-100 focus:ring-black'
                : 'bg-white/10 border border-white/20 text-white placeholder-white/40 focus:ring-white/30'
            }`}
          />
          <button
            onClick={handleVerify}
            disabled={loading || !code.trim()}
            className={`px-4 font-bold rounded-xl transition-colors text-sm flex items-center gap-2 ${
              fullWidth
                ? 'bg-black text-white hover:bg-gray-800 disabled:opacity-50'
                : 'bg-white text-black hover:bg-gray-100 disabled:opacity-50'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
          </button>
        </div>

        {result && (
          <div className={`rounded-2xl p-4 text-sm ${result.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="flex items-center gap-2 font-bold mb-2">
              {result.valid ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {result.valid ? 'Certificate Verified' : `Invalid — ${result.status || 'not found'}`}
            </div>
            {result.studentName && <p>Student: {result.studentName}</p>}
            {result.courseName && <p>Course: {result.courseName}</p>}
            {result.institutionName && <p>Institution: {result.institutionName}</p>}
            {result.issuedDate && <p>Issued: {new Date(result.issuedDate).toLocaleDateString()}</p>}
            {result.verificationCode && <p className="text-xs mt-2 opacity-70">Code: {result.verificationCode}</p>}
          </div>
        )}

        <div className={`flex items-center gap-2 mt-4 text-xs font-medium ${fullWidth ? 'text-gray-400' : 'text-green-400'}`}>
          <Shield className="w-4 h-4" /> Secured Verification Engine
        </div>
      </div>
    </Card>
  );
}
