import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertOctagon, 
  Camera, 
  Mic, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Clock, 
  Radio, 
  Sparkles, 
  Share2, 
  Volume2, 
  ShieldCheck,
  Send,
  Loader2,
  Navigation
} from 'lucide-react';
import { EmergencyCategory, EmergencyIncident, UrgencyLevel } from '../../types';
import { emergencyApi } from '../../api';
import { Badge } from '../common/Badge';

interface EmergencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: (incident: EmergencyIncident) => void;
  activeTicketId?: string | null;
  onSelectTicket?: (ticketId: string | null) => void;
}

export const EmergencyDrawer: React.FC<EmergencyDrawerProps> = ({
  isOpen,
  onClose,
  onIncidentCreated,
  activeTicketId,
  onSelectTicket
}) => {
  const [mode, setMode] = useState<'RAPID_SOS' | 'DETAILED'>('RAPID_SOS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIncident, setActiveIncident] = useState<EmergencyIncident | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EmergencyCategory[]>(['RESCUE']);
  const [peopleCount, setPeopleCount] = useState(1);
  const [isForOther, setIsForOther] = useState(false);
  const [affectedPersonName, setAffectedPersonName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [locationName, setLocationName] = useState('Yamuna Bazaar Ghat, North Delhi');
  const [coordinates, setCoordinates] = useState({ lat: 28.6625, lng: 77.2410 });
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Audio & Photo Simulation states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedDuration, setRecordedDuration] = useState<number | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Load existing ticket if stored
  useEffect(() => {
    const savedId = activeTicketId || localStorage.getItem('reliefsync_active_ticket');
    if (savedId) {
      emergencyApi.getAll().then(all => {
        const found = all.find(i => i.ticketNumber === savedId || i.id === savedId);
        if (found) {
          setActiveIncident(found);
        }
      });
    }
  }, [activeTicketId, isOpen]);

  // Modern Web Guidance: Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleCategory = (cat: EmergencyCategory) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const detectGPS = () => {
    setGpsDetecting(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationName(`Current GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setGpsDetecting(false);
        },
        () => {
          // Fallback to flood hazard coordinate
          setCoordinates({ lat: 28.6625, lng: 77.2410 });
          setLocationName('Yamuna Floodplain, Sector 4 Khadar');
          setGpsDetecting(false);
        },
        { timeout: 5000 }
      );
    } else {
      setGpsDetecting(false);
    }
  };

  const handleSimulateRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordedDuration(0);
      const interval = setInterval(() => {
        setRecordedDuration(prev => {
          if (prev !== null && prev >= 8) {
            clearInterval(interval);
            setIsRecording(false);
            return 8;
          }
          return (prev || 0) + 1;
        });
      }, 1000);
    } else {
      setIsRecording(false);
    }
  };

  const handleSimulatePhoto = () => {
    setHasPhoto(true);
    setPhotoPreview('https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80');
  };

  const handleRapidSOS = async () => {
    setIsSubmitting(true);
    try {
      const incident = await emergencyApi.create({
        title: 'CRITICAL RAPID SOS: Immediate Extraction Required',
        description: 'Automated 1-Tap Emergency SOS beacon triggered. Immediate rescue support needed at current coordinates.',
        urgency: 'CRITICAL',
        category: ['RESCUE', 'FLOOD_EVACUATION'],
        location: {
          lat: coordinates.lat,
          lng: coordinates.lng,
          address: locationName,
          landmark: 'Direct Mobile Beacon'
        },
        peopleCount: 1,
        isAnonymous: true,
        isForOther: false
      });

      localStorage.setItem('reliefsync_active_ticket', incident.ticketNumber);
      setActiveIncident(incident);
      onIncidentCreated(incident);
      if (onSelectTicket) onSelectTicket(incident.ticketNumber);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !recordedDuration) return;

    setIsSubmitting(true);
    try {
      const isCritical = selectedCategories.includes('RESCUE') || selectedCategories.includes('MEDICAL');
      const incident = await emergencyApi.create({
        description: description || 'Voice message distress signal recorded from victim.',
        urgency: isCritical ? 'CRITICAL' : 'HIGH',
        category: selectedCategories,
        location: {
          lat: coordinates.lat,
          lng: coordinates.lng,
          address: locationName,
          landmark: 'Verified Ground Report'
        },
        peopleCount: peopleCount,
        isAnonymous: true,
        reporterPhone: reporterPhone || undefined,
        isForOther,
        affectedPersonName: isForOther ? affectedPersonName : undefined,
        mediaUrl: photoPreview || undefined,
        voiceMemoDuration: recordedDuration || undefined
      });

      localStorage.setItem('reliefsync_active_ticket', incident.ticketNumber);
      setActiveIncident(incident);
      onIncidentCreated(incident);
      if (onSelectTicket) onSelectTicket(incident.ticketNumber);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewReport = () => {
    localStorage.removeItem('reliefsync_active_ticket');
    setActiveIncident(null);
    setDescription('');
    setRecordedDuration(null);
    setHasPhoto(false);
    setPhotoPreview(null);
    if (onSelectTicket) onSelectTicket(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <div 
        className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overscroll-contain animate-in slide-in-from-right duration-200"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-forest-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white shadow-sm">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="font-bold text-base leading-tight">Emergency Assistance</h2>
              <p className="text-[11px] text-forest-300 font-medium">
                {activeIncident ? `Tracking Ticket #${activeIncident.ticketNumber}` : 'Zero-Auth Anonymous Life-Saving Mode'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-forest-800 text-forest-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeIncident ? (
            /* ACTIVE RESCUE STATUS TRACKER */
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-red-900 bg-red-100 px-2.5 py-1 rounded">
                    Ticket #{activeIncident.ticketNumber}
                  </span>
                  <Badge urgency={activeIncident.urgency} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">{activeIncident.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeIncident.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    {activeIncident.location.address}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {activeIncident.peopleCount} {activeIncident.peopleCount > 1 ? 'People' : 'Person'}
                  </span>
                </div>
              </div>

              {/* Live Rescue Lifecycle Stages */}
              <div className="p-4 rounded-lg border border-slate-200 bg-[#FBFDFB]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-4 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-warm-600 animate-pulse" />
                  Live Rescue Timeline
                </h4>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">1. Emergency Signal Logged</p>
                      <p className="text-[11px] text-slate-500">Transmitted to local disaster dispatch network.</p>
                    </div>
                  </div>

                  {/* Step 2: Gemini AI Triage */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-emerald-50/60 p-2.5 rounded border border-emerald-200/60 w-full">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                          2. Triaged by Gemini AI
                        </p>
                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Score 96%
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-900 mt-1">
                        Detected: {activeIncident.aiAnalysis?.detectedHazards.join(', ') || 'Flooding, Structural Blockage'}
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5 font-medium">
                        Allocated: {activeIncident.aiAnalysis?.recommendedResources.join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Responder Assignment */}
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      activeIncident.assignedResponderName 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-warm-500 text-white animate-pulse'
                    }`}>
                      {activeIncident.assignedResponderName ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {activeIncident.assignedResponderName 
                          ? `3. Assigned to ${activeIncident.assignedResponderName}` 
                          : '3. Matching Nearest Rescue Boat / Vehicle'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {activeIncident.assignedResponderName 
                          ? 'Rescue crew has confirmed coordinates and deployed.' 
                          : 'NDRF Boat Unit & Fire Rescue monitoring priority queue.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Live Status */}
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      activeIncident.status === 'RESOLVED' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {activeIncident.status === 'RESOLVED' ? <CheckCircle2 className="w-4 h-4" /> : <Navigation className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {activeIncident.status === 'RESOLVED' ? '4. Rescued & Safely Evacuated' : '4. En Route to Location'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {activeIncident.status === 'RESOLVED' 
                          ? 'Incident closed. Evacuees transferred to designated relief camp.' 
                          : 'Estimated arrival time: 6–8 minutes via motorized boat.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Helpful citizen instructions */}
              <div className="p-3.5 rounded bg-warm-50 border border-warm-200 text-xs text-warm-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-warm-700" />
                  What to do while waiting:
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-warm-800 text-[11px]">
                  <li>Stay on the highest stable structure (rooftop or upper floor).</li>
                  <li>Do not touch submerged electrical appliances or wiring.</li>
                  <li>Conserve phone battery; keep tracking screen open.</li>
                  <li>Wave a bright cloth or whistle if rescue boats enter your sector.</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleResetForNewReport}
                  className="flex-1 py-2.5 px-3 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Report Another Incident
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 rounded text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white transition-colors"
                >
                  Return to Live Map
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <div className="space-y-5">
              {/* No-Auth Security Guarantee Banner */}
              <div className="p-3 rounded bg-forest-50 border border-forest-200 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-forest-900">Immediate Help — No Registration Needed</p>
                  <p className="text-forest-700 text-[11px] mt-0.5 leading-relaxed">
                    In life-threatening situations, reports are dispatched instantly to local rescue teams without requiring an account or email.
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex rounded-lg p-1 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMode('RAPID_SOS')}
                  className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                    mode === 'RAPID_SOS'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🚨 1-Tap Rapid SOS
                </button>
                <button
                  type="button"
                  onClick={() => setMode('DETAILED')}
                  className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                    mode === 'DETAILED'
                      ? 'bg-forest-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Detailed Report
                </button>
              </div>

              {mode === 'RAPID_SOS' ? (
                /* RAPID 1-TAP SOS */
                <div className="space-y-4 pt-2">
                  <div className="text-center p-6 rounded-xl bg-red-50/70 border border-red-200 space-y-4">
                    <p className="text-xs font-medium text-red-800">
                      Press below if you are in immediate life-threatening danger (e.g., trapped by rising water, building collapse, or urgent medical crisis).
                    </p>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRapidSOS}
                      className="w-full py-5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-lg tracking-wider uppercase shadow-xl shadow-red-600/30 border-2 border-red-400 transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 group"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Dispatching Signal...</span>
                        </div>
                      ) : (
                        <>
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                            SEND CRITICAL SOS
                          </span>
                          <span className="text-[11px] font-normal opacity-90 lowercase tracking-normal">
                            Auto-captures GPS & triggers nearest boat/ambulance
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Location Preview */}
                  <div className="p-3 rounded border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 block truncate">{locationName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={detectGPS}
                      disabled={gpsDetecting}
                      className="text-xs text-forest-700 hover:text-forest-900 font-semibold underline flex-shrink-0 ml-2"
                    >
                      {gpsDetecting ? 'Detecting...' : 'Refresh GPS'}
                    </button>
                  </div>
                </div>
              ) : (
                /* DETAILED REPORT FORM */
                <form onSubmit={handleDetailedSubmit} className="space-y-4">
                  {/* For Self or Other */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Who needs rescue?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsForOther(false)}
                        className={`py-2 px-3 rounded text-xs font-semibold border text-center transition-colors ${
                          !isForOther
                            ? 'bg-forest-800 text-white border-forest-800'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        I need help myself
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsForOther(true)}
                        className={`py-2 px-3 rounded text-xs font-semibold border text-center transition-colors ${
                          isForOther
                            ? 'bg-forest-800 text-white border-forest-800'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Reporting for someone else
                      </button>
                    </div>
                  </div>

                  {isForOther && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Trapped Person's Name / Landmark
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar (Uncle), Top Floor of Blue House"
                        value={affectedPersonName}
                        onChange={e => setAffectedPersonName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Category Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Type of Emergency (Select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['RESCUE', 'MEDICAL', 'FLOOD_EVACUATION', 'FOOD_WATER', 'SHELTER', 'POWER_COMMS'] as EmergencyCategory[]).map(cat => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'bg-warm-600 text-white border-warm-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cat.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trapped People Count */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Estimated People in Danger
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                        className="w-8 h-8 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-base w-8 text-center">{peopleCount}</span>
                      <button
                        type="button"
                        onClick={() => setPeopleCount(peopleCount + 1)}
                        className="w-8 h-8 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-sm"
                      >
                        +
                      </button>
                      <span className="text-xs text-slate-500">(Includes children, seniors, or injured)</span>
                    </div>
                  </div>

                  {/* Situation Description */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Situation Details & Landmarks
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe what is happening: water level, building floor, any chronic patients needing medicines..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Sensory Evidence: Voice Memo & Photo */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                      Multimodal Evidence (AI Triage Boost)
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Voice Recorder */}
                      <button
                        type="button"
                        onClick={handleSimulateRecording}
                        className={`p-2.5 rounded border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          isRecording
                            ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
                            : recordedDuration !== null
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Mic className="w-4 h-4" />
                        <span>
                          {isRecording 
                            ? `Recording (${recordedDuration}s)` 
                            : recordedDuration !== null 
                            ? `Voice Memo (${recordedDuration}s)` 
                            : 'Record Voice Memo'}
                        </span>
                      </button>

                      {/* Photo Capture */}
                      <button
                        type="button"
                        onClick={handleSimulatePhoto}
                        className={`p-2.5 rounded border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          hasPhoto
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>{hasPhoto ? 'Photo Attached ✓' : 'Snap Photo'}</span>
                      </button>
                    </div>

                    {photoPreview && (
                      <div className="relative rounded overflow-hidden h-24 border border-slate-300">
                        <img src={photoPreview} alt="Flood evidence" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                          Simulated Ground Photo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Phone (Optional) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Phone Number for SMS Updates (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98XXX XXXXX"
                      value={reporterPhone}
                      onChange={e => setReporterPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting to Dispatch Queue...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Emergency SOS</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>ReliefSync Ground Triage Engine</span>
          <span className="font-mono">v1.2-live</span>
        </div>
      </div>
    </div>
  );
};
