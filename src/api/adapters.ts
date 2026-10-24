import type {
  AuditLogEntry,
  BroadcastAlert,
  DonationRecord,
  DonationStatus,
  EmergencyCategory,
  EmergencyIncident,
  IncidentStatus,
  ReliefShelter,
  Responder,
  ResourceInventory,
  TrackingMilestone,
  VolunteerTask,
} from '../types';

// ---------------------------------------------------------------------------
// Backend <-> frontend enum mappings
// ---------------------------------------------------------------------------

const INCIDENT_STATUS_FROM_BACKEND: Record<string, IncidentStatus> = {
  PENDING: 'REPORTED',
  VERIFIED: 'VERIFIED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  REJECTED: 'FLAGGED_HOAX',
};

export const INCIDENT_STATUS_TO_BACKEND: Record<IncidentStatus, string> = {
  REPORTED: 'PENDING',
  VERIFIED: 'VERIFIED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  FLAGGED_HOAX: 'REJECTED',
};

const DONATION_STATUS_FROM_BACKEND: Record<string, DonationStatus> = {
  REGISTERED: 'PLEDGED',
  COLLECTED: 'COLLECTED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED_AT_CAMP: 'RECEIVED_AT_CAMP',
  DISTRIBUTED: 'DISTRIBUTED',
};

export const DONATION_STATUS_TO_BACKEND: Record<DonationStatus, string> = {
  PLEDGED: 'REGISTERED',
  COLLECTED: 'COLLECTED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED_AT_CAMP: 'RECEIVED_AT_CAMP',
  DISTRIBUTED: 'DISTRIBUTED',
};

const CATEGORY_FROM_BACKEND: Record<string, EmergencyCategory> = {
  FLOOD: 'FLOOD_EVACUATION',
  FIRE: 'FIRE',
  MEDICAL: 'MEDICAL',
  EARTHQUAKE: 'EARTHQUAKE',
  RESCUE: 'RESCUE',
  FOOD_WATER: 'FOOD_WATER',
  SHELTER: 'SHELTER',
  POWER_COMMS: 'POWER_COMMS',
  OTHER: 'OTHER',
};

