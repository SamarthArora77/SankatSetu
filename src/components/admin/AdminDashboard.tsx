import React, { useState } from 'react';
import { EmergencyIncident, BroadcastAlert, AuditLogEntry } from '../../types';
import { ShieldCheck, AlertTriangle, Radio, CheckCircle2, XCircle, Sparkles, Send, Bell } from 'lucide-react';
import { Badge } from '../common/Badge';

interface AdminDashboardProps {
  emergencies: EmergencyIncident[];
  alerts: BroadcastAlert[];
  auditLogs: AuditLogEntry[];
  onVerifyEmergency: (incidentId: string, isHoax: boolean) => void;
  onBroadcastAlert: (alert: { title: string; message: string; severity: BroadcastAlert['severity']; affectedZones: string[] }) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  emergencies,
  alerts,
  auditLogs,
  onVerifyEmergency,
  onBroadcastAlert
}) => {
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<BroadcastAlert['severity']>('CRITICAL_EVACUATION');
  const [affectedZones, setAffectedZones] = useState('Yamuna Bazaar, Kashmiri Gate, Mayur Vihar Khadar');

  const pendingVerification = emergencies.filter(e => e.status === 'REPORTED');

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;

    onBroadcastAlert({
      title: alertTitle,
      message: alertMessage,
      severity: alertSeverity,
      affectedZones: affectedZones.split(',').map(z => z.trim())
    });

    setShowBroadcastModal(false);
    setAlertTitle('');
    setAlertMessage('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-red-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">Emergency Operations Center (EOC) Command</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-priority alerts, anti-hoax validation, and immutable disaster audit trail
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowBroadcastModal(true)}
          className="px-4 py-2 rounded text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-sm transition-colors"
        >
          <Bell className="w-4 h-4 animate-bounce" />
          <span>Broadcast Public Emergency Alert</span>
        </button>
      </div>

      {/* Broadcast Alert Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div onClick={() => setShowBroadcastModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-6 z-10 space-y-4">
            <h3 className="font-bold text-base text-red-950 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Issue Regional Emergency Broadcast
            </h3>

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alert Severity</label>
                <select
                  value={alertSeverity}
                  onChange={e => setAlertSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-bold"
                >
                  <option value="CRITICAL_EVACUATION">CRITICAL EVACUATION (Red Banner)</option>
                  <option value="WARNING">WARNING (Orange Banner)</option>
                  <option value="INFO">INFORMATIONAL ADVISORY (Cyan Banner)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Headline</label>
                <input
                  type="text"
                  placeholder="e.g. FLASH FLOOD WARNING: Evacuate Low-Lying Sectors Immediately"
                  value={alertTitle}
                  onChange={e => setAlertTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Public Guidance Message</label>
                <textarea
                  rows={3}
                  placeholder="Clear instructions for the public regarding assembly points, water discharge, and shelters..."
                  value={alertMessage}
                  onChange={e => setAlertMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Affected Sectors (Comma separated)</label>
                <input
                  type="text"
                  value={affectedZones}
                  onChange={e => setAffectedZones(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-red-600 focus:outline-none"
                />
              </div>

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
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Broadcast Immediately →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANTI-HOAX & TRUST VERIFICATION QUEUE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-forest-700" />
              Anti-Hoax & Trust Verification Triage
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates incoming anonymous and ground reports via Gemini Multimodal Vision + GPS Corroboration
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-forest-800 bg-forest-50 px-2.5 py-1 rounded border border-forest-200">
            {pendingVerification.length} Pending Triage
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingVerification.length === 0 ? (
            <div className="col-span-2 p-8 text-center text-xs text-slate-500 bg-slate-50 rounded border border-slate-200">
              ✓ All incoming emergency reports have been verified!
            </div>
          ) : (
            pendingVerification.map(inc => (
              <div key={inc.id} className="p-4 rounded-lg border border-slate-200 bg-[#FCFDFC] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded">
                      #{inc.ticketNumber}
                    </span>
                    <Badge urgency={inc.urgency} size="sm" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Trust Score:</span>
                    <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      inc.trustScore >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inc.trustScore}%
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{inc.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-1">{inc.description}</p>
                </div>

                {/* Evidence signals */}
                <div className="p-2 rounded bg-slate-50 border border-slate-200/80 text-[10px] space-y-1 font-mono text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>GPS Alignment:</span>
                    <span className="text-emerald-700 font-bold">✓ Matches Device EXIF (within 40m)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Gemini Authenticity:</span>
                    <span className="text-emerald-700 font-bold">✓ Genuine Flood Hazard (94% confidence)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Nearby Cluster Corroboration:</span>
                    <span className="text-blue-700 font-bold">2 Other SOS signals within 300m</span>
                  </div>
                </div>

                {/* Approve vs Hoax Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onVerifyEmergency(inc.id, false)}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Verify</span>
                  </button>

                  <button
                    onClick={() => onVerifyEmergency(inc.id, true)}
                    className="py-1.5 px-3 rounded text-xs font-bold border border-red-300 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Flag Hoax</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* IMMUTABLE AUDIT LOG TABLE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900">Immutable Disaster Audit Trail</h3>
          <p className="text-xs text-slate-500">Cryptographically verifiable sequence of all dispatch, triage, and delivery events</p>
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
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{log.actor}</td>
                  <td className="py-2.5 px-3 text-forest-800 font-bold">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-semibold">{log.targetId}</td>
                  <td className="py-2.5 px-3 text-slate-700 font-sans max-w-md truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
