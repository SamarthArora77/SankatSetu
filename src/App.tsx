import React, { useState, useEffect } from 'react';
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
  emergencyApi, 
  shelterApi, 
  responderApi, 
  inventoryApi, 
  taskApi, 
  donationApi, 
  adminApi 
} from './api';
import { Navbar, ActiveTab } from './components/common/Navbar';
import { AlertBanner } from './components/common/AlertBanner';
import { DisasterMap } from './components/map/DisasterMap';
import { MapFilterType } from './components/map/MapFilters';
import { EmergencyDrawer } from './components/emergency/EmergencyDrawer';
import { ResponderDashboard } from './components/responder/ResponderDashboard';
import { NGODashboard } from './components/ngo/NGODashboard';
import { VolunteerDashboard } from './components/volunteer/VolunteerDashboard';
import { DonorDashboard } from './components/donor/DonorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

export const App: React.FC = () => {
  // Navigation & Modal States
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [isSOSDrawerOpen, setIsSOSDrawerOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => {
    return localStorage.getItem('reliefsync_active_ticket');
  });

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
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = async () => {
    try {
      const [em, sh, resp, inv, tsk, don, alt, logs] = await Promise.all([
        emergencyApi.getAll(),
        shelterApi.getAll(),
        responderApi.getAll(),
        inventoryApi.getAll(),
        taskApi.getAll(),
        donationApi.getAll(),
        adminApi.getAlerts(),
        adminApi.getAuditLogs()
      ]);
      setEmergencies(em);
      setShelters(sh);
      setResponders(resp);
      setInventory(inv);
      setTasks(tsk);
      setDonations(don);
      setAlerts(alt);
      setAuditLogs(logs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleIncidentCreated = (incident: EmergencyIncident) => {
    setEmergencies(prev => [incident, ...prev]);
    setActiveTicketId(incident.ticketNumber);
    // Reload logs
    adminApi.getAuditLogs().then(setAuditLogs);
  };

  const handleClaimMission = async (responderId: string, incidentId: string) => {
    await responderApi.claimMission(responderId, incidentId);
    loadData();
  };

  const handleUpdateResponderStatus = async (
    responderId: string, 
    status: Responder['status'], 
    incidentId?: string, 
    incidentStatus?: EmergencyIncident['status']
  ) => {
    await responderApi.updateStatus(responderId, status, incidentId, incidentStatus);
    loadData();
  };

  const handleDispatchSupplies = async (inventoryId: string, quantity: number, targetName: string) => {
    await inventoryApi.dispatchSupplies(inventoryId, quantity, targetName);
    loadData();
  };

  const handleClaimTask = async (taskId: string) => {
    await taskApi.claimTask(taskId);
    loadData();
  };

  const handleCreateDonation = async (data: any) => {
    const newDonation = await donationApi.create(data);
    setDonations(prev => [newDonation, ...prev]);
    adminApi.getAuditLogs().then(setAuditLogs);
  };

  const handleScanCheckpoint = async (code: string, status: DonationStatus, loc: string, verifier: string) => {
    const updated = await donationApi.scanCheckpoint(code, status, loc, verifier);
    setDonations(prev => prev.map(d => d.id === updated.id ? updated : d));
    adminApi.getAuditLogs().then(setAuditLogs);
  };

  const handleVerifyEmergency = async (incidentId: string, isHoax: boolean) => {
    await emergencyApi.updateStatus(incidentId, isHoax ? 'FLAGGED_HOAX' : 'VERIFIED');
    loadData();
  };

  const handleBroadcastAlert = async (alertData: any) => {
    const newAlert = await adminApi.broadcastAlert(alertData);
    setAlerts(prev => [newAlert, ...prev]);
    adminApi.getAuditLogs().then(setAuditLogs);
  };

  const handleSelectEmergencyFromMap = (incident: EmergencyIncident) => {
    setActiveTicketId(incident.ticketNumber);
    setIsSOSDrawerOpen(true);
  };

  const criticalCount = emergencies.filter(e => e.urgency === 'CRITICAL' && e.status !== 'RESOLVED').length;

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-forest-950 text-white gap-3">
        <div className="w-10 h-10 border-4 border-warm-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-sm tracking-widest uppercase font-bold text-forest-200">
          ReliefSync Core Bootstrapping...
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
        onTabChange={setActiveTab}
        onOpenSOS={() => setIsSOSDrawerOpen(true)}
        criticalCount={criticalCount}
        onResetData={adminApi.resetToDefaults}
      />

      {/* 3. Main Dynamic Content View */}
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
            responders={responders}
            onClaimMission={handleClaimMission}
            onUpdateStatus={handleUpdateResponderStatus}
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
            onClaimTask={handleClaimTask}
          />
        )}

        {activeTab === 'donor' && (
          <DonorDashboard
            donations={donations}
            onCreateDonation={handleCreateDonation}
            onScanCheckpoint={handleScanCheckpoint}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            emergencies={emergencies}
            alerts={alerts}
            auditLogs={auditLogs}
            onVerifyEmergency={handleVerifyEmergency}
            onBroadcastAlert={handleBroadcastAlert}
          />
        )}
      </main>

      {/* 4. THE PROMINENT EMBEDDED EMERGENCY SOS DRAWER */}
      <EmergencyDrawer
        isOpen={isSOSDrawerOpen}
        onClose={() => setIsSOSDrawerOpen(false)}
        onIncidentCreated={handleIncidentCreated}
        activeTicketId={activeTicketId}
        onSelectTicket={setActiveTicketId}
      />
    </div>
  );
};

export default App;
