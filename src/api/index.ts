import { 
  EmergencyIncident, 
  ReliefShelter, 
  Responder, 
  ResourceInventory, 
  VolunteerTask, 
  DonationRecord, 
  BroadcastAlert, 
  AuditLogEntry, 
  IncidentStatus,
  DonationStatus,
  UrgencyLevel
} from '../types';
import { 
  INITIAL_EMERGENCIES, 
  INITIAL_SHELTERS, 
  INITIAL_RESPONDERS, 
  INITIAL_INVENTORY, 
  INITIAL_TASKS, 
  INITIAL_DONATIONS, 
  INITIAL_ALERTS, 
  INITIAL_AUDIT_LOGS 
} from './mockData';

// Local storage keys
const KEYS = {
  EMERGENCIES: 'reliefsync_emergencies_v1',
  SHELTERS: 'reliefsync_shelters_v1',
  RESPONDERS: 'reliefsync_responders_v1',
  INVENTORY: 'reliefsync_inventory_v1',
  TASKS: 'reliefsync_tasks_v1',
  DONATIONS: 'reliefsync_donations_v1',
  ALERTS: 'reliefsync_alerts_v1',
  LOGS: 'reliefsync_logs_v1',
};

// Helpers for localStorage sync
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
}

// Simulated network delay
const delay = (ms = 250) => new Promise(res => setTimeout(res, ms));

export const emergencyApi = {
  async getAll(): Promise<EmergencyIncident[]> {
    await delay(150);
    return getStored<EmergencyIncident[]>(KEYS.EMERGENCIES, INITIAL_EMERGENCIES);
  },

  async create(data: {
    title?: string;
    description: string;
    category: EmergencyIncident['category'];
    urgency?: UrgencyLevel;
    location: EmergencyIncident['location'];
    peopleCount: number;
    isAnonymous: boolean;
    reporterName?: string;
    reporterPhone?: string;
    isForOther: boolean;
    affectedPersonName?: string;
    mediaUrl?: string;
    voiceMemoDuration?: number;
  }): Promise<EmergencyIncident> {
    await delay(400);
    const existing = getStored<EmergencyIncident[]>(KEYS.EMERGENCIES, INITIAL_EMERGENCIES);
    
    // Simulate Gemini AI evaluation
    const urgency = data.urgency || (data.category.includes('RESCUE') || data.category.includes('MEDICAL') ? 'CRITICAL' : 'HIGH');
    const ticketNumber = `RS-${Math.floor(1000 + Math.random() * 9000)}`;

    const newIncident: EmergencyIncident = {
      id: `inc-${Date.now()}`,
      ticketNumber,
      title: data.title || (data.isForOther ? `Urgent SOS (Reported for: ${data.affectedPersonName || 'Victim'})` : `Emergency SOS: ${data.category.join(', ')}`),
      description: data.description,
      urgency,
      category: data.category.length > 0 ? data.category : ['RESCUE'],
      status: 'REPORTED',
      location: data.location,
      peopleCount: data.peopleCount || 1,
      reportedAt: 'Just now',
      isAnonymous: data.isAnonymous,
      reporterName: data.reporterName,
      reporterPhone: data.reporterPhone,
      isForOther: data.isForOther,
      affectedPersonName: data.affectedPersonName,
      mediaUrl: data.mediaUrl,
      voiceMemoDuration: data.voiceMemoDuration,
      trustScore: data.isAnonymous ? 88 : 95,
      aiAnalysis: {
        urgencyScore: urgency,
        detectedHazards: ['Water rise risk', 'Access isolation'],
        recommendedResources: urgency === 'CRITICAL' ? ['Rescue Boat', 'First Aid Kit', 'Life Jackets'] : ['Dry Rations', 'Safe Shelter Transport'],
        peopleEstimate: data.peopleCount || 1,
        confidenceScore: 0.94,
        summary: `Automated Gemini triage completed. Priority flagged as ${urgency} based on real-time sensory inputs.`
      }
    };

    const updated = [newIncident, ...existing];
    setStored(KEYS.EMERGENCIES, updated);

    // Append to audit logs
    adminApi.logAction('CITIZEN_SOS_REPORT', newIncident.ticketNumber, `Reported ${newIncident.urgency} emergency at ${newIncident.location.address || 'GPS Coordinates'}`);

    return newIncident;
  },

  async updateStatus(id: string, status: IncidentStatus, responderId?: string, responderName?: string): Promise<EmergencyIncident> {
    await delay(200);
    const existing = getStored<EmergencyIncident[]>(KEYS.EMERGENCIES, INITIAL_EMERGENCIES);
    const index = existing.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Incident not found');

    const updatedIncident = {
      ...existing[index],
      status,
      ...(responderId ? { assignedResponderId: responderId } : {}),
      ...(responderName ? { assignedResponderName: responderName, assignedAt: 'Just now' } : {}),
      ...(status === 'RESOLVED' ? { resolvedAt: 'Just now' } : {})
    };

    existing[index] = updatedIncident;
    setStored(KEYS.EMERGENCIES, existing);

    adminApi.logAction('INCIDENT_STATUS_CHANGE', updatedIncident.ticketNumber, `Status updated to ${status}${responderName ? ` (Assigned to ${responderName})` : ''}`);

    return updatedIncident;
  }
};

