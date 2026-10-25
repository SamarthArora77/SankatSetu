import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  EmergencyIncident, 
  ReliefShelter, 
  Responder, 
  ResourceInventory, 
  VolunteerTask, 
  DonationRecord, 
  BroadcastAlert, 
  AuditLogEntry,
  DonationStatus 
} from './types';
import { 
  authApi,
  emergencyApi, 
  shelterApi, 
  responderApi, 
  missionApi,
  inventoryApi, 
  taskApi, 
  donationApi, 
  adminApi,
  type CurrentUser,
  type MyMission
} from './api';
import { ApiError } from './api/client';
import { connectRealtime } from './api/realtime';
import { Navbar, ActiveTab } from './components/common/Navbar';
import { AlertBanner } from './components/common/AlertBanner';
import { AuthModal } from './components/common/AuthModal';
import { DisasterMap } from './components/map/DisasterMap';
import { MapFilterType } from './components/map/MapFilters';
import { EmergencyDrawer } from './components/emergency/EmergencyDrawer';
import { ResponderDashboard } from './components/responder/ResponderDashboard';
import { NGODashboard } from './components/ngo/NGODashboard';
import { VolunteerDashboard } from './components/volunteer/VolunteerDashboard';
import { DonorDashboard } from './components/donor/DonorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';

const ROLE_TAB_ACCESS: Partial<Record<ActiveTab, CurrentUser['role'][]>> = {
  responder: ['RESPONDER', 'ADMIN'],
  ngo: ['NGO', 'ADMIN'],
  admin: ['ADMIN'],
};

const ROLE_TAB_LABEL: Record<Exclude<ActiveTab, 'map' | 'volunteer' | 'donor'>, string> = {
  responder: 'responder',
  ngo: 'NGO logistics',
  admin: 'administrator',
};

