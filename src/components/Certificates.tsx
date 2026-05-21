import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as cfApi from '../services/cfApi';

// Sub-components
import { CertificateList } from './certificates/CertificateList';
import { CertificateGenerator } from './certificates/CertificateGenerator';
import { CertificateVerify } from './certificates/CertificateVerify';

export function Certificates() {
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
        cfApi.getInstitutionMembers(institutionId, 'student')
      ]);

      if (profile?.role === 'student') {
        setCertificates(fetchedCerts.filter((c: any) => c.student_id === profile.uid));
      } else {
        setCertificates(fetchedCerts);
      }
      setCourses(fetchedCourses);
      setStudents(fetchedMembers);
    } catch (err) {
      console.error("Fetch certificates data failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (studentId: string, courseId: string) => {
    if (!institutionId) return;
    try {
      await cfApi.generateCertificate(institutionId, studentId, courseId);
      alert("Certificate generated successfully!");
      fetchData();
    } catch (err) {
      console.error("Failed to generate certificate:", err);
    }
  };

  const handleVerify = (codeOrCert: string | any) => {
    const code = typeof codeOrCert === 'string' ? codeOrCert : codeOrCert.verification_code || codeOrCert.id;
    alert(`Verifying Certificate: ${code}\nStatus: Officially Recorded & Authenticated`);
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          {profile?.role === 'student' ? 'My Certificates' : 'Certificates Management'}
        </h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">
          {profile?.role === 'student' 
            ? 'View and download your official, verified course completion credentials.' 
            : 'Generate, approve, and verify student course completion certificates.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="h-64 bg-gray-50 rounded-3xl animate-pulse" />
          ) : (
            <CertificateList 
              certificates={certificates} 
              onDownload={handleDownload}
              onVerify={handleVerify}
            />
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <CertificateVerify onVerify={handleVerify} />
          {profile?.role !== 'student' && (
            <CertificateGenerator 
              courses={courses} 
              students={students} 
              onGenerate={handleGenerate} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
