import React from 'react';
import { EmergencyIncident, Responder } from '../../types';
import { Badge } from '../common/Badge';
import { 
  Radio, 
  MapPin, 
  Users, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  AlertTriangle,
  ChevronRight,
  Anchor,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface ResponderProfile {
  team: string;
  vehicleType: string;
  status: string;
  location?: { lat: number; lng: number } | null;
  equipment: string[];
}

interface ResponderDashboardProps {
  emergencies: EmergencyIncident[];
  currentResponder: Responder | null;
  currentUserName: string;
  responderProfile?: ResponderProfile;
  activeMissionStatus?: 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
  canOperate: boolean;
  onClaimMission: (incidentId: string) => void;
  onUpdateMissionStatus: (missionId: string, status: 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED') => void;
}

const URGENCY_ORDER: Record<EmergencyIncident['urgency'], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export const ResponderDashboard: React.FC<ResponderDashboardProps> = ({
  emergencies,
  currentResponder,
  currentUserName,
  responderProfile,
  activeMissionStatus,
  canOperate,
  onClaimMission,
  onUpdateMissionStatus,
}) => {
  const unitStatus = currentResponder?.status ?? responderProfile?.status ?? 'AVAILABLE';
  const unitTeam = currentResponder?.team ?? responderProfile?.team ?? 'Unassigned command';
  const unitVehicle = currentResponder?.vehicleType ?? responderProfile?.vehicleType ?? '—';
  const unitPhone = currentResponder?.phone ?? '—';

  // Active mission for the signed-in responder
  const activeMission = currentResponder
    ? emergencies.find(
        (emergency) =>
          emergency.assignedResponderId === currentResponder.id &&
          (emergency.status === 'ASSIGNED' || emergency.status === 'IN_PROGRESS'),
      )
    : undefined;

  // Only VERIFIED reports can be claimed; PENDING reports await EOC verification.
  const unassignedEmergencies = emergencies
    .filter((emergency) => emergency.status === 'VERIFIED')
    .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);

  const pendingVerificationCount = emergencies.filter((e) => e.status === 'REPORTED').length;

  const missionStage =
    activeMissionStatus ??
    (activeMission?.status === 'IN_PROGRESS' ? 'ARRIVED' : 'ASSIGNED');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Unit Command Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-slate-900">{currentUserName}</h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-800">
                {unitTeam}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                unitStatus === 'AVAILABLE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-warm-100 text-warm-800'
              }`}>
                {unitStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Vehicle: <strong>{unitVehicle.replace('_', ' ')}</strong> | Contact: {unitPhone}
            </p>
          </div>
        </div>

        {!canOperate && (
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-warm-50 border border-warm-200 text-[11px] text-warm-900 max-w-sm">
            <ShieldCheck className="w-4 h-4 text-warm-700 flex-shrink-0" />
            <span>Read-only operations view. Sign in with a responder account to claim and update missions.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Mission Command or Claim Prompt */}
        <div className="lg:col-span-2 space-y-5">
          {activeMission ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-forest-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-bold text-xs uppercase tracking-wider text-forest-200">
                    Active Deployed Mission
                  </span>
                  <span className="font-mono text-xs bg-forest-800 px-2 py-0.5 rounded">
                    #{activeMission.ticketNumber}
                  </span>
                </div>
                <Badge urgency={activeMission.urgency} />
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{activeMission.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeMission.description}</p>
                </div>

                {/* Location & Contact Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Target Coordinates & Address</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-red-600" />
                      {activeMission.location.address || 'GPS coordinates only'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      GPS: {activeMission.location.lat}, {activeMission.location.lng}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Victims in Danger</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-600" />
                      {activeMission.peopleCount} People Reported
                    </span>
                    {activeMission.reporterPhone && (
                      <a href={`tel:${activeMission.reporterPhone}`} className="text-blue-600 font-semibold text-xs flex items-center gap-1 mt-1 hover:underline">
                        <Phone className="w-3 h-3" /> Call Ground Reporter ({activeMission.reporterPhone})
                      </a>
                    )}
                  </div>
                </div>

                {/* Gemini AI advisory — rendered only when the backend produced an assessment */}
                {activeMission.aiAnalysis && (
                  <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        Gemini AI Ground Triage Advisory
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                        Advisory — human verification required
                      </span>
                    </div>

                    <p className="text-emerald-900 text-[11px] leading-relaxed">
                      {activeMission.aiAnalysis.summary}
                    </p>

                    <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap gap-2 text-[10px]">
                      <span className="font-bold text-emerald-950">Hazards Detected:</span>
                      {activeMission.aiAnalysis.detectedHazards.map((h, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-medium">
                          {h}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="font-bold text-emerald-950">Required Gear:</span>
                      {activeMission.aiAnalysis.recommendedResources.map((r, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-emerald-900 font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation handoff — no fabricated route data */}
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    Navigation Handoff
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ReliefSync does not generate route geometry. Open the target coordinates in an external map service
                    for turn-by-turn guidance, then confirm arrival below.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <a
                      href={`https://www.openstreetmap.org/directions?to=${activeMission.location.lat}%2C${activeMission.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      OpenStreetMap Directions
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeMission.location.lat},${activeMission.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Google Maps Directions
                    </a>
                  </div>
                </div>

                {/* Mission Status Action Bar */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Report:</span>
                    <Badge status={activeMission.status} />
                    <span className="text-xs text-slate-500 font-medium ml-2">Mission:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 uppercase">
                      {activeMissionStatus ?? 'SYNCING'}
                    </span>
                    {activeMission.assignedAt && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        Assigned {activeMission.assignedAt}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!activeMission.missionId ? (
                      <span className="text-[11px] text-warm-700 font-semibold">
                        Mission record is still syncing — refresh in a moment.
                      </span>
                    ) : (
                      <>
                        {missionStage === 'ASSIGNED' && (
                          <button
                            onClick={() => onUpdateMissionStatus(activeMission.missionId!, 'EN_ROUTE')}
                            disabled={!canOperate}
                            className="px-4 py-2 rounded text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Start Response (En Route)
                          </button>
                        )}

                        {missionStage === 'EN_ROUTE' && (
                          <button
                            onClick={() => onUpdateMissionStatus(activeMission.missionId!, 'ARRIVED')}
                            disabled={!canOperate}
                            className="px-4 py-2 rounded text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Mark Arrived On Scene
                          </button>
                        )}

                        {missionStage === 'ARRIVED' && (
                          <button
                            onClick={() => onUpdateMissionStatus(activeMission.missionId!, 'COMPLETED')}
                            disabled={!canOperate}
                            className="px-4 py-2 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Complete Rescue Mission
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Anchor className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                {canOperate ? 'Unit is Currently Available on Standby' : 'No active mission for this operator'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {canOperate
                  ? 'No active mission claimed. Select a verified emergency from the priority queue on the right to claim and deploy.'
                  : 'Sign in with a responder account to claim verified emergencies and update mission progress.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Priority Dispatch Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-warm-600" />
              Claimable Emergency Queue ({unassignedEmergencies.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Verified only</span>
          </div>

          {pendingVerificationCount > 0 && (
            <p className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded px-3 py-2">
              {pendingVerificationCount} report{pendingVerificationCount === 1 ? '' : 's'} awaiting EOC verification
              before dispatch.
            </p>
          )}

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {unassignedEmergencies.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-white rounded border border-slate-200">
                No verified emergencies are currently waiting for a unit.
              </div>
            ) : (
              unassignedEmergencies.map((inc) => {
                const isCritical = inc.urgency === 'CRITICAL';
                return (
                  <div
                    key={inc.id}
                    className={`bg-white rounded-lg border p-3.5 shadow-sm space-y-2.5 transition-all hover:shadow-md ${
                      isCritical ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-700">#{inc.ticketNumber}</span>
                      <Badge urgency={inc.urgency} size="sm" />
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">{inc.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{inc.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>👥 {inc.peopleCount} Trapped</span>
                      <span>📍 {inc.location.address?.slice(0, 24)}...</span>
                    </div>

                    <button
                      onClick={() => onClaimMission(inc.id)}
                      disabled={!canOperate || !!activeMission}
                      className="w-full py-2 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>
                        {!canOperate
                          ? 'Responder Sign-In Required'
                          : activeMission
                            ? 'Complete Active Mission First'
                            : 'Claim & Dispatch This Unit'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