export const CATEGORY_TO_BACKEND: Record<EmergencyCategory, string> = {
  FLOOD_EVACUATION: 'FLOOD',
  FIRE: 'FIRE',
  MEDICAL: 'MEDICAL',
  EARTHQUAKE: 'EARTHQUAKE',
  RESCUE: 'RESCUE',
  FOOD_WATER: 'FOOD_WATER',
  SHELTER: 'SHELTER',
  POWER_COMMS: 'POWER_COMMS',
  OTHER: 'OTHER',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function timeAgo(isoValue?: string | null): string {
  if (!isoValue) return '—';
  const then = new Date(isoValue).getTime();
  if (Number.isNaN(then)) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 45) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Backend payload shapes (subset used by the UI)
// ---------------------------------------------------------------------------

export interface BackendEmergency {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  category: string[];
  location?: { lat: number; lng: number; address?: string; landmark?: string };
  urgency: EmergencyIncident['urgency'];
  status: string;
  verificationStatus?: string;
  trustScore: number;
  trustSignals?: string[];
  corroboratingReportCount?: number;
  peopleCount: number;
  isAnonymous: boolean;
  isForOther: boolean;
  affectedPersonName?: string;
  reporterName?: string;
  reporterPhone?: string;
  mediaUrl?: string;
  voiceMemoUrl?: string;
  voiceMemoDuration?: number;
  aiAssessment?: {
    category?: string;
    suggestedUrgency?: EmergencyIncident['urgency'];
    possibleHazards: string[];
    suggestedResources: string[];
    reasoningSummary: string;
    requiresHumanReview: boolean;
    imageAuthenticityConfidence?: number;
    peopleCountEstimate?: number;
    model: string;
    analyzedAt?: string;
  } | null;
  assignedResponderId?: string;
  assignedResponderName?: string;
  assignedAt?: string;
  missionId?: string;
  resolvedAt?: string;
  reportedAt?: string;
}

export interface BackendCamp {
  id: string;
  name: string;
  location?: { lat: number; lng: number };
  address?: string;
  capacity: number;
  currentOccupancy: number;
  status: string;
  contactPerson: string;
  contactPhone?: string;
  suppliesStatus: ReliefShelter['suppliesStatus'];
  hasMedicalPost: boolean;
  hasDrinkingWater: boolean;
  hasPowerBackup: boolean;
}

export interface BackendResponder {
  id: string;
  name: string;
  team: string;
  vehicleType: Responder['vehicleType'];
  status: Responder['status'];
  phone?: string;
  location?: { lat: number; lng: number };
  activeMissionId?: string;
  equipment: string[];
}

export interface BackendResource {
  id: string;
  name: string;
  category: string;
  availableQuantity: number;
  unit: string;
  warehouseName: string;
  organizationName: string;
  location?: { lat: number; lng: number };
  criticalThreshold: number;
  lastUpdated?: string;
  status: string;
}

export interface BackendTask {
  id: string;
  title: string;
  description: string;
  category: VolunteerTask['category'];
  urgency: VolunteerTask['urgency'];
  location?: { lat: number; lng: number };
  locationName: string;
  requiredVolunteers: number;
  assignedVolunteersCount: number;
  status: string;
  timeEstimate: string;
  isJoined?: boolean;
}

export interface BackendDonationEvent {
  status: string;
  location: string;
  notes?: string;
  verifiedByName: string;
  at?: string;
}

export interface BackendDonation {
  id: string;
  trackingId: string;
  donorName: string;
  donorEmail?: string;
  donationType: 'SUPPLIES' | 'MONETARY';
  itemDescription: string;
  amountOrQuantity: string;
  quantity?: number;
  destination: string;
  allocatedCampId?: string;
  allocatedCampName?: string;
  status: string;
  currentLocation: string;
  trackingEvents: BackendDonationEvent[];
  createdAt?: string;
}

export interface BackendAlert {
  id: string;
  title: string;
  message: string;
  severity: BroadcastAlert['severity'];
  affectedZones: string[];
  issuedAt?: string;
  expiresAt?: string;
  isActive?: boolean;
}

export interface BackendAuditLog {
  id: string;
  timestamp?: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId: string;
  details: string;
  ipAddress?: string;
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

export function adaptEmergency(e: BackendEmergency): EmergencyIncident {
  return {
    id: e.id,
    ticketNumber: e.ticketId,
    title: e.title,
    description: e.description,
    urgency: e.urgency,
    category: (e.category ?? []).map((c) => CATEGORY_FROM_BACKEND[c] ?? 'OTHER'),
    status: INCIDENT_STATUS_FROM_BACKEND[e.status] ?? 'REPORTED',
    location: {
      lat: e.location?.lat ?? 0,
      lng: e.location?.lng ?? 0,
      address: e.location?.address,
      landmark: e.location?.landmark,
    },
    peopleCount: e.peopleCount,
    reportedAt: timeAgo(e.reportedAt),
    isAnonymous: e.isAnonymous,
    reporterName: e.reporterName,
    reporterPhone: e.reporterPhone,
    isForOther: e.isForOther,
    affectedPersonName: e.affectedPersonName,
    mediaUrl: e.mediaUrl,
    voiceMemoUrl: e.voiceMemoUrl,
    voiceMemoDuration: e.voiceMemoDuration,
    aiAnalysis: e.aiAssessment
      ? {
          urgencyScore: e.aiAssessment.suggestedUrgency ?? e.urgency,
          detectedHazards: e.aiAssessment.possibleHazards ?? [],
          recommendedResources: e.aiAssessment.suggestedResources ?? [],
          peopleEstimate: e.aiAssessment.peopleCountEstimate ?? e.peopleCount,
          confidenceScore: e.aiAssessment.imageAuthenticityConfidence ?? 0,
          summary: e.aiAssessment.reasoningSummary,
        }
      : undefined,
    trustScore: e.trustScore ?? 0,
    trustSignals: e.trustSignals,
    corroboratingReportCount: e.corroboratingReportCount,
    assignedResponderId: e.assignedResponderId,
    assignedResponderName: e.assignedResponderName,
    assignedAt: e.assignedAt ? timeAgo(e.assignedAt) : undefined,
    resolvedAt: e.resolvedAt ? timeAgo(e.resolvedAt) : undefined,
    missionId: e.missionId,
  };
}

export function adaptCamp(camp: BackendCamp): ReliefShelter {
  return {
    id: camp.id,
    name: camp.name,
    location: { lat: camp.location?.lat ?? 0, lng: camp.location?.lng ?? 0, address: camp.address },
    capacity: camp.capacity,
    currentOccupancy: camp.currentOccupancy,
    suppliesStatus: camp.suppliesStatus,
    contactPerson: camp.contactPerson,
    contactPhone: camp.contactPhone ?? '',
    isOpen: camp.status !== 'CLOSED',
    hasMedicalPost: camp.hasMedicalPost,
    hasDrinkingWater: camp.hasDrinkingWater,
    hasPowerBackup: camp.hasPowerBackup,
  };
}

export function adaptResponder(r: BackendResponder): Responder | null {
  if (!r || !r.location) return null;
  return {
    id: r.id,
    name: r.name,
    team: r.team,
    vehicleType: r.vehicleType,
    phone: r.phone ?? '—',
    status: r.status,
    location: { lat: r.location.lat, lng: r.location.lng },
    activeMissionId: r.activeMissionId,
    equipment: r.equipment ?? [],
  };
}

export function adaptResource(resource: BackendResource): ResourceInventory {
  return {
    id: resource.id,
    warehouseName: resource.warehouseName,
    location: { lat: resource.location?.lat ?? 0, lng: resource.location?.lng ?? 0 },
    category: resource.category,
    itemName: resource.name,
    availableQuantity: resource.availableQuantity,
    unit: resource.unit,
    criticalThreshold: resource.criticalThreshold,
    lastUpdated: timeAgo(resource.lastUpdated),
  };
}

export function adaptTask(task: BackendTask): VolunteerTask {
  const status = task.status === 'CANCELLED' ? 'CANCELLED' : (task.status as VolunteerTask['status']);
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    urgency: task.urgency,
    locationName: task.locationName,
    coordinates: { lat: task.location?.lat ?? 0, lng: task.location?.lng ?? 0 },
    requiredVolunteers: task.requiredVolunteers,
    assignedVolunteersCount: task.assignedVolunteersCount,
    timeEstimate: task.timeEstimate,
    status,
    isJoined: task.isJoined,
  };
}

export function adaptDonation(donation: BackendDonation): DonationRecord {
  const milestones: TrackingMilestone[] = (donation.trackingEvents ?? []).map((event) => ({
    checkpoint: DONATION_STATUS_FROM_BACKEND[event.status] ?? 'PLEDGED',
    location: event.location,
    timestamp: timeAgo(event.at),
    verifiedBy: event.verifiedByName,
    notes: event.notes,
  }));
  return {
    id: donation.id,
    trackingCode: donation.trackingId,
    donorName: donation.donorName,
    donorEmail: donation.donorEmail,
    type: donation.donationType,
    amountOrQuantity: donation.amountOrQuantity,
    itemDescription: donation.itemDescription,
    qrPayload: `${window.location.origin}/?track=${donation.trackingId}`,
    status: DONATION_STATUS_FROM_BACKEND[donation.status] ?? 'PLEDGED',
    currentLocation: donation.currentLocation,
    allocatedShelterId: donation.allocatedCampId,
    allocatedShelterName: donation.allocatedCampName ?? donation.destination,
    milestones,
    createdAt: timeAgo(donation.createdAt),
  };
}

export function adaptAlert(alert: BackendAlert): BroadcastAlert {
  return {
    id: alert.id,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    issuedAt: timeAgo(alert.issuedAt),
    affectedZones: alert.affectedZones ?? [],
    expiresAt: alert.expiresAt ? new Date(alert.expiresAt).toLocaleString() : '—',
  };
}

export function adaptAuditLog(log: BackendAuditLog): AuditLogEntry {
  return {
    id: log.id,
    timestamp: timeAgo(log.timestamp),
    actor: log.actorName ?? 'System',
    action: log.action,
    targetId: log.targetId,
    details: log.details,
    ipAddress: log.ipAddress ?? '—',
  };
}

// ---------------------------------------------------------------------------
// Tracking token storage (returned once at creation; required for anonymous access)
// ---------------------------------------------------------------------------

const TICKET_TOKEN_KEY = 'reliefsync_ticket_tokens_v2';
const DONATION_TOKEN_KEY = 'reliefsync_donation_tokens_v1';

function readTokenMap(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function storeTicketToken(ticketId: string, token: string): void {
  const map = readTokenMap(TICKET_TOKEN_KEY);
  map[ticketId] = token;
  localStorage.setItem(TICKET_TOKEN_KEY, JSON.stringify(map));
}

export function getTicketToken(ticketId: string): string | undefined {
  return readTokenMap(TICKET_TOKEN_KEY)[ticketId];
}

export function storeDonationToken(trackingId: string, token: string): void {
  const map = readTokenMap(DONATION_TOKEN_KEY);
  map[trackingId] = token;
  localStorage.setItem(DONATION_TOKEN_KEY, JSON.stringify(map));
}

export function getDonationToken(trackingId: string): string | undefined {
  return readTokenMap(DONATION_TOKEN_KEY)[trackingId];
}

export function listStoredDonationTokens(): Array<{ trackingId: string; token: string }> {
  return Object.entries(readTokenMap(DONATION_TOKEN_KEY)).map(([trackingId, token]) => ({
    trackingId,
    token,
  }));
}
