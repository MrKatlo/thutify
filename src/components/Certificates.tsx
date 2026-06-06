import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ui/Toast';
import { Button } from './ui/Card';
import * as cfApi from '../services/cfApi';

import { CertificateList } from './certificates/CertificateList';
import { CertificateGenerator } from './certificates/CertificateGenerator';
import { CertificateVerify } from './certificates/CertificateVerify';

const VIEW_META: Record<string, { title: string; description: string }> = {
  generate: { title: 'Generate Certificates', description: 'Create new certificate requests for graduating students.' },
  approval: { title: 'Certificate Approval', description: 'Review and approve pending certificate requests.' },
  verification: { title: 'Certificate Verification', description: 'Verify authenticity of issued certificates.' },
};

interface CertificatesProps {
  initialView?: string;
}

export function Certificates({ initialView = 'generate' }: CertificatesProps) {
  const { profile, institutionId } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [profile, institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [fetchedCerts, fetchedCourses, fetchedMembers] = await Promise.all([
        cfApi.listCertificates(institutionId),
        cfApi.listCourses(institutionId),
        cfApi.getInstitutionMembers(institutionId, 'student'),
      ]);

      if (profile?.role === 'student') {
        setCertificates(fetchedCerts.filter((c: any) => c.student_id === profile.uid));
      } else {
        setCertificates(fetchedCerts);
      }
      setCourses(fetchedCourses);
      setStudents(fetchedMembers);
    } catch (err) {
      console.error('Fetch certificates data failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const toast = useToast();
  const viewMeta = VIEW_META[initialView] || VIEW_META.generate;

  const displayedCertificates = useMemo(() => {
    if (initialView === 'approval') {
      return certificates.filter((c) => (c.status || 'issued') === 'pending');
    }
    if (initialView === 'generate') {
      return certificates.filter((c) => (c.status || 'issued') !== 'revoked').slice(0, 10);
    }
    return certificates;
  }, [certificates, initialView]);

  const handleGenerate = async (studentId: string, courseId: string) => {
    if (!institutionId) return;
    try {
      await cfApi.generateCertificate(institutionId, studentId, courseId);
      toast.success('Certificate request submitted for approval.');
      fetchData();
    } catch (err) {
      console.error('Failed to generate certificate:', err);
      toast.error('Could not generate certificate. Please try again.');
    }
  };

  const handleVerify = async (code: string) => {
    try {
      return await cfApi.verifyCertificateCode(code);
    } catch (err) {
      console.error('Verification failed:', err);
      toast.error('Certificate not found or invalid code.');
      return { valid: false, error: 'Certificate not found' };
    }
  };

  const handleApprove = async (certId: string) => {
    try {
      await cfApi.updateCertificateStatus(certId, 'issued');
      toast.success('Certificate approved and issued.');
      fetchData();
    } catch (err) {
      console.error('Approve failed:', err);
      toast.error('Could not approve certificate.');
    }
  };

  const handleReject = async (certId: string) => {
    try {
      await cfApi.updateCertificateStatus(certId, 'revoked');
      toast.success('Certificate request rejected.');
      fetchData();
    } catch (err) {
      console.error('Reject failed:', err);
      toast.error('Could not reject certificate.');
    }
  };

  const handleDownload = (cert: any) => {
    const w = window.open();
    if (w) {
      w.document.write(`
        <div style="font-family:sans-serif; text-align:center; padding:50px; border:20px solid black; margin:20px;">
          <h1 style="font-size:40px; margin-bottom:10px;">CERTIFICATE OF COMPLETION</h1>
          <p style="font-size:18px; color:#555;">This is proudly presented to</p>
          <h2 style="font-size:32px; font-weight:bold; margin:20px 0;">${cert.student_name || 'Student'}</h2>
          <p style="font-size:18px; color:#555;">for successfully completing the course</p>
          <h3 style="font-size:24px; font-weight:bold; margin:20px 0;">${cert.course_name || 'Course'}</h3>
          <p style="font-size:14px; color:#999; margin-top:50px;">Verification Code: ${cert.verification_code || cert.id}</p>
          <button onclick="window.print()" style="margin-top:30px; padding:10px 20px; font-weight:bold; cursor:pointer;">Print Certificate</button>
        </div>
      `);
      w.document.close();
    }
  };

  if (profile?.role === 'student') {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">My Certificates</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">View and download your official course completion credentials.</p>
        </div>
        {loading ? (
          <div className="h-64 bg-gray-50 rounded-3xl animate-pulse" />
        ) : (
          <CertificateList certificates={certificates} onDownload={handleDownload} onVerify={() => {}} />
        )}
      </div>
    );
  }

  if (initialView === 'verification') {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{viewMeta.title}</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">{viewMeta.description}</p>
        </div>
        <CertificateVerify onVerify={handleVerify} fullWidth />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{viewMeta.title}</h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">{viewMeta.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="h-64 bg-gray-50 rounded-3xl animate-pulse" />
          ) : initialView === 'approval' ? (
            <div className="space-y-3">
              {displayedCertificates.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-3xl text-sm text-gray-500">No pending certificates awaiting approval.</div>
              ) : (
                displayedCertificates.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white">
                    <div>
                      <p className="font-bold text-sm">{cert.student_name}</p>
                      <p className="text-xs text-gray-500">{cert.course_name}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{cert.verification_code}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleApprove(cert.id)} className="text-xs bg-black text-white">Approve</Button>
                      <Button onClick={() => handleReject(cert.id)} variant="outline" className="text-xs">Reject</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <CertificateList
              certificates={displayedCertificates}
              onDownload={handleDownload}
              onVerify={() => {}}
            />
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {initialView === 'generate' && (
            <CertificateGenerator courses={courses} students={students} onGenerate={handleGenerate} />
          )}
          {initialView !== 'generate' && (
            <CertificateVerify onVerify={handleVerify} />
          )}
        </div>
      </div>
    </div>
  );
}
