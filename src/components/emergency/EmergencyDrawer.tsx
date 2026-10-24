import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  ShieldCheck,
  Send,
  Loader2,
  Navigation,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { EmergencyCategory, EmergencyIncident } from '../../types';
import { emergencyApi, uploadsApi } from '../../api';
import { Badge } from '../common/Badge';

interface EmergencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: (incident: EmergencyIncident) => void;
  activeTicketId?: string | null;
  onSelectTicket?: (ticketId: string | null) => void;
}

const ACTIVE_TICKET_KEY = 'reliefsync_active_ticket';
const MAX_RECORDING_SECONDS = 60;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function audioExtension(mimeType: string): string {
  const base = mimeType.split(';')[0];
  if (base === 'audio/mp4' || base === 'audio/x-m4a') return 'm4a';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/wav' || base === 'audio/x-wav') return 'wav';
  if (base === 'audio/mpeg') return 'mp3';
  return 'webm';
}

function statusStep(incident: EmergencyIncident): { title: string; detail: string; tone: 'done' | 'active' | 'pending' | 'alert' } {
  switch (incident.status) {
    case 'VERIFIED':
      return {
        title: 'Verified — queued for responder assignment',
        detail: 'A human dispatcher verified this report. A response unit has not been published yet.',
        tone: 'active',
      };
    case 'ASSIGNED':
      return {
        title: 'Responder assigned',
        detail: incident.assignedResponderName
          ? `${incident.assignedResponderName} has accepted this mission.`
          : 'A response unit has been assigned to this ticket.',
        tone: 'active',
      };
    case 'IN_PROGRESS':
      return {
        title: 'Rescue in progress',
        detail: incident.assignedResponderName
          ? `${incident.assignedResponderName} is operating on scene.`
          : 'The assigned unit reports it is operating on scene.',
        tone: 'active',
      };
    case 'RESOLVED':
      return {
        title: 'Incident resolved',
        detail: incident.resolvedAt ? `Closed ${incident.resolvedAt}.` : 'This incident has been closed by the responders.',
        tone: 'done',
      };
    case 'FLAGGED_HOAX':
      return {
        title: 'Report could not be verified',
        detail: 'The emergency operations centre could not verify this report. If you are still in danger, contact local emergency services directly.',
        tone: 'alert',
      };
    default:
      return {
        title: 'Awaiting EOC verification',
        detail: 'Your report is in the dispatch queue. Only a human dispatcher can verify it and assign a unit.',
        tone: 'pending',
      };
  }
}

