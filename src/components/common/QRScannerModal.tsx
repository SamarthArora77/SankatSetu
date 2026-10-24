import React, { useEffect, useRef, useState } from 'react';
import { QrCode, X, CheckCircle2, Camera, CameraOff, AlertTriangle, Loader2 } from 'lucide-react';
import { DonationStatus } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCodes: string[];
  verifierName: string;
  onConfirmScan: (
    code: string,
    status: DonationStatus,
    location: string,
    verifier: string,
  ) => Promise<unknown>;
}

interface BarcodeDetectorLike {
  detect(image: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

function parseQrPayload(raw: string): string {
  const value = raw.trim();
  try {
    const url = new URL(value);
    const tracked = url.searchParams.get('track');
    if (tracked) return tracked.trim().toUpperCase();
  } catch {
    // Not a URL - treat the payload as a bare tracking code.
  }
  return value.replace(/^.*\/track\//i, '').toUpperCase();
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  availableCodes,
  verifierName,
  onConfirmScan,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const [selectedCode, setSelectedCode] = useState('');
  const [nextStatus, setNextStatus] = useState<DonationStatus>('COLLECTED');
  const [location, setLocation] = useState('');
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'unsupported' | 'denied'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const stopCamera = () => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setSubmitError('');
      setScanSuccess(false);
      setIsSubmitting(false);
      setCameraError('');
      setSelectedCode('');
      setNextStatus('COLLECTED');
      setLocation('');
    }
    return () => stopCamera();
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async () => {
    setCameraError('');
    const Detector = getBarcodeDetector();
    if (!Detector) {
      setCameraState('unsupported');
      setCameraError('This browser does not expose the BarcodeDetector API. Enter the tracking code manually below.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      setCameraError('Camera access is unavailable in this browser. Enter the tracking code manually below.');
      return;
    }

    setCameraState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraState('active');

      const detector = new Detector({ formats: ['qr_code'] });
      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        try {
          const results = await detector.detect(video);
          const first = results[0]?.rawValue;
          if (first) {
            const code = parseQrPayload(first);
            if (code) {
              setSelectedCode(code);
              stopCamera();
            }
          }
        } catch {
          // Detector rejects transient frames; keep scanning.
        }
      }, 600);
    } catch (err) {
      stopCamera();
      setCameraState('denied');
      setCameraError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow access or enter the tracking code manually.'
          : 'Could not start the camera. Enter the tracking code manually.',
      );
    }
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    const code = selectedCode.trim().toUpperCase();
    if (!code) {
      setSubmitError('A tracking code is required.');
      return;
    }
    if (!location.trim()) {
      setSubmitError('Record the physical checkpoint location.');
      return;
    }
    if (!verifierName.trim()) {
      setSubmitError('An authenticated NGO or EOC verifier is required to append a checkpoint.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirmScan(code, nextStatus, location.trim(), verifierName.trim());
      setScanSuccess(true);
      stopCamera();
      window.setTimeout(() => {
        setScanSuccess(false);
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err instanceof Error ? err.message : 'Checkpoint could not be logged.');
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="px-5 py-4 bg-forest-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-warm-400" />
            <h3 className="font-bold text-sm">Donation Checkpoint Scanner</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-forest-800 text-forest-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Scan the QR label attached to a relief consignment, or type its tracking code. Checkpoints are appended
            to the donation ledger server-side; only an authenticated NGO or EOC account can sign off.
          </p>

          <div className="relative rounded-lg h-44 bg-slate-950 border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
            {scanSuccess ? (
              <div className="flex flex-col items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-12 h-12" />
                <span className="font-bold text-xs">Checkpoint recorded on the ledger.</span>
              </div>
            ) : cameraState === 'active' ? (
              <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-xs text-center p-4">
                {cameraState === 'denied' || cameraState === 'unsupported' ? (
                  <CameraOff className="w-8 h-8 text-slate-500" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-500" />
                )}
                <span className="text-[11px] max-w-[240px]">
                  {cameraError || 'Start the camera to scan a package QR label, or enter the code manually.'}
                </span>
              </div>
            )}

            {cameraState === 'active' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-28 border-2 border-emerald-400 rounded-lg relative">
                  <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {cameraState === 'active' ? (
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-2 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Stop Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraState === 'starting' || scanSuccess}
                className="flex-1 py-2 rounded border border-forest-300 bg-forest-50 text-xs font-bold text-forest-800 hover:bg-forest-100 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {cameraState === 'starting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                {cameraState === 'starting' ? 'Starting Camera...' : 'Start Camera Scan'}
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tracking Code</label>
              <input
                type="text"
                list="donation-tracking-codes"
                value={selectedCode}
                onChange={e => setSelectedCode(e.target.value.toUpperCase())}
                placeholder="e.g. DON-7H2K9X"
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-forest-600 focus:outline-none"
                required
              />
              <datalist id="donation-tracking-codes">
                {availableCodes.map(code => (
                  <option key={code} value={code} />
                ))}
              </datalist>
              <p className="text-[10px] text-slate-500 mt-1">Scanned QR payloads are parsed to their tracking code automatically.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Log Checkpoint As</label>
                <select
                  value={nextStatus}
                  onChange={e => setNextStatus(e.target.value as DonationStatus)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-forest-600 focus:outline-none"
                >
                  <option value="COLLECTED">Collected</option>
                  <option value="IN_TRANSIT">In-Transit</option>
                  <option value="RECEIVED_AT_CAMP">Received at Camp</option>
                  <option value="DISTRIBUTED">Distributed</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Checkpoint Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Yamuna Bazar Depot"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Verifier (server-authenticated account)</label>
              <input
                type="text"
                value={verifierName || 'Not signed in'}
                readOnly
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded text-slate-700 font-semibold"
              />
              {!verifierName && (
                <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Sign in as an NGO or EOC account to submit a checkpoint.
                </p>
              )}
            </div>
          </div>

          {submitError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || scanSuccess || !verifierName}
            className="w-full py-2.5 rounded-lg bg-forest-800 hover:bg-forest-900 active:bg-forest-950 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            <span>{isSubmitting ? 'Recording Checkpoint...' : 'Confirm Checkpoint'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
