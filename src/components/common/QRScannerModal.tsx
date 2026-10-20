import React, { useState } from 'react';
import { X, QrCode, CheckCircle2, Truck, AlertCircle, Camera } from 'lucide-react';
import { DonationStatus } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmScan: (trackingCode: string, nextStatus: DonationStatus, location: string, verifier: string) => void;
  availableCodes: string[];
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onConfirmScan,
  availableCodes
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(availableCodes[0] || 'RS-DON-4418');
  const [nextStatus, setNextStatus] = useState<DonationStatus>('IN_TRANSIT');
  const [location, setLocation] = useState('Mayur Vihar Relief Staging Point');
  const [verifierName, setVerifierName] = useState('Officer V. Rawat (Badge #DDMA-702)');
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setIsSimulatingCamera(true);
    setTimeout(() => {
      setIsSimulatingCamera(false);
      setScanSuccess(true);
      setTimeout(() => {
        onConfirmScan(selectedCode, nextStatus, location, verifierName);
        setScanSuccess(false);
        onClose();
      }, 900);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div 
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-forest-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-warm-400" />
            <h3 className="font-bold text-sm">Mobile QR Checkpoint Scanner</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-forest-800 text-forest-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Simulate a relief worker scanning the physical QR code on an incoming aid consignment or relief supply crate to log custody.
          </p>

          {/* Camera Viewfinder Simulation */}
          <div className="relative rounded-lg h-44 bg-slate-950 border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
            {isSimulatingCamera ? (
              <div className="flex flex-col items-center gap-2 text-white text-xs">
                <div className="w-28 h-28 border-2 border-emerald-400 rounded-lg animate-pulse relative flex items-center justify-center">
                  <div className="w-full h-0.5 bg-emerald-400 absolute animate-bounce" />
                  <QrCode className="w-12 h-12 text-white/40" />
                </div>
                <span className="font-mono text-emerald-400 font-bold">Scanning Parcel Checksum...</span>
              </div>
            ) : scanSuccess ? (
              <div className="flex flex-col items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-12 h-12 animate-bounce" />
                <span className="font-bold text-xs">Checksum Verified! Logging Milestone...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-xs text-center p-4">
                <Camera className="w-8 h-8 text-slate-500" />
                <span className="text-[11px]">Point camera at package QR label</span>
                <span className="font-mono text-[10px] text-warm-400 bg-black/40 px-2 py-0.5 rounded">
                  Target: {selectedCode}
                </span>
              </div>
            )}
          </div>

          {/* Configuration Form */}
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Consignment to Scan</label>
              <select
                value={selectedCode}
                onChange={e => setSelectedCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-forest-600 focus:outline-none"
              >
                {availableCodes.map(code => (
                  <option key={code} value={code}>
                    {code} (Consignment Parcel)
                  </option>
                ))}
              </select>
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
                  className="w-full px-2.5 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Authorized Verifier ID</label>
              <input
                type="text"
                value={verifierName}
                onChange={e => setVerifierName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSimulateScan}
            disabled={isSimulatingCamera || scanSuccess}
            className="w-full py-2.5 rounded-lg bg-forest-800 hover:bg-forest-900 active:bg-forest-950 text-white font-bold text-xs uppercase tracking-wide transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <QrCode className="w-4 h-4" />
            <span>Simulate QR Camera Scan & Verify</span>
          </button>
        </div>
      </div>
    </div>
  );
};
