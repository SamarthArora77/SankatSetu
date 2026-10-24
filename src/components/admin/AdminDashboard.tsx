import React, { useState } from 'react';
import { EmergencyIncident, BroadcastAlert, AuditLogEntry } from '../../types';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Sparkles, Bell, Loader2 } from 'lucide-react';
import { Badge } from '../common/Badge';

interface AdminDashboardProps {
  emergencies: EmergencyIncident[];
  alerts: BroadcastAlert[];
  auditLogs: AuditLogEntry[];
  onVerifyEmergency: (incidentId: string, isHoax: boolean) => void;
  onAnalyzeEmergency: (incidentId: string) => Promise<boolean>;
  onBroadcastAlert: (alert: {
    title: string;
    message: string;
    severity: BroadcastAlert['severity'];
    affectedZones: string[];
  }) => Promise<boolean>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  emergencies,
  alerts: _alerts,
  auditLogs,
  onVerifyEmergency,
  onAnalyzeEmergency,
  onBroadcastAlert,
}) => {
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<BroadcastAlert['severity']>('CRITICAL_EVACUATION');
  const [affectedZones, setAffectedZones] = useState('');
  const [broadcastError, setBroadcastError] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const pendingVerification = emergencies.filter(incident => incident.status === 'REPORTED');

  const handleSendBroadcast = async (event: React.FormEvent) => {
    event.preventDefault();
    setBroadcastError('');
    const zones = affectedZones.split(',').map(zone => zone.trim()).filter(Boolean);
    if (!alertTitle.trim() || !alertMessage.trim()) {
      setBroadcastError('A headline and public guidance message are required.');
      return;
    }
    if (zones.length === 0) {
      setBroadcastError('List at least one affected zone.');
      return;
    }
    if (zones.length > 20) {
      setBroadcastError('List no more than 20 affected zones.');
      return;
    }

    setIsBroadcasting(true);
    const ok = await onBroadcastAlert({
      title: alertTitle.trim(),
      message: alertMessage.trim(),
      severity: alertSeverity,
      affectedZones: zones,
    });
    setIsBroadcasting(false);
    if (!ok) {
      setBroadcastError('The alert was not broadcast. Check the error banner for the server response.');
      return;
    }
    setShowBroadcastModal(false);
    setAlertTitle('');
    setAlertMessage('');
    setAffectedZones('');
  };

  const handleAnalyze = async (incidentId: string) => {
    setAnalyzingId(incidentId);
    await onAnalyzeEmergency(incidentId);
    setAnalyzingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-red-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">Emergency Operations Center (EOC) Command</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Human verification queue, public alerts, and the server-recorded audit trail
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowBroadcastModal(true)}
          className="px-4 py-2 rounded text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-sm transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span>Broadcast Public Emergency Alert</span>
        </button>
      </div>

      {showBroadcastModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div onClick={() => setShowBroadcastModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-6 z-10 space-y-4">
            <h3 className="font-bold text-base text-red-950 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Issue Regional Emergency Broadcast
            </h3>

            <form onSubmit={event => void handleSendBroadcast(event)} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alert Severity</label>
                <select
                  value={alertSeverity}
                  onChange={event => setAlertSeverity(event.target.value as BroadcastAlert['severity'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-bold"
                >
                  <option value="CRITICAL_EVACUATION">CRITICAL EVACUATION (Red Banner)</option>
                  <option value="WARNING">WARNING (Orange Banner)</option>
                  <option value="INFO">INFORMATIONAL ADVISORY</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Flood warning for low-lying sectors"
                  value={alertTitle}
                  onChange={event => setAlertTitle(event.target.value)}
                  maxLength={160}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Public Guidance Message</label>
                <textarea
                  rows={3}
                  placeholder="Clear instructions for the public regarding assembly points, water discharge, and shelters..."
                  value={alertMessage}
                  onChange={event => setAlertMessage(event.target.value)}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Affected Sectors (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Yamuna Bazaar, Kashmiri Gate"
                  value={affectedZones}
                  onChange={event => setAffectedZones(event.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-600 focus:outline-none"
                  required
                />
              </div>

              {broadcastError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{broadcastError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-3 py-2 rounded text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold flex items-center gap-1.5"
                >
                  {isBroadcasting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isBroadcasting ? 'Broadcasting...' : 'Broadcast Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-forest-700" />
              Trust Verification Queue
            </h3>
            <p className="text-xs text-slate-500">
              Reports submitted by the public wait here for a human decision. AI advisories are optional inputs, never
              automatic approvals.
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-forest-800 bg-forest-50 px-2.5 py-1 rounded border border-forest-200 whitespace-nowrap">
            {pendingVerification.length} Pending
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingVerification.length === 0 ? (
            <div className="col-span-2 p-8 text-center text-xs text-slate-500 bg-slate-50 rounded border border-slate-200">
              No incoming emergency reports are awaiting verification.
            </div>
          ) : (
            pendingVerification.map(incident => (
              <div key={incident.id} className="p-4 rounded-lg border border-slate-200 bg-[#FCFDFC] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded">
                      #{incident.ticketNumber}
                    </span>
                    <Badge urgency={incident.urgency} size="sm" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Trust score:</span>
                    <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      incident.trustScore >= 60 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {incident.trustScore}/100
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{incident.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-1">{incident.description}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Reported {incident.reportedAt} · {incident.location.address || 'Location supplied'}
                  </p>
                </div>

                <div className="p-2 rounded bg-slate-50 border border-slate-200/80 text-[10px] space-y-1 text-slate-600">
                  <p className="font-bold text-slate-700 uppercase tracking-wide">Recorded trust signals</p>
                  {incident.trustSignals && incident.trustSignals.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-0.5">
                      {incident.trustSignals.map(signal => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No corroborating signals were recorded for this report.</p>
                  )}
                </div>

                {incident.aiAnalysis ? (
                  <div className="p-2.5 rounded bg-forest-50 border border-forest-200 text-[10px] text-forest-900 space-y-1">
                    <p className="font-bold text-[11px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI advisory (human decision required)
                    </p>
                    <p>{incident.aiAnalysis.summary}</p>
                    <p>
                      Hazards: {incident.aiAnalysis.detectedHazards.length > 0 ? incident.aiAnalysis.detectedHazards.join(', ') : 'none listed'}
                    </p>
                    {incident.aiAnalysis.confidenceScore > 0 && (
                      <p className="font-mono">
                        Image authenticity confidence: {Math.round(incident.aiAnalysis.confidenceScore * 100)}%
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-[10px]">
                    <span className="text-slate-600">No AI advisory is attached to this report.</span>
                    <button
                      type="button"
                      onClick={() => void handleAnalyze(incident.id)}
                      disabled={analyzingId === incident.id}
                      className="px-2 py-1 rounded border border-forest-300 bg-white text-forest-800 font-bold hover:bg-forest-50 disabled:opacity-60 flex items-center gap-1 whitespace-nowrap"
                    >
                      {analyzingId === incident.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {analyzingId === incident.id ? 'Analyzing...' : 'Request AI advisory'}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onVerifyEmergency(incident.id, false)}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify report</span>
                  </button>

                  <button
                    onClick={() => onVerifyEmergency(incident.id, true)}
                    className="py-1.5 px-3 rounded text-xs font-bold border border-red-300 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900">Audit Trail</h3>
          <p className="text-xs text-slate-500">
            Action history written by the API for dispatch, verification, donation, and administrative events.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider font-mono">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Target ID</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-3 text-center text-slate-500 font-sans">
                    No audit entries are available for this session.
                  </td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{log.actor}</td>
                    <td className="py-2.5 px-3 text-forest-800 font-bold">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">{log.targetId}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-sans max-w-md truncate">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
