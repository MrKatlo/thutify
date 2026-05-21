import { useState } from 'react';
import { Card } from '../ui/Card';
import { Shield } from 'lucide-react';

interface CertificateVerifyProps {
  onVerify: (code: string) => void;
}

export function CertificateVerify({ onVerify }: CertificateVerifyProps) {
  const [code, setCode] = useState('');

  return (
    <Card title="Verification Portal" className="bg-gradient-to-br from-gray-900 to-black text-white border-0 shadow-xl">
      <div className="space-y-4 mt-6">
        <p className="text-gray-400 text-xs leading-relaxed">Enter a unique Certificate ID below to instantly check its validity and authenticity against our verified platform.</p>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="e.g. CERT-2026-092" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
          />
          <button 
            onClick={() => onVerify(code)}
            className="bg-white text-black px-4 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
          >
            Verify
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-green-400 font-medium">
          <Shield className="w-4 h-4" /> Secured Verification Engine
        </div>
      </div>
    </Card>
  );
}
