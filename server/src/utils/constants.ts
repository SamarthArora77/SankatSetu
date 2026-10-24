export const ROLES = ['CITIZEN', 'RESPONDER', 'NGO', 'VOLUNTEER', 'DONOR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const PUBLIC_REGISTRATION_ROLES = ['CITIZEN', 'VOLUNTEER', 'DONOR'] as const;

export const EMERGENCY_CATEGORIES = [
  'FLOOD',
  'FIRE',
  'MEDICAL',
  'EARTHQUAKE',
  'RESCUE',
  'FOOD_WATER',
  'SHELTER',
  'POWER_COMMS',
  'OTHER',
] as const;
export type EmergencyCategory = (typeof EMERGENCY_CATEGORIES)[number];

export const URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const EMERGENCY_STATUSES = ['PENDING', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
export type EmergencyStatus = (typeof EMERGENCY_STATUSES)[number];

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const EMERGENCY_TRANSITIONS: Record<EmergencyStatus, EmergencyStatus[]> = {
  PENDING: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['ASSIGNED', 'RESOLVED'],
  ASSIGNED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [],
  REJECTED: [],
};

export const ACTIVE_EMERGENCY_STATUSES: EmergencyStatus[] = ['PENDING', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS'];

export const MISSION_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const RESOURCE_CATEGORIES = [
  'FOOD',
  'WATER',
  'MEDICINE',
  'MEDICAL_KIT',
  'BOAT',
  'SHELTER',
  'CLOTHING',
  'RESCUE_GEAR',
  'OTHER',
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export const CAMP_STATUSES = ['OPEN', 'FULL', 'CLOSED'] as const;
export const SUPPLY_STATUSES = ['ADEQUATE', 'CRITICAL_SHORTAGE', 'RESTOCK_EN_ROUTE'] as const;

export const DONATION_TYPES = ['SUPPLIES', 'MONETARY'] as const;
export type DonationType = (typeof DONATION_TYPES)[number];

export const DONATION_STATUSES = ['REGISTERED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED_AT_CAMP', 'DISTRIBUTED'] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const DONATION_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  REGISTERED: ['COLLECTED'],
  COLLECTED: ['IN_TRANSIT'],
  IN_TRANSIT: ['RECEIVED_AT_CAMP'],
  RECEIVED_AT_CAMP: ['DISTRIBUTED'],
  DISTRIBUTED: [],
};

export const VOLUNTEER_CATEGORIES = ['DISTRIBUTION', 'FIRST_AID', 'SEARCH_SUPPORT', 'CAMP_MGMT'] as const;
export const VOLUNTEER_TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type VolunteerTaskStatus = (typeof VOLUNTEER_TASK_STATUSES)[number];

export const VOLUNTEER_TASK_TRANSITIONS: Record<VolunteerTaskStatus, VolunteerTaskStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const VEHICLE_TYPES = ['AMBULANCE', 'RESCUE_BOAT', 'HIGH_AXLE_TRUCK', 'RAPID_BIKE', 'HELICOPTER'] as const;
export const RESPONDER_STATUSES = ['AVAILABLE', 'DISPATCHED', 'ON_SCENE', 'OFF_DUTY'] as const;

export const ALERT_SEVERITIES = ['WARNING', 'CRITICAL_EVACUATION', 'INFO'] as const;

export const NOTIFICATION_TYPES = ['EMERGENCY_UPDATE', 'MISSION_UPDATE', 'SYSTEM', 'ALERT', 'DONATION_UPDATE'] as const;

export const MISSION_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  ASSIGNED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const ACTIVE_MISSION_STATUSES: MissionStatus[] = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED'];