export const shelterApi = {
  async getAll(): Promise<ReliefShelter[]> {
    await delay(150);
    return getStored<ReliefShelter[]>(KEYS.SHELTERS, INITIAL_SHELTERS);
  },

  async updateOccupancy(id: string, delta: number): Promise<ReliefShelter> {
    const list = getStored<ReliefShelter[]>(KEYS.SHELTERS, INITIAL_SHELTERS);
    const s = list.find(item => item.id === id);
    if (!s) throw new Error('Shelter not found');
    s.currentOccupancy = Math.max(0, Math.min(s.capacity, s.currentOccupancy + delta));
    setStored(KEYS.SHELTERS, list);
    return s;
  }
};

export const responderApi = {
  async getAll(): Promise<Responder[]> {
    await delay(150);
    return getStored<Responder[]>(KEYS.RESPONDERS, INITIAL_RESPONDERS);
  },

  async claimMission(responderId: string, incidentId: string): Promise<void> {
    await delay(300);
    const responders = getStored<Responder[]>(KEYS.RESPONDERS, INITIAL_RESPONDERS);
    const targetResponder = responders.find(r => r.id === responderId);
    if (!targetResponder) throw new Error('Responder not found');

    targetResponder.status = 'DISPATCHED';
    targetResponder.activeMissionId = incidentId;
    setStored(KEYS.RESPONDERS, responders);

    await emergencyApi.updateStatus(incidentId, 'ASSIGNED', responderId, targetResponder.name);
  },

  async updateStatus(responderId: string, status: Responder['status'], incidentId?: string, incidentStatus?: IncidentStatus): Promise<void> {
    await delay(200);
    const responders = getStored<Responder[]>(KEYS.RESPONDERS, INITIAL_RESPONDERS);
    const targetResponder = responders.find(r => r.id === responderId);
    if (!targetResponder) return;

    targetResponder.status = status;
    if (status === 'AVAILABLE') {
      targetResponder.activeMissionId = undefined;
    }
    setStored(KEYS.RESPONDERS, responders);

    if (incidentId && incidentStatus) {
      await emergencyApi.updateStatus(incidentId, incidentStatus);
    }
  }
};

export const inventoryApi = {
  async getAll(): Promise<ResourceInventory[]> {
    await delay(150);
    return getStored<ResourceInventory[]>(KEYS.INVENTORY, INITIAL_INVENTORY);
  },

  async dispatchSupplies(inventoryId: string, quantity: number, shelterName: string): Promise<void> {
    await delay(300);
    const items = getStored<ResourceInventory[]>(KEYS.INVENTORY, INITIAL_INVENTORY);
    const item = items.find(i => i.id === inventoryId);
    if (!item) throw new Error('Inventory item not found');
    if (item.availableQuantity < quantity) throw new Error('Insufficient stock');

    item.availableQuantity -= quantity;
    item.lastUpdated = 'Just now';
    setStored(KEYS.INVENTORY, items);

    adminApi.logAction('LOGISTICS_DISPATCH', item.itemName, `Dispatched ${quantity} ${item.unit} to ${shelterName}`);
  }
};

export const taskApi = {
  async getAll(): Promise<VolunteerTask[]> {
    await delay(150);
    return getStored<VolunteerTask[]>(KEYS.TASKS, INITIAL_TASKS);
  },

  async claimTask(taskId: string): Promise<VolunteerTask> {
    await delay(200);
    const tasks = getStored<VolunteerTask[]>(KEYS.TASKS, INITIAL_TASKS);
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    task.assignedVolunteersCount += 1;
    if (task.assignedVolunteersCount >= task.requiredVolunteers) {
      task.status = 'IN_PROGRESS';
    }
    setStored(KEYS.TASKS, tasks);
    return task;
  }
};

