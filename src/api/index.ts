import type {
  BroadcastAlert,
  DonationRecord,
  DonationStatus,
  EmergencyCategory,
  EmergencyIncident,
  ReliefShelter,
  Responder,
  ResourceInventory,
  UrgencyLevel,
  VolunteerTask,
} from '../types';
import { ApiError, http, safe } from './client';
import {
  adaptAlert,
  adaptAuditLog,
  adaptCamp,
  adaptDonation,
  adaptEmergency,
  adaptResource,
  adaptResponder,
  adaptTask,
  CATEGORY_TO_BACKEND,
  DONATION_STATUS_TO_BACKEND,
  getDonationToken,
  getTicketToken,
  INCIDENT_STATUS_TO_BACKEND,
  listStoredDonationTokens,
  storeDonationToken,
  storeTicketToken,
  type BackendAlert,
  type BackendAuditLog,
  type BackendCamp,
  type BackendDonation,
  type BackendEmergency,
  type BackendResponder,
  type BackendResource,
  type BackendTask,
} from './adapters';

const API = '/api/v1';

interface ListResponse<T> {
  [key: string]: unknown;
  emergencies?: T[];
  camps?: T[];
  responders?: T[];
  resources?: T[];
  tasks?: T[];
  donations?: T[];
  alerts?: T[];
  auditLogs?: T[];
  pagination?: { total: number };
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'CITIZEN' | 'RESPONDER' | 'NGO' | 'VOLUNTEER' | 'DONOR' | 'ADMIN';
  phone?: string;
  organization?: string;
  responderProfile?: {
    team: string;
    vehicleType: string;
    status: string;
    location?: { lat: number; lng: number } | null;
    equipment: string[];
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  async me(): Promise<CurrentUser | null> {
    return safe(async () => (await http.get<{ user: CurrentUser }>(`${API}/auth/me`)).user, null);
  },
  async register(input: {
    name: string;
    email: string;
    password: string;
    role: 'CITIZEN' | 'VOLUNTEER' | 'DONOR';
    phone?: string;
  }): Promise<CurrentUser> {
    const data = await http.post<{ user: CurrentUser }>(`${API}/auth/register`, input);
    return data.user;
  },
  async login(email: string, password: string): Promise<CurrentUser> {
    const data = await http.post<{ user: CurrentUser }>(`${API}/auth/login`, { email, password });
    return data.user;
  },
  async logout(): Promise<void> {
    await http.post(`${API}/auth/logout`);
  },
};

// ---------------------------------------------------------------------------
// Uploads (multipart, local dev storage behind an abstraction on the server)
// ---------------------------------------------------------------------------

export const uploadsApi = {
  async upload(file: File): Promise<{ url: string; kind: 'IMAGE' | 'AUDIO'; mimetype: string; size: number }> {
    return http.upload<{ url: string; kind: 'IMAGE' | 'AUDIO'; mimetype: string; size: number }>(
      `${API}/uploads`,
      file,
    );
  },
};

// ---------------------------------------------------------------------------
// Emergencies
// ---------------------------------------------------------------------------

export const emergencyApi = {
  async getAll(): Promise<EmergencyIncident[]> {
    const data = await http.get<ListResponse<BackendEmergency>>(`${API}/emergencies?limit=100`);
    return (data.emergencies ?? []).map(adaptEmergency);
  },

  async getByTicket(ticketId: string): Promise<EmergencyIncident | null> {
    const token = getTicketToken(ticketId);
    if (token) {
      try {
        const data = await http.get<{ emergency: BackendEmergency }>(
          `${API}/emergencies/ticket/${encodeURIComponent(ticketId)}`,
          { 'X-Tracking-Token': token },
        );
        return adaptEmergency(data.emergency);
      } catch {
        // Fall through to the public listing.
      }
    }
    const all = await emergencyApi.getAll();
    return all.find((item) => item.ticketNumber === ticketId || item.id === ticketId) ?? null;
  },

  async create(data: {
    title?: string;
    description: string;
    category: EmergencyCategory[];
    urgency?: UrgencyLevel;
    location: EmergencyIncident['location'];
    peopleCount: number;
    isAnonymous: boolean;
    reporterName?: string;
    reporterPhone?: string;
    isForOther: boolean;
    affectedPersonName?: string;
    mediaUrl?: string;
    voiceMemoUrl?: string;
    voiceMemoDuration?: number;
  }): Promise<EmergencyIncident> {
    const category = (data.category.length > 0 ? data.category : ['RESCUE' as EmergencyCategory]).map(
      (item) => CATEGORY_TO_BACKEND[item] ?? 'OTHER',
    );
    const payload = {
      title:
        data.title ||
        (data.isForOther
          ? `Urgent SOS (Reported for: ${data.affectedPersonName || 'Victim'})`
          : `Emergency SOS: ${category.join(', ')}`),
      description: data.description,
      category,
      location: {
        lat: data.location.lat,
        lng: data.location.lng,
        address: data.location.address,
        landmark: data.location.landmark,
      },
      urgency: data.urgency ?? 'HIGH',
      peopleCount: data.peopleCount || 1,
      isAnonymous: data.isAnonymous,
      isForOther: data.isForOther,
      affectedPersonName: data.affectedPersonName,
      reporterName: data.reporterName,
      reporterPhone: data.reporterPhone,
      mediaUrl: data.mediaUrl,
      voiceMemoUrl: data.voiceMemoUrl,
      voiceMemoDuration: data.voiceMemoDuration,
    };

    const response = await http.post<{ emergency: BackendEmergency; trackingToken: string }>(
      `${API}/emergencies`,
      payload,
    );
    storeTicketToken(response.emergency.ticketId, response.trackingToken);
    return adaptEmergency(response.emergency);
  },

  /** Admin-only AI triage advisory. The backend returns 503 when Gemini is not configured. */
  async analyze(id: string): Promise<void> {
    await http.post(`${API}/emergencies/${id}/analyze`);
  },

  /** Admin verification — maps FLAGGED_HOAX to the backend REJECTED verdict. */
  async updateStatus(id: string, status: EmergencyIncident['status']): Promise<void> {
    if (status === 'VERIFIED' || status === 'FLAGGED_HOAX') {
      await http.patch(`${API}/emergencies/${id}/verification`, {
        verificationStatus: status === 'VERIFIED' ? 'VERIFIED' : 'REJECTED',
      });
      return;
    }
    await http.patch(`${API}/emergencies/${id}/status`, { status: INCIDENT_STATUS_TO_BACKEND[status] });
  },
};

// ---------------------------------------------------------------------------
// Relief camps / shelters
// ---------------------------------------------------------------------------

export const shelterApi = {
  async getAll(): Promise<ReliefShelter[]> {
    const data = await http.get<ListResponse<BackendCamp>>(`${API}/camps?limit=100`);
    return (data.camps ?? []).map(adaptCamp);
  },

  async updateOccupancy(id: string, delta: number): Promise<void> {
    const data = await http.get<ListResponse<BackendCamp>>(`${API}/camps?limit=100`);
    const camp = (data.camps ?? []).find((item) => item.id === id);
    if (!camp) throw new ApiError(404, 'Shelter not found.');
    const next = Math.max(0, Math.min(camp.capacity, camp.currentOccupancy + delta));
    await http.patch(`${API}/camps/${id}/occupancy`, { currentOccupancy: next });
  },
};

// ---------------------------------------------------------------------------
// Responders & missions
// ---------------------------------------------------------------------------

export const responderApi = {
  async getAll(): Promise<Responder[]> {
    const data = await http.get<ListResponse<BackendResponder>>(`${API}/responders?limit=100`);
    return (data.responders ?? [])
      .map((item) => adaptResponder(item))
      .filter((item): item is Responder => item !== null);
  },

  /** Claims an emergency for the signed-in responder (identity comes from the session). */
  async claimMission(incidentId: string): Promise<void> {
    await http.post(`${API}/missions/${incidentId}/claim`, {});
  },

  /** Updates the signed-in responder's unit status. */
  async updateStatus(status: Responder['status']): Promise<void> {
    await http.patch(`${API}/responders/me/status`, { status });
  },
};

export interface MyMission {
  id: string;
  emergencyId: string;
  responderId: string;
  status: 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
  acceptedAt?: string;
  enRouteAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  emergency?: BackendEmergency | null;
}

export const missionApi = {
  /** Missions assigned to the signed-in responder (empty for other roles). */
  async getMine(): Promise<MyMission[]> {
    return safe(async () => {
      const data = await http.get<{ missions?: MyMission[] }>(`${API}/missions/my?limit=50`);
      return data.missions ?? [];
    }, [] as MyMission[]);
  },

  async updateStatus(missionId: string, status: string, location?: { lat: number; lng: number }): Promise<void> {
    await http.patch(`${API}/missions/${missionId}/status`, {
      status,
      ...(location ? { location } : {}),
    });
  },
};

// ---------------------------------------------------------------------------
// Resource inventory
// ---------------------------------------------------------------------------

export const inventoryApi = {
  async getAll(): Promise<ResourceInventory[]> {
    return safe(async () => {
      const data = await http.get<ListResponse<BackendResource>>(`${API}/resources?limit=100`);
      return (data.resources ?? []).map(adaptResource);
    }, [] as ResourceInventory[]);
  },

  async dispatchSupplies(inventoryId: string, quantity: number, targetName: string): Promise<void> {
    await http.post(`${API}/resources/${inventoryId}/dispatch`, {
      quantity,
      targetType: 'FIELD',
      targetName,
    });
  },
};

// ---------------------------------------------------------------------------
// Volunteer tasks
// ---------------------------------------------------------------------------

export const taskApi = {
  async getAll(): Promise<VolunteerTask[]> {
    const data = await http.get<ListResponse<BackendTask>>(`${API}/volunteer-tasks?limit=100`);
    return (data.tasks ?? []).map(adaptTask);
  },

  async claimTask(taskId: string): Promise<void> {
    await http.post(`${API}/volunteer-tasks/${taskId}/join`, {});
  },
};

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

export const donationApi = {
  /** Staff/donor ledger, with a token-gated fallback for a donor's own anonymous pledges. */
  async getAll(): Promise<DonationRecord[]> {
    try {
      const data = await http.get<ListResponse<BackendDonation>>(`${API}/donations?limit=100`);
      return (data.donations ?? []).map(adaptDonation);
    } catch (error) {
      if (!(error instanceof ApiError) || !error.isAuthError) throw error;

      const tracked = listStoredDonationTokens();
      const results = await Promise.allSettled(
        tracked.map(async ({ trackingId, token }) => {
          const data = await http.get<{ donation: BackendDonation }>(
            `${API}/donations/track/${encodeURIComponent(trackingId)}`,
            { 'X-Tracking-Token': token },
          );
          return adaptDonation(data.donation);
        }),
      );
      return results
        .filter((result): result is PromiseFulfilledResult<DonationRecord> => result.status === 'fulfilled')
        .map((result) => result.value);
    }
  },

  /** Public tracking by code when the caller holds the one-time token. */
  async track(trackingCode: string): Promise<DonationRecord | null> {
    const token = getDonationToken(trackingCode);
    if (!token) return null;
    try {
      const data = await http.get<{ donation: BackendDonation }>(
        `${API}/donations/track/${encodeURIComponent(trackingCode)}`,
        { 'X-Tracking-Token': token },
      );
      return adaptDonation(data.donation);
    } catch {
      return null;
    }
  },

  async create(data: {
    donorName?: string;
    donorEmail?: string;
    type: 'SUPPLIES' | 'MONETARY';
    amountOrQuantity: string;
    itemDescription: string;
    allocatedShelterName?: string;
  }): Promise<DonationRecord> {
    const response = await http.post<{ donation: BackendDonation; trackingToken: string }>(
      `${API}/donations`,
      {
        donorName: data.donorName,
        donorEmail: data.donorEmail,
        donationType: data.type,
        itemDescription: data.itemDescription,
        amountOrQuantity: data.amountOrQuantity,
        destination: data.allocatedShelterName,
      },
    );
    storeDonationToken(response.donation.trackingId, response.trackingToken);
    return adaptDonation(response.donation);
  },

  async scanCheckpoint(
    trackingCode: string,
    nextStatus: DonationStatus,
    location: string,
    verifierName: string,
    notes?: string,
  ): Promise<DonationRecord> {
    const donations = await safe(() => donationApi.getAll(), [] as DonationRecord[]);
    const match = donations.find(
      (item) => item.trackingCode.toLowerCase() === trackingCode.toLowerCase(),
    );
    if (!match) throw new ApiError(404, `Donation parcel with code "${trackingCode}" not found.`);
    const response = await http.post<{ donation: BackendDonation }>(
      `${API}/donations/${match.id}/events`,
      {
        status: DONATION_STATUS_TO_BACKEND[nextStatus],
        location,
        notes: notes ?? `Checkpoint verified by ${verifierName}.`,
      },
    );
    return adaptDonation(response.donation);
  },
};

// ---------------------------------------------------------------------------
// Admin (alerts, audit logs)
// ---------------------------------------------------------------------------

export const adminApi = {
  async getAlerts(): Promise<BroadcastAlert[]> {
    const data = await http.get<ListResponse<BackendAlert>>(`${API}/alerts`);
    return (data.alerts ?? []).map(adaptAlert);
  },

  async broadcastAlert(data: {
    title: string;
    message: string;
    severity: BroadcastAlert['severity'];
    affectedZones: string[];
  }): Promise<BroadcastAlert> {
    const response = await http.post<{ alert: BackendAlert }>(`${API}/alerts`, {
      title: data.title,
      message: data.message,
      severity: data.severity,
      affectedZones: data.affectedZones,
      expiresInHours: 24,
    });
    return adaptAlert(response.alert);
  },

  async getAuditLogs(): Promise<ReturnType<typeof adaptAuditLog>[]> {
    return safe(async () => {
      const data = await http.get<ListResponse<BackendAuditLog>>(`${API}/audit-logs?limit=100`);
      return (data.auditLogs ?? []).map(adaptAuditLog);
    }, []);
  },

  /** Server-side audit logging is authoritative; client-side logging is a no-op. */
  logAction(_action: string, _targetId: string, _details: string): void {},

  resetToDefaults(): void {
    localStorage.removeItem('reliefsync_active_ticket');
    localStorage.removeItem('reliefsync_ticket_tokens_v2');
    localStorage.removeItem('reliefsync_donation_tokens_v1');
    window.location.reload();
  },
};