export const App: React.FC = () => {
  // Navigation & Modal States
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [isSOSDrawerOpen, setIsSOSDrawerOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => {
    return localStorage.getItem('reliefsync_active_ticket');
  });

  // Session State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authIntent, setAuthIntent] = useState<string | null>(null);
  const [pendingTab, setPendingTab] = useState<ActiveTab | null>(null);

  // Map Filter State
  const [mapFilter, setMapFilter] = useState<MapFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Core Data Entities
  const [emergencies, setEmergencies] = useState<EmergencyIncident[]>([]);
  const [shelters, setShelters] = useState<ReliefShelter[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [inventory, setInventory] = useState<ResourceInventory[]>([]);
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [myMissions, setMyMissions] = useState<MyMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  // Load initial data (and silent refreshes after realtime events)
  const loadData = useCallback(async (silent = false, viewer: CurrentUser | null = null) => {
    if (!silent) setIsLoading(true);
    const canViewInventory = viewer?.role === 'ADMIN' || viewer?.role === 'NGO' || viewer?.role === 'RESPONDER';
    const canViewDonations = viewer?.role === 'ADMIN' || viewer?.role === 'NGO' || viewer?.role === 'DONOR';
    const canViewAudit = viewer?.role === 'ADMIN';
    const canViewMissions = viewer?.role === 'RESPONDER';

    const requests: Array<Promise<void>> = [
      emergencyApi.getAll().then(setEmergencies),
      shelterApi.getAll().then(setShelters),
      responderApi.getAll().then(setResponders),
      taskApi.getAll().then(setTasks),
      adminApi.getAlerts().then(setAlerts),
    ];

    if (canViewInventory) requests.push(inventoryApi.getAll().then(setInventory));
    else setInventory([]);
    if (canViewDonations) requests.push(donationApi.getAll().then(setDonations));
    else setDonations([]);
    if (canViewAudit) requests.push(adminApi.getAuditLogs().then(setAuditLogs));
    else setAuditLogs([]);
    if (canViewMissions) requests.push(missionApi.getMine().then(setMyMissions));
    else setMyMissions([]);

    const results = await Promise.allSettled(requests);
    const failed = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failed) {
      const reason = failed.reason;
      setLoadError(
        reason instanceof Error
          ? `Some live modules could not be refreshed: ${reason.message}`
          : 'Some live modules could not be refreshed.',
      );
    } else {
      setLoadError(null);
    }
    setIsLoading(false);
  }, []);

  // Bootstrap session + public live data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user: CurrentUser | null = null;
      try {
        user = await authApi.me();
      } catch {
        user = null;
      }
      if (cancelled) return;
      setCurrentUser(user);
      setAuthReady(true);
      await loadData(false, user);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  // Real-time dispatch updates from Socket.IO
  useEffect(() => {
    const disconnect = connectRealtime(
      (event) => {
        if (event === 'notification:new') return;
        if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => {
          void loadData(true, currentUser);
        }, 350);
      },
      setRealtimeConnected,
    );
    return () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      disconnect();
    };
  }, [currentUser, loadData]);

  const promptAuth = (intent: string, tab?: ActiveTab) => {
    setAuthMode('login');
    setAuthIntent(intent);
    setPendingTab(tab ?? null);
    setIsAuthOpen(true);
  };

  const handleTabChange = (tab: ActiveTab) => {
    const requiredRoles = ROLE_TAB_ACCESS[tab];
    if (requiredRoles && (!currentUser || !requiredRoles.includes(currentUser.role))) {
      const label = tab === 'map' ? 'this module' : ROLE_TAB_LABEL[tab as keyof typeof ROLE_TAB_LABEL];
      promptAuth(
        `Sign in with an authorized ${label} account to open this operations module.`,
        tab,
      );
      return;
    }
    setActiveTab(tab);
  };

  const handleAuthenticated = async (user: CurrentUser) => {
    setCurrentUser(user);
    setLoadError(null);
    setActionError(null);
    setNotice(`Signed in as ${user.name} (${user.role.replace('_', ' ')}).`);
    if (pendingTab && ROLE_TAB_ACCESS[pendingTab]?.includes(user.role)) {
      setActiveTab(pendingTab);
    }
    setPendingTab(null);
    setAuthIntent(null);
    await loadData(true, user);
  };

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // The cookie may already be expired; clear the local session either way.
    }
    setCurrentUser(null);
    setPendingTab(null);
    setNotice('Signed out. Server-side session revoked.');
    if (ROLE_TAB_ACCESS[activeTab]) setActiveTab('map');
    await loadData(true, null);
  };

  const runAction = async (action: () => Promise<unknown>, successMessage?: string) => {
    setActionError(null);
    setNotice(null);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
      await loadData(true, currentUser);
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
        if (error.isAuthError) {
          promptAuth('Your session cannot perform this action. Sign in with an authorized account.', activeTab);
        }
      } else {
        setActionError(error instanceof Error ? error.message : 'The action could not be completed.');
      }
    }
  };

  // Handlers
  const handleIncidentCreated = (incident: EmergencyIncident) => {
    setEmergencies(prev => [incident, ...prev]);
    setActiveTicketId(incident.ticketNumber);
    if (currentUser?.role === 'ADMIN') {
      adminApi.getAuditLogs().then(setAuditLogs).catch(() => undefined);
    }
  };

  const handleClaimMission = (incidentId: string) => {
    if (currentUser?.role !== 'RESPONDER') {
      promptAuth('Sign in with a responder account to claim and deploy on emergency missions.', 'responder');
      return;
    }
    void runAction(
      () => responderApi.claimMission(incidentId),
      'Mission claimed. The emergency report is now assigned to your unit.',
    );
  };

  const handleUpdateMissionStatus = (missionId: string, status: 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED') => {
    void runAction(
      () => missionApi.updateStatus(missionId, status),
      `Mission status updated to ${status.replace('_', ' ')}.`,
    );
  };

  const handleDispatchSupplies = (inventoryId: string, quantity: number, targetName: string) => {
    void runAction(
      () => inventoryApi.dispatchSupplies(inventoryId, quantity, targetName),
      `Dispatched ${quantity} units to ${targetName}.`,
    );
  };

  const handleClaimTask = (taskId: string) => {
    if (currentUser?.role !== 'VOLUNTEER') {
      promptAuth('Sign in with a volunteer account to join field missions.', 'volunteer');
      return;
    }
    void runAction(() => taskApi.claimTask(taskId), 'You have joined this volunteer mission.');
  };

  const handleCreateDonation = async (data: {
    donorName: string;
    type: 'SUPPLIES' | 'MONETARY';
    amountOrQuantity: string;
    itemDescription: string;
    allocatedShelterName?: string;
  }): Promise<DonationRecord | null> => {
    setActionError(null);
    setNotice(null);
    try {
      const newDonation = await donationApi.create({
        ...data,
        donorEmail: currentUser?.email,
      });
      setDonations(prev => [newDonation, ...prev]);
      setNotice(
        `Donation ${newDonation.trackingCode} registered. Keep this tracking code and token to monitor custody.`,
      );
      if (currentUser?.role === 'ADMIN') {
        adminApi.getAuditLogs().then(setAuditLogs).catch(() => undefined);
      }
      return newDonation;
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'The donation could not be registered.',
      );
      return null;
    }
  };

  const handleScanCheckpoint = async (
    code: string,
    status: DonationStatus,
    loc: string,
    verifier: string,
  ): Promise<DonationRecord | null> => {
    if (!currentUser || !['NGO', 'ADMIN'].includes(currentUser.role)) {
      promptAuth('Sign in with an NGO or administrator account to verify donation checkpoints.', 'donor');
      return null;
    }
    setActionError(null);
    try {
      const updated = await donationApi.scanCheckpoint(code, status, loc, verifier);
      setDonations(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      setNotice(`Checkpoint recorded for ${updated.trackingCode}.`);
      if (currentUser.role === 'ADMIN') {
        adminApi.getAuditLogs().then(setAuditLogs).catch(() => undefined);
      }
      return updated;
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'The checkpoint could not be recorded.',
      );
      return null;
    }
  };

  const handleVerifyEmergency = (incidentId: string, isHoax: boolean) => {
    if (currentUser?.role !== 'ADMIN') {
      promptAuth('Sign in with an administrator account to verify emergency reports.', 'admin');
      return;
    }
    void runAction(
      () => emergencyApi.updateStatus(incidentId, isHoax ? 'FLAGGED_HOAX' : 'VERIFIED'),
      isHoax ? 'Emergency report rejected as a false report.' : 'Emergency report verified for dispatch.',
    );
  };

  const handleAnalyzeEmergency = async (incidentId: string): Promise<boolean> => {
    if (currentUser?.role !== 'ADMIN') {
      promptAuth('Sign in with an administrator account to request AI triage.', 'admin');
      return false;
    }
    setActionError(null);
    setNotice(null);
    try {
      await emergencyApi.analyze(incidentId);
      setNotice('AI advisory generated. A human dispatcher must still verify the report.');
      await loadData(true, currentUser);
      return true;
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'AI analysis could not be requested.',
      );
      return false;
    }
  };

  const handleBroadcastAlert = async (alertData: {
    title: string;
    message: string;
    severity: BroadcastAlert['severity'];
    affectedZones: string[];
  }): Promise<boolean> => {
    if (currentUser?.role !== 'ADMIN') {
      promptAuth('Sign in with an administrator account to broadcast public alerts.', 'admin');
      return false;
    }
    setActionError(null);
    setNotice(null);
    try {
      const newAlert = await adminApi.broadcastAlert(alertData);
      setAlerts(prev => [newAlert, ...prev]);
      setNotice('Public emergency alert broadcast.');
      adminApi.getAuditLogs().then(setAuditLogs).catch(() => undefined);
      return true;
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'The public alert could not be broadcast.',
      );
      return false;
    }
  };

  const handleSelectEmergencyFromMap = (incident: EmergencyIncident) => {
    setActiveTicketId(incident.ticketNumber);
    setIsSOSDrawerOpen(true);
  };

  const criticalCount = emergencies.filter(e => e.urgency === 'CRITICAL' && e.status !== 'RESOLVED' && e.status !== 'FLAGGED_HOAX').length;
  const signedInResponder = currentUser
    ? responders.find(responder => responder.id === currentUser.id) ?? null
    : null;
  const activeMissionRecord = myMissions.find(
    (mission) => mission.status === 'ASSIGNED' || mission.status === 'EN_ROUTE' || mission.status === 'ARRIVED',
  );

  if (!authReady || isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-forest-950 text-white gap-3">
        <div className="w-10 h-10 border-4 border-warm-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-sm tracking-widest uppercase font-bold text-forest-200">
          SankatSetu Core Bootstrapping...
        </span>
        <span className="text-[10px] font-mono text-forest-400 uppercase tracking-widest">
          Verifying secure session & loading live dispatch data
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9] text-[#153628] select-none">
      {/* 1. Global Critical Broadcast Ticker */}
      <AlertBanner alerts={alerts} />

      {/* 2. Top Tactical Command Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenSOS={() => setIsSOSDrawerOpen(true)}
        criticalCount={criticalCount}
        currentUser={currentUser}
        onOpenAuth={() => promptAuth('Sign in to operate responder, NGO, volunteer, donor, or admin modules.')}
        onSignOut={() => { void handleSignOut(); }}
        realtimeConnected={realtimeConnected}
      />

      {/* 3. Action / Sync Feedback Banner */}
      {(actionError || loadError) && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-start justify-between gap-3 text-xs text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{actionError || loadError}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { void loadData(true, currentUser); }}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-red-100 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={() => { setActionError(null); setLoadError(null); }}
                className="p-1 rounded hover:bg-red-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && !actionError && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-start justify-between gap-3 text-xs text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="p-1 rounded hover:bg-emerald-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Main Dynamic Content View */}
      <main className="flex-1">
        {activeTab === 'map' && (
          <DisasterMap
            emergencies={emergencies}
            shelters={shelters}
            responders={responders}
            onSelectEmergency={handleSelectEmergencyFromMap}
            onOpenSOS={() => setIsSOSDrawerOpen(true)}
            filter={mapFilter}
            onFilterChange={setMapFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {activeTab === 'responder' && (
          <ResponderDashboard
            emergencies={emergencies}
            currentResponder={signedInResponder}
            currentUserName={currentUser?.name ?? 'Responder'}
            responderProfile={currentUser?.responderProfile}
            activeMissionStatus={activeMissionRecord?.status}
            canOperate={currentUser?.role === 'RESPONDER'}
            onClaimMission={handleClaimMission}
            onUpdateMissionStatus={handleUpdateMissionStatus}
          />
        )}

        {activeTab === 'ngo' && (
          <NGODashboard
            inventory={inventory}
            shelters={shelters}
            emergencies={emergencies}
            onDispatch={handleDispatchSupplies}
          />
        )}

        {activeTab === 'volunteer' && (
          <VolunteerDashboard
            tasks={tasks}
            currentUser={currentUser}
            onClaimTask={handleClaimTask}
            onRequireAuth={() => promptAuth('Sign in with a volunteer account to join field missions.', 'volunteer')}
          />
        )}

        {activeTab === 'donor' && (
          <DonorDashboard
            donations={donations}
            shelters={shelters}
            currentUser={currentUser}
            canVerifyCheckpoint={!!currentUser && ['NGO', 'ADMIN'].includes(currentUser.role)}
            onCreateDonation={handleCreateDonation}
            onScanCheckpoint={handleScanCheckpoint}
            onRequireAuth={() => promptAuth('Sign in with an NGO or administrator account to verify donation checkpoints.', 'donor')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            emergencies={emergencies}
            alerts={alerts}
            auditLogs={auditLogs}
            onVerifyEmergency={handleVerifyEmergency}
            onAnalyzeEmergency={handleAnalyzeEmergency}
            onBroadcastAlert={handleBroadcastAlert}
          />
        )}
      </main>

      {/* 5. THE PROMINENT EMBEDDED EMERGENCY SOS DRAWER */}
      <EmergencyDrawer
        isOpen={isSOSDrawerOpen}
        onClose={() => setIsSOSDrawerOpen(false)}
        onIncidentCreated={handleIncidentCreated}
        activeTicketId={activeTicketId}
        onSelectTicket={setActiveTicketId}
      />

      {/* 6. Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => { setIsAuthOpen(false); setPendingTab(null); }}
        onAuthenticated={(user) => { void handleAuthenticated(user); }}
        initialMode={authMode}
        intent={authIntent}
      />
    </div>
  );
};

export default App;