export const EmergencyDrawer: React.FC<EmergencyDrawerProps> = ({
  isOpen,
  onClose,
  onIncidentCreated,
  activeTicketId,
  onSelectTicket,
}) => {
  const [mode, setMode] = useState<'RAPID_SOS' | 'DETAILED'>('RAPID_SOS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIncident, setActiveIncident] = useState<EmergencyIncident | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [ticketError, setTicketError] = useState('');

  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EmergencyCategory[]>(['RESCUE']);
  const [peopleCount, setPeopleCount] = useState(1);
  const [isForOther, setIsForOther] = useState(false);
  const [affectedPersonName, setAffectedPersonName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'ready' | 'denied'>('idle');
  const [gpsError, setGpsError] = useState('');

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState<number | null>(null);
  const [voiceMemoUrl, setVoiceMemoUrl] = useState<string | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [isVoiceUploading, setIsVoiceUploading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const voicePreviewRef = useRef<string | null>(null);

  const clearRecordingTimers = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  };

  const releaseVoicePreview = () => {
    if (voicePreviewRef.current) {
      URL.revokeObjectURL(voicePreviewRef.current);
      voicePreviewRef.current = null;
    }
    setVoicePreviewUrl(null);
  };

  const discardRecording = () => {
    clearRecordingTimers();
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      if (recorder.state !== 'inactive') recorder.stop();
      recorderRef.current = null;
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(track => track.stop());
      voiceStreamRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
  };

  const uploadVoiceMemo = async (blob: Blob, durationSeconds: number, mimeType: string) => {
    setIsVoiceUploading(true);
    setMediaError('');
    try {
      if (blob.size === 0) throw new Error('The voice memo was empty. Try recording again.');
      const baseMime = mimeType.split(';')[0] || 'audio/webm';
      const file = new File([blob], `voice-memo-${Date.now()}.${audioExtension(baseMime)}`, {
        type: baseMime,
      });
      const uploaded = await uploadsApi.upload(file);
      if (uploaded.kind !== 'AUDIO') throw new Error('The server did not accept the voice memo as audio.');
      releaseVoicePreview();
      const preview = URL.createObjectURL(blob);
      voicePreviewRef.current = preview;
      setVoicePreviewUrl(preview);
      setVoiceMemoUrl(uploaded.url);
      setRecordedDuration(durationSeconds);
    } catch (error) {
      setMediaError(errorMessage(error, 'Voice memo upload failed.'));
    } finally {
      setIsVoiceUploading(false);
    }
  };

  const stopRecording = () => {
    clearRecordingTimers();
    const recorder = recorderRef.current;
    setIsRecording(false);
    setRecordedSeconds(0);
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(track => track.stop());
      voiceStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    setMediaError('');
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMediaError('This browser does not support audio recording. Add a written description instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        recorderRef.current = null;
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const durationSeconds = Math.min(
          MAX_RECORDING_SECONDS,
          Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000)),
        );
        void uploadVoiceMemo(blob, durationSeconds, recorder.mimeType || 'audio/webm');
      };
      recorder.start(250);
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordedSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordedSeconds(prev => Math.min(MAX_RECORDING_SECONDS, prev + 1));
      }, 1000);
      autoStopRef.current = window.setTimeout(() => stopRecording(), MAX_RECORDING_SECONDS * 1000);
    } catch (error) {
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(track => track.stop());
        voiceStreamRef.current = null;
      }
      setMediaError(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Add a written description instead.'
          : errorMessage(error, 'Could not start the microphone.'),
      );
    }
  };

  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMediaError('Choose a JPG, PNG, or WEBP image.');
      return;
    }
    setMediaError('');
    setIsPhotoUploading(true);
    try {
      const uploaded = await uploadsApi.upload(file);
      if (uploaded.kind !== 'IMAGE') throw new Error('The server did not accept the file as an image.');
      setPhotoUrl(uploaded.url);
    } catch (error) {
      setMediaError(errorMessage(error, 'Photo upload failed.'));
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const requestLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('denied');
      setGpsError('Geolocation is not available in this browser. An SOS requires a device location.');
      return Promise.resolve(null);
    }
    setGpsStatus('detecting');
    setGpsError('');
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        position => {
          const next = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCoordinates(next);
          setLocationName(`Device GPS (${next.lat.toFixed(5)}, ${next.lng.toFixed(5)})`);
          setGpsStatus('ready');
          resolve(next);
        },
        error => {
          setGpsStatus('denied');
          setGpsError(
            error.code === error.PERMISSION_DENIED
              ? 'Location permission was denied. Enable it for this site to send an SOS with a verified location.'
              : 'Could not obtain your device location. Check that location services are on and retry.',
          );
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      );
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!coordinates && gpsStatus === 'idle') {
      void requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, coordinates, gpsStatus, requestLocation]);

  useEffect(() => {
    if (isOpen) return;
    discardRecording();
    releaseVoicePreview();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const ticket = activeTicketId ?? localStorage.getItem(ACTIVE_TICKET_KEY);
    if (!ticket) {
      setActiveIncident(null);
      return;
    }

    let cancelled = false;
    const load = async (initial: boolean) => {
      try {
        const incident = await emergencyApi.getByTicket(ticket);
        if (cancelled) return;
        if (incident) {
          setActiveIncident(incident);
          setTicketError('');
        } else if (initial) {
          setTicketError('The saved ticket could not be loaded. Submit a new report if you still need help.');
        }
      } catch (error) {
        if (!cancelled) setTicketError(errorMessage(error, 'Could not refresh this ticket.'));
      }
    };
    void load(true);
    const interval = window.setInterval(() => void load(false), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeTicketId, isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => () => {
    discardRecording();
    releaseVoicePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategory = (category: EmergencyCategory) => {
    if (selectedCategories.includes(category)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(item => item !== category));
      }
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const formBusy = isSubmitting || isRecording || isPhotoUploading || isVoiceUploading;

  const handleRapidSOS = async () => {
    setSubmitError('');
    if (formBusy) return;
    const coords = coordinates ?? (await requestLocation());
    if (!coords) {
      setSubmitError('A device location is required to dispatch a rescue unit. Enable location access and retry.');
      return;
    }

    setIsSubmitting(true);
    try {
      const incident = await emergencyApi.create({
        title: 'Rapid SOS — immediate assistance requested',
        description: 'One-tap SOS beacon sent from the ReliefSync web app. The reporter has not added further detail.',
        urgency: 'CRITICAL',
        category: ['RESCUE'],
        location: {
          lat: coords.lat,
          lng: coords.lng,
          address: locationName,
          landmark: 'One-tap SOS beacon',
        },
        peopleCount: 1,
        isAnonymous: true,
        isForOther: false,
      });

      localStorage.setItem(ACTIVE_TICKET_KEY, incident.ticketNumber);
      setActiveIncident(incident);
      onIncidentCreated(incident);
      if (onSelectTicket) onSelectTicket(incident.ticketNumber);
    } catch (error) {
      setSubmitError(errorMessage(error, 'The SOS could not be submitted. Try again or call local emergency services.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    if (isRecording) {
      setSubmitError('Stop the voice memo before submitting.');
      return;
    }
    if (isPhotoUploading || isVoiceUploading) {
      setSubmitError('Wait for the evidence upload to finish.');
      return;
    }
    if (!description.trim() && !voiceMemoUrl && !photoUrl) {
      setSubmitError('Add a written description, a voice memo, or a photo so responders know what is happening.');
      return;
    }

    const coords = coordinates ?? (await requestLocation());
    if (!coords) {
      setSubmitError('A device location is required to submit an emergency report. Enable location access and retry.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fallbackDescription = voiceMemoUrl
        ? 'Voice memo distress signal recorded by the reporter.'
        : 'Photo evidence submitted by the reporter.';
      const isCritical = selectedCategories.includes('RESCUE') || selectedCategories.includes('MEDICAL');
      const incident = await emergencyApi.create({
        description: description.trim() || fallbackDescription,
        urgency: isCritical ? 'CRITICAL' : 'HIGH',
        category: selectedCategories,
        location: {
          lat: coords.lat,
          lng: coords.lng,
          address: locationName,
          landmark: 'Reporter-supplied location',
        },
        peopleCount,
        isAnonymous: true,
        reporterPhone: reporterPhone.trim() || undefined,
        isForOther,
        affectedPersonName: isForOther ? affectedPersonName.trim() || undefined : undefined,
        mediaUrl: photoUrl ?? undefined,
        voiceMemoUrl: voiceMemoUrl ?? undefined,
        voiceMemoDuration: voiceMemoUrl && recordedDuration ? recordedDuration : undefined,
      });

      localStorage.setItem(ACTIVE_TICKET_KEY, incident.ticketNumber);
      setActiveIncident(incident);
      onIncidentCreated(incident);
      if (onSelectTicket) onSelectTicket(incident.ticketNumber);
      setDescription('');
      setPhotoUrl(null);
      setVoiceMemoUrl(null);
      setRecordedDuration(null);
      releaseVoicePreview();
    } catch (error) {
      setSubmitError(errorMessage(error, 'The report could not be submitted. Try again or call local emergency services.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewReport = () => {
    localStorage.removeItem(ACTIVE_TICKET_KEY);
    discardRecording();
    releaseVoicePreview();
    setActiveIncident(null);
    setTicketError('');
    setSubmitError('');
    setMediaError('');
    setDescription('');
    setSelectedCategories(['RESCUE']);
    setPeopleCount(1);
    setIsForOther(false);
    setAffectedPersonName('');
    setReporterPhone('');
    setPhotoUrl(null);
    setVoiceMemoUrl(null);
    setRecordedDuration(null);
    if (onSelectTicket) onSelectTicket(null);
  };

  if (!isOpen) return null;

  const renderLocationPanel = () => (
    <div className="p-3 rounded border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-semibold text-slate-800 block truncate">
              {coordinates ? locationName : 'Location not captured yet'}
            </span>
            {coordinates && (
              <span className="text-[10px] text-slate-500 font-mono">
                {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
              </span>
            )}
            {!coordinates && (
              <span className="text-[10px] text-slate-500 block">
                An emergency report cannot be dispatched without a device location.
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void requestLocation()}
          disabled={gpsStatus === 'detecting'}
          className="text-xs text-forest-700 hover:text-forest-900 font-semibold underline flex-shrink-0"
        >
          {gpsStatus === 'detecting' ? 'Detecting...' : coordinates ? 'Refresh GPS' : 'Use My GPS'}
        </button>
      </div>
      {gpsError && (
        <p className="text-[10px] text-red-700 flex items-start gap-1 pl-6">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {gpsError}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end">
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      <div
        className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overscroll-contain animate-in slide-in-from-right duration-200"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="px-5 py-4 border-b border-slate-200 bg-forest-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white shadow-sm">
              <AlertOctagon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-base leading-tight">Emergency Assistance</h2>
              <p className="text-[11px] text-forest-300 font-medium">
                {activeIncident ? `Tracking Ticket #${activeIncident.ticketNumber}` : 'Anonymous reporting — no account needed'}
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeIncident ? (
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
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    {activeIncident.location.address || 'Location supplied with the report'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {activeIncident.peopleCount} {activeIncident.peopleCount > 1 ? 'People' : 'Person'}
                  </span>
                </div>
              </div>

              {(activeIncident.mediaUrl || activeIncident.voiceMemoUrl) && (
                <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                  <p className="text-xs font-bold text-slate-800">Reporter-supplied evidence</p>
                  {activeIncident.mediaUrl && (
                    <div>
                      <img
                        src={activeIncident.mediaUrl}
                        alt="Evidence supplied with the emergency report"
                        className="w-full max-h-48 object-cover rounded border border-slate-200"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Photo supplied by the reporter. It is not independently verified.
                      </p>
                    </div>
                  )}
                  {activeIncident.voiceMemoUrl && (
                    <div>
                      <audio controls src={activeIncident.voiceMemoUrl} className="w-full" />
                      <p className="text-[10px] text-slate-500">
                        Voice memo supplied by the reporter{activeIncident.voiceMemoDuration ? ` (${activeIncident.voiceMemoDuration}s)` : ''}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {ticketError && (
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{ticketError}</span>
                </div>
              )}

              <div className="p-4 rounded-lg border border-slate-200 bg-[#FBFDFB]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-4 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-warm-600 animate-pulse" />
                  Live Rescue Timeline
                </h4>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">1. Emergency signal logged</p>
                      <p className="text-[11px] text-slate-500">
                        Ticket issued and placed in the emergency operations queue.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        activeIncident.aiAnalysis ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="w-full">
                      {activeIncident.aiAnalysis ? (
                        <div className="bg-emerald-50/60 p-2.5 rounded border border-emerald-200/60 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-emerald-950">2. AI triage advisory attached</p>
                            {typeof activeIncident.aiAnalysis.confidenceScore === 'number' &&
                              activeIncident.aiAnalysis.confidenceScore > 0 && (
                                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  {Math.round(activeIncident.aiAnalysis.confidenceScore * 100)}% image confidence
                                </span>
                              )}
                          </div>
                          <p className="text-[11px] text-emerald-900 mt-1">{activeIncident.aiAnalysis.summary}</p>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Hazards: {activeIncident.aiAnalysis.detectedHazards.length > 0
                              ? activeIncident.aiAnalysis.detectedHazards.join(', ')
                              : 'none listed'}
                          </p>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Resources suggested: {activeIncident.aiAnalysis.recommendedResources.length > 0
                              ? activeIncident.aiAnalysis.recommendedResources.join(', ')
                              : 'none listed'}
                          </p>
                          <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                            Advisory only. A human dispatcher must verify this report.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-slate-700">2. No AI advisory attached</p>
                          <p className="text-[11px] text-slate-500">
                            AI triage is optional and never verifies a report on its own.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        activeIncident.assignedResponderName
                          ? 'bg-emerald-600 text-white'
                          : activeIncident.status === 'RESOLVED' || activeIncident.status === 'IN_PROGRESS' || activeIncident.status === 'ASSIGNED'
                          ? 'bg-warm-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {activeIncident.assignedResponderName ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {activeIncident.assignedResponderName
                          ? `3. Assigned to ${activeIncident.assignedResponderName}`
                          : activeIncident.status === 'ASSIGNED' || activeIncident.status === 'IN_PROGRESS' || activeIncident.status === 'RESOLVED'
                          ? '3. Responder assigned'
                          : '3. Awaiting responder assignment'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {activeIncident.assignedResponderName
                          ? activeIncident.assignedAt
                            ? `Unit accepted the mission ${activeIncident.assignedAt}.`
                            : 'Unit has accepted the mission.'
                          : activeIncident.status === 'ASSIGNED' || activeIncident.status === 'IN_PROGRESS' || activeIncident.status === 'RESOLVED'
                          ? 'Assignment details are not published on this public ticket.'
                          : 'A human dispatcher assigns a response unit after verifying the report.'}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const step = statusStep(activeIncident);
                    const toneClass =
                      step.tone === 'done'
                        ? 'bg-emerald-600 text-white'
                        : step.tone === 'alert'
                        ? 'bg-red-600 text-white'
                        : step.tone === 'active'
                        ? 'bg-warm-500 text-white'
                        : 'bg-slate-200 text-slate-600';
                    return (
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${toneClass}`}>
                          {step.tone === 'done' ? <CheckCircle2 className="w-4 h-4" /> : step.tone === 'alert' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Navigation className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">4. {step.title}</p>
                          <p className="text-[11px] text-slate-500">{step.detail}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-3.5 rounded bg-warm-50 border border-warm-200 text-xs text-warm-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-warm-700" />
                  While you wait:
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-warm-800 text-[11px]">
                  <li>Stay on stable ground and keep this tracking screen open.</li>
                  <li>Keep your phone battery charged and volume on for dispatcher calls.</li>
                  <li>Do not enter moving water or damaged structures to help others.</li>
                  <li>If the danger becomes immediate, contact local emergency services directly.</li>
                </ul>
              </div>

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
            <div className="space-y-5">
              <div className="p-3 rounded bg-forest-50 border border-forest-200 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-5 h-5 text-forest-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-forest-900">Immediate help — no registration needed</p>
                  <p className="text-forest-700 text-[11px] mt-0.5 leading-relaxed">
                    Your report enters the emergency operations queue right away. Only a human dispatcher can verify
                    the report and assign a rescue unit. If you are in immediate danger, also call your local
                    emergency number.
                  </p>
                </div>
              </div>

              <div className="flex rounded-lg p-1 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMode('RAPID_SOS')}
                  className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                    mode === 'RAPID_SOS' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🚨 1-Tap Rapid SOS
                </button>
                <button
                  type="button"
                  onClick={() => setMode('DETAILED')}
                  className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                    mode === 'DETAILED' ? 'bg-forest-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Detailed Report
                </button>
              </div>

              {mode === 'RAPID_SOS' ? (
                <div className="space-y-4 pt-2">
                  <div className="text-center p-6 rounded-xl bg-red-50/70 border border-red-200 space-y-4">
                    <p className="text-xs font-medium text-red-800">
                      Press below if you are in immediate life-threatening danger. The SOS uses your device location
                      and enters the dispatch queue as CRITICAL.
                    </p>

                    <button
                      type="button"
                      disabled={formBusy}
                      onClick={() => void handleRapidSOS()}
                      className="w-full py-5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-70 text-white font-black text-lg tracking-wider uppercase shadow-xl shadow-red-600/30 border-2 border-red-400 transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 group"
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
                            requires device location · no account needed
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {renderLocationPanel()}
                </div>
              ) : (
                <form onSubmit={handleDetailedSubmit} className="space-y-4">
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
                        onChange={event => setAffectedPersonName(event.target.value)}
                        maxLength={160}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Type of Emergency (Select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['RESCUE', 'MEDICAL', 'FLOOD_EVACUATION', 'FOOD_WATER', 'SHELTER', 'POWER_COMMS'] as EmergencyCategory[]).map(category => {
                        const isSelected = selectedCategories.includes(category);
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'bg-warm-600 text-white border-warm-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {category.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Estimated People in Danger</label>
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

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Situation Details & Landmarks</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                      placeholder="Describe what is happening: water level, building floor, any chronic patients needing medicines..."
                      maxLength={4000}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Your Location</label>
                    {renderLocationPanel()}
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                      Evidence (optional)
                    </p>

                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={event => void handlePhotoSelected(event)}
                      className="hidden"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => (isRecording ? stopRecording() : void startRecording())}
                        disabled={isPhotoUploading || isVoiceUploading}
                        className={`p-2.5 rounded border text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                          isRecording
                            ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
                            : voiceMemoUrl
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Mic className="w-4 h-4" />
                        <span>
                          {isRecording
                            ? `Stop Recording (${recordedSeconds}s)`
                            : isVoiceUploading
                            ? 'Uploading Voice Memo...'
                            : voiceMemoUrl
                            ? `Voice Memo Attached (${recordedDuration}s)`
                            : 'Record Voice Memo'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isPhotoUploading || isRecording}
                        className={`p-2.5 rounded border text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                          photoUrl
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isPhotoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        <span>{isPhotoUploading ? 'Uploading Photo...' : photoUrl ? 'Photo Attached' : 'Add Photo'}</span>
                      </button>
                    </div>

                    {isRecording && (
                      <p className="text-[10px] text-red-700">
                        Recording stops automatically at {MAX_RECORDING_SECONDS} seconds.
                      </p>
                    )}

                    {voicePreviewUrl && (
                      <div className="space-y-1">
                        <audio controls src={voicePreviewUrl} className="w-full" />
                        <button
                          type="button"
                          onClick={() => {
                            setVoiceMemoUrl(null);
                            setRecordedDuration(null);
                            releaseVoicePreview();
                          }}
                          className="text-[10px] text-red-700 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove voice memo
                        </button>
                      </div>
                    )}

                    {photoUrl && (
                      <div className="relative rounded overflow-hidden h-28 border border-slate-300">
                        <img src={photoUrl} alt="Uploaded evidence preview" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                          Uploaded evidence
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhotoUrl(null)}
                          className="absolute top-1 right-1 p-1 rounded bg-black/70 text-white hover:bg-black"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {mediaError && (
                      <p className="text-[11px] text-red-700 flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {mediaError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Phone Number for Dispatcher Callback (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98XXX XXXXX"
                      value={reporterPhone}
                      onChange={event => setReporterPhone(event.target.value)}
                      maxLength={25}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                    />
                  </div>

                  {submitError && (
                    <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formBusy}
                    className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting to Dispatch Queue...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Emergency Report</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {mode === 'RAPID_SOS' && submitError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>ReliefSync emergency reporting</span>
          <span className="font-mono">API-backed</span>
        </div>
      </div>
    </div>
  );
};
