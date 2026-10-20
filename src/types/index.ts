export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EmergencyCategory = 
  | 'RESCUE' 
  | 'MEDICAL' 
  | 'FLOOD_EVACUATION' 
  | 'FOOD_WATER' 
  | 'SHELTER' 
  | 'POWER_COMMS';

export type IncidentStatus = 
  | 'REPORTED' 
  | 'VERIFIED' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'RESOLVED' 
  | 'FLAGGED_HOAX';

export interface Coordinates {
  lat: number;
  lng: number;
  address?: string;
  landmark?: string;
}

export interface EmergencyIncident {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  urgency: UrgencyLevel;
  category: EmergencyCategory[];
  status: IncidentStatus;
  location: Coordinates;
  peopleCount: number;
  reportedAt: string;
  isAnonymous: boolean;
  reporterName?: string;
  reporterPhone?: string;
  isForOther: boolean;
  affectedPersonName?: string;
  mediaUrl?: string;
  voiceMemoDuration?: number; // in seconds
  // AI Triage Fields
  aiAnalysis?: {
    urgencyScore: UrgencyLevel;
    detectedHazards: string[];
    recommendedResources: string[];
    peopleEstimate: number;
    confidenceScore: number; // 0.0 - 1.0
    summary: string;
  };
  trustScore: number; // 0 - 100
  assignedResponderId?: string;
  assignedResponderName?: string;
  assignedAt?: string;
  resolvedAt?: string;
}

export interface ReliefShelter {
  id: string;
  name: string;
  location: Coordinates;
  capacity: number;
  currentOccupancy: number;
  suppliesStatus: 'ADEQUATE' | 'CRITICAL_SHORTAGE' | 'RESTOCK_EN_ROUTE';
  contactPerson: string;
  contactPhone: string;
  isOpen: boolean;
  hasMedicalPost: boolean;
  hasDrinkingWater: boolean;
  hasPowerBackup: boolean;
}

export interface Responder {
  id: string;
  name: string;
  team: string;
  vehicleType: 'AMBULANCE' | 'RESCUE_BOAT' | 'HIGH_AXLE_TRUCK' | 'RAPID_BIKE' | 'HELICOPTER';
  phone: string;
  status: 'AVAILABLE' | 'DISPATCHED' | 'ON_SCENE' | 'OFF_DUTY';
  location: Coordinates;
  activeMissionId?: string;
  equipment: string[];
}

export interface VolunteerTask {
  id: string;
  title: string;
  category: 'DISTRIBUTION' | 'FIRST_AID' | 'SEARCH_SUPPORT' | 'CAMP_MGMT';
  urgency: UrgencyLevel;
  locationName: string;
  coordinates: Coordinates;
  requiredVolunteers: number;
  assignedVolunteersCount: number;
  timeEstimate: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ResourceInventory {
  id: string;
  warehouseName: string;
  location: Coordinates;
  category: string;
  itemName: string;
  availableQuantity: number;
  unit: string;
  criticalThreshold: number;
  lastUpdated: string;
}

export type DonationStatus = 'PLEDGED' | 'COLLECTED' | 'IN_TRANSIT' | 'RECEIVED_AT_CAMP' | 'DISTRIBUTED';

export interface TrackingMilestone {
  checkpoint: DonationStatus;
  location: string;
  timestamp: string;
  verifiedBy: string;
  notes?: string;
}

export interface DonationRecord {
  id: string;
  trackingCode: string;
  donorName: string;
  donorEmail?: string;
  type: 'SUPPLIES' | 'MONETARY';
  amountOrQuantity: string;
  itemDescription: string;
  qrPayload: string;
  status: DonationStatus;
  currentLocation: string;
  allocatedShelterId?: string;
  allocatedShelterName?: string;
  milestones: TrackingMilestone[];
  createdAt: string;
}

export interface BroadcastAlert {
  id: string;
  title: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL_EVACUATION' | 'INFO';
  issuedAt: string;
  affectedZones: string[];
  expiresAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  targetId: string;
  details: string;
  ipAddress: string;
}
