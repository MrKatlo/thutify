import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from './ui/Card';
import { Activity, Database, Server, AlertTriangle, CheckCircle, Loader2, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import * as cfApi from '../services/cfApi';
import type { AuditLogEntry, LoginHistoryEntry } from '../services/cfApi';

interface SystemMonitoringProps {
  initialView?: string;
}

type MonitoringView = 'activity' | 'login' | 'errors' | 'database' | 'performance';

function resolveView(view?: string): MonitoringView {
  if (view === 'login') return 'login';
  if (view === 'errors') return 'errors';
  if (view === 'database') return 'database';
  if (view === 'performance') return 'performance';
  return 'activity';
}

function formatAuditMessage(entry: AuditLogEntry) {
  const labels: Record<string, string> = {
    'teacher.account.created': 'Teacher account created',
    'teacher.profile.updated': 'Teacher profile updated',
    'teacher.courses.assigned': 'Teacher courses assigned',
    'teacher.attendance.marked': 'Teacher attendance marked',
    'student.profile.updated': 'Student profile updated',
    'student.status.updated': 'Student status updated',
  };
  const action = String(entry.action || '');
  const actor = entry.actorName || entry.actor_name || 'System';
  const metadata =
    entry.metadata && typeof entry.metadata === 'object' ? (entry.metadata as Record<string, unknown>) : {};
  const detail = [metadata.email, metadata.status, metadata.attendanceDate]
    .filter(Boolean)
    .map(String)
    .join(' • ');
  return {
    level: action.includes('suspend') || action.includes('reject') ? 'warning' : 'info',
    msg: labels[action] || action.replace(/\./g, ' '),
    meta: detail ? `${actor} • ${detail}` : actor,
    time: entry.createdAt || entry.created_at || '',
  };
}

export function SystemMonitoring({ initialView }: SystemMonitoringProps) {
  const { institutionId } = useAuth();
  const [view, setView] = useState<MonitoringView>(() => resolveView(initialView));
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setView(resolveView(initialView));
  }, [initialView]);

  useEffect(() => {
    if (!institutionId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [audit, logins] = await Promise.all([
          cfApi.listAuditLog(institutionId, { limit: 50 }),
          cfApi.listLoginHistory(institutionId, { limit: 50 }),
        ]);
        if (cancelled) return;
        setAuditLog(audit);
        setLoginHistory(logins);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load monitoring data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  const auditEvents = useMemo(() => auditLog.map(formatAuditMessage), [auditLog]);
  const warningEvents = useMemo(
    () => auditEvents.filter((event) => event.level === 'warning'),
    [auditEvents],
  );
  const recentLogins = useMemo(() => loginHistory.slice(0, 20), [loginHistory]);
  const uniqueUsers = useMemo(
    () => new Set(loginHistory.map((row) => row.userId || row.user_id)).size,
    [loginHistory],
  );

  const tabs: { id: MonitoringView; label: string }[] = [
    { id: 'activity', label: 'Activity Logs' },
    { id: 'login', label: 'Login History' },
    { id: 'errors', label: 'Error Logs' },
    { id: 'database', label: 'Database' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">System Monitoring</h1>
          <p className="text-gray-500 mt-1 font-medium">
            Live audit trail and login activity from your Cloudflare D1 database.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200 font-bold text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          Worker + D1 Connected
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`pb-3 px-1 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              view === tab.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 text-red-700">
          <p className="font-semibold text-sm">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading monitoring data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Audit Events" className="flex flex-col justify-between">
              <div className="mt-4 flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg">{auditLog.length}</p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Recent actions</p>
                </div>
              </div>
            </Card>

            <Card title="Successful Logins" className="flex flex-col justify-between">
              <div className="mt-4 flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <LogIn className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg">{loginHistory.length}</p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                    {uniqueUsers} unique users
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Flagged Actions" className="flex flex-col justify-between">
              <div className="mt-4 flex items-center gap-3">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg">{warningEvents.length}</p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Suspensions / rejects</p>
                </div>
              </div>
            </Card>
          </div>

          {view === 'activity' && (
            <Card title="Activity Logs">
              <div className="space-y-3 mt-4">
                {auditEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-6 text-center">No audit events recorded yet.</p>
                ) : (
                  auditEvents.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {log.level === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-medium text-sm text-gray-900 block truncate">{log.msg}</span>
                          <span className="text-xs text-gray-500">{log.meta}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium shrink-0 ml-4">
                        {log.time ? formatDistanceToNow(new Date(log.time), { addSuffix: true }) : '—'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {view === 'login' && (
            <Card title="Login History">
              <div className="space-y-3 mt-4">
                {recentLogins.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-6 text-center">No login history recorded yet.</p>
                ) : (
                  recentLogins.map((row) => (
                    <div key={row.id} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900">
                          {row.userName || row.user_name || row.email || row.userId}
                        </p>
                        <p className="text-xs text-gray-500">
                          {row.ipAddress || row.ip_address || 'Unknown IP'}
                          {(row.userAgent || row.user_agent) ? ` • ${String(row.userAgent || row.user_agent).slice(0, 40)}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 font-medium shrink-0 ml-4">
                        {row.createdAt || row.created_at
                          ? formatDistanceToNow(new Date(row.createdAt || row.created_at || ''), { addSuffix: true })
                          : '—'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {view === 'errors' && (
            <Card title="Error & Warning Logs">
              <div className="space-y-3 mt-4">
                {warningEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-6 text-center">No warnings or errors in the audit trail.</p>
                ) : (
                  warningEvents.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <div>
                          <span className="font-medium text-sm text-red-700">{log.msg}</span>
                          <p className="text-xs text-gray-500">{log.meta}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {log.time ? formatDistanceToNow(new Date(log.time), { addSuffix: true }) : '—'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {view === 'database' && (
            <Card title="Database Monitoring">
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="w-5 h-5 text-purple-600" />
                    <p className="font-bold text-gray-900">Cloudflare D1</p>
                  </div>
                  <p className="text-sm text-gray-600">Audit log entries: <strong>{auditLog.length}</strong></p>
                  <p className="text-sm text-gray-600">Login history rows: <strong>{loginHistory.length}</strong></p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Server className="w-5 h-5 text-blue-600" />
                    <p className="font-bold text-gray-900">Storage</p>
                  </div>
                  <p className="text-sm text-gray-600">Files served via Cloudflare R2 bucket binding.</p>
                  <p className="text-sm text-gray-600 mt-1">Auth via Firebase · Email via SendGrid.</p>
                </div>
              </div>
            </Card>
          )}

          {view === 'performance' && (
            <Card title="Performance Snapshot">
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">Audit events (last fetch)</span>
                  <span className="font-black text-lg">{auditLog.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">Logins in window</span>
                  <span className="font-black text-lg">{loginHistory.length}</span>
                </div>
                <div className="h-10 flex items-end gap-1">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const height = Math.min(100, Math.round((auditLog.length / 10) * (i + 1) * 8) || 10);
                    return (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.4, delay: i * 0.04 }}
                        className="flex-1 bg-orange-200 rounded-t-sm"
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 text-right">Activity volume index (derived from audit log)</p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