export const donationApi = {
  async getAll(): Promise<DonationRecord[]> {
    await delay(150);
    return getStored<DonationRecord[]>(KEYS.DONATIONS, INITIAL_DONATIONS);
  },

  async create(data: {
    donorName: string;
    donorEmail?: string;
    type: 'SUPPLIES' | 'MONETARY';
    amountOrQuantity: string;
    itemDescription: string;
    allocatedShelterName?: string;
  }): Promise<DonationRecord> {
    await delay(400);
    const list = getStored<DonationRecord[]>(KEYS.DONATIONS, INITIAL_DONATIONS);
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `RS-DON-${codeNum}`;

    const newRecord: DonationRecord = {
      id: `don-${Date.now()}`,
      trackingCode,
      donorName: data.donorName || 'Anonymous Humanitarian',
      donorEmail: data.donorEmail,
      type: data.type,
      amountOrQuantity: data.amountOrQuantity,
      itemDescription: data.itemDescription,
      qrPayload: `https://reliefsync.org/track/${trackingCode}?sig=${Math.random().toString(36).substring(7)}`,
      status: 'PLEDGED',
      currentLocation: 'Staging Hub / Online Pledge',
      allocatedShelterName: data.allocatedShelterName || 'Central Distribution Hub',
      createdAt: 'Just now',
      milestones: [
        {
          checkpoint: 'PLEDGED',
          location: 'Donor Portal',
          timestamp: 'Just now',
          verifiedBy: 'System Auto-Verification',
          notes: 'Pledge recorded with cryptographic QR checksum.'
        }
      ]
    };

    const updated = [newRecord, ...list];
    setStored(KEYS.DONATIONS, updated);

    adminApi.logAction('DONATION_PLEDGED', newRecord.trackingCode, `New donation of ${newRecord.amountOrQuantity} pledged by ${newRecord.donorName}`);

    return newRecord;
  },

  async scanCheckpoint(trackingCode: string, nextStatus: DonationStatus, location: string, verifierName: string, notes?: string): Promise<DonationRecord> {
    await delay(300);
    const list = getStored<DonationRecord[]>(KEYS.DONATIONS, INITIAL_DONATIONS);
    const item = list.find(d => d.trackingCode.toLowerCase() === trackingCode.toLowerCase());
    if (!item) throw new Error(`Donation parcel with code "${trackingCode}" not found.`);

    item.status = nextStatus;
    item.currentLocation = location;
    item.milestones.push({
      checkpoint: nextStatus,
      location,
      timestamp: 'Just now',
      verifiedBy: verifierName,
      notes
    });

    setStored(KEYS.DONATIONS, list);
    adminApi.logAction('QR_CHECKPOINT_VERIFIED', trackingCode, `Checkpoint updated to ${nextStatus} at ${location} by ${verifierName}`);

    return item;
  }
};

export const adminApi = {
  async getAlerts(): Promise<BroadcastAlert[]> {
    await delay(100);
    return getStored<BroadcastAlert[]>(KEYS.ALERTS, INITIAL_ALERTS);
  },

  async broadcastAlert(data: { title: string; message: string; severity: BroadcastAlert['severity']; affectedZones: string[] }): Promise<BroadcastAlert> {
    await delay(300);
    const alerts = getStored<BroadcastAlert[]>(KEYS.ALERTS, INITIAL_ALERTS);
    const newAlert: BroadcastAlert = {
      id: `alt-${Date.now()}`,
      title: data.title,
      message: data.message,
      severity: data.severity,
      issuedAt: 'Just now',
      affectedZones: data.affectedZones,
      expiresAt: '24 hours'
    };
    const updated = [newAlert, ...alerts];
    setStored(KEYS.ALERTS, updated);
    adminApi.logAction('ADMIN_ALERT_ISSUED', newAlert.id, `Broadcasted ${newAlert.severity}: ${newAlert.title}`);
    return newAlert;
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    await delay(100);
    return getStored<AuditLogEntry[]>(KEYS.LOGS, INITIAL_AUDIT_LOGS);
  },

  logAction(action: string, targetId: string, details: string): void {
    try {
      const logs = getStored<AuditLogEntry[]>(KEYS.LOGS, INITIAL_AUDIT_LOGS);
      const entry: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: 'Just now',
        actor: 'Client Dispatch Session',
        action,
        targetId,
        details,
        ipAddress: '127.0.0.1 (Local Session)'
      };
      setStored(KEYS.LOGS, [entry, ...logs.slice(0, 49)]);
    } catch (e) {
      console.warn('Logging error:', e);
    }
  },

  resetToDefaults(): void {
    localStorage.removeItem(KEYS.EMERGENCIES);
    localStorage.removeItem(KEYS.SHELTERS);
    localStorage.removeItem(KEYS.RESPONDERS);
    localStorage.removeItem(KEYS.INVENTORY);
    localStorage.removeItem(KEYS.TASKS);
    localStorage.removeItem(KEYS.DONATIONS);
    localStorage.removeItem(KEYS.ALERTS);
    localStorage.removeItem(KEYS.LOGS);
    window.location.reload();
  }
};
