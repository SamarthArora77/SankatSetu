import React, { useState } from 'react';
import { DonationRecord, DonationStatus } from '../../types';
import { HeartHandshake, QrCode, CheckCircle2, Truck, ShieldCheck, ArrowRight, Plus, ExternalLink } from 'lucide-react';
import { Badge } from '../common/Badge';
import { QRScannerModal } from '../common/QRScannerModal';

interface DonorDashboardProps {
  donations: DonationRecord[];
  onCreateDonation: (data: {
    donorName: string;
    type: 'SUPPLIES' | 'MONETARY';
    amountOrQuantity: string;
    itemDescription: string;
    allocatedShelterName?: string;
  }) => void;
  onScanCheckpoint: (code: string, status: DonationStatus, location: string, verifier: string) => void;
}

export const DonorDashboard: React.FC<DonorDashboardProps> = ({
  donations,
  onCreateDonation,
  onScanCheckpoint
}) => {
  const [selectedDonationId, setSelectedDonationId] = useState<string>(donations[0]?.id || '');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showPledgeForm, setShowPledgeForm] = useState(false);

  // New donation pledge form states
  const [donorName, setDonorName] = useState('');
  const [donationType, setDonationType] = useState<'SUPPLIES' | 'MONETARY'>('SUPPLIES');
  const [amountOrQuantity, setAmountOrQuantity] = useState('50x Packaged Water Cans (20L)');
  const [itemDescription, setItemDescription] = useState('Drinking water containers for flood-affected families in Kashmere Gate');
  const [targetShelter, setTargetShelter] = useState('Kashmere Gate ISBT Relief Camp');

  const activeDonation = donations.find(d => d.id === selectedDonationId) || donations[0];

  const handlePledgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountOrQuantity.trim()) return;
    onCreateDonation({
      donorName: donorName || 'Anonymous Donor',
      type: donationType,
      amountOrQuantity,
      itemDescription,
      allocatedShelterName: targetShelter
    });
    setShowPledgeForm(false);
    setDonorName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-forest-900 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <HeartHandshake className="w-6 h-6 text-warm-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">Donation Traceability & Transparency Ledger</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              100% auditable chain-of-custody tracking from pledge to physical ground delivery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action to scan checkpoint */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 rounded text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <QrCode className="w-4 h-4 text-warm-400" />
            <span>Simulate QR Checkpoint Scan</span>
          </button>

          <button
            onClick={() => setShowPledgeForm(!showPledgeForm)}
            className="px-3.5 py-2 rounded text-xs font-bold bg-warm-600 hover:bg-warm-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showPledgeForm ? 'Close Form' : 'Pledge Donation'}</span>
          </button>
        </div>
      </div>

      {/* New Donation Pledge Slide/Collapse Form */}
      {showPledgeForm && (
        <div className="bg-white rounded-lg border-2 border-forest-600 p-5 shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-forest-950 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-warm-600" />
              Make a Verifiable Relief Contribution
            </h3>
            <span className="text-[11px] text-slate-500">Generates instant cryptographic tracking QR</span>
          </div>

          <form onSubmit={handlePledgeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Donor Name / Organization</label>
              <input
                type="text"
                placeholder="e.g. Rohini Residents Welfare Association"
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Donation Type</label>
              <select
                value={donationType}
                onChange={e => setDonationType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-forest-600 focus:outline-none"
              >
                <option value="SUPPLIES">Physical Relief Goods / Supplies</option>
                <option value="MONETARY">Monetary Aid Grant</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {donationType === 'SUPPLIES' ? 'Item & Quantity' : 'Amount in INR'}
              </label>
              <input
                type="text"
                value={amountOrQuantity}
                onChange={e => setAmountOrQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Description / Relief Purpose</label>
              <input
                type="text"
                value={itemDescription}
                onChange={e => setItemDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Relief Camp Allocation</label>
              <select
                value={targetShelter}
                onChange={e => setTargetShelter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-forest-600 focus:outline-none"
              >
                <option value="Kashmere Gate ISBT Relief Camp">Kashmere Gate ISBT Relief Camp</option>
                <option value="Mayur Vihar Ph-1 Secondary School Camp">Mayur Vihar Ph-1 Secondary School Camp</option>
                <option value="Yamuna Sports Complex Safe Zone">Yamuna Sports Complex Safe Zone</option>
                <option value="Akshardham Flyover Staging Post">Akshardham Flyover Staging Post</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPledgeForm(false)}
                className="px-4 py-2 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white shadow-sm"
              >
                Confirm Pledge & Generate Tracking QR →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE VERIFIABLE TRACEABILITY TIMELINE */}
      {activeDonation && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold bg-forest-100 text-forest-900 px-2.5 py-1 rounded border border-forest-200">
                  {activeDonation.trackingCode}
                </span>
                <Badge status={activeDonation.status} />
              </div>
              <h3 className="font-bold text-base text-slate-900 mt-2">{activeDonation.itemDescription}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Donated by <strong>{activeDonation.donorName}</strong> | Allocation: {activeDonation.allocatedShelterName}
              </p>
            </div>

            {/* Generated QR Code Card */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-16 h-16 bg-white p-1 rounded border border-slate-300 flex items-center justify-center">
                <QrCode className="w-14 h-14 text-slate-900" />
              </div>
              <div className="text-xs">
                <span className="font-mono text-[10px] text-slate-500 block uppercase">Cryptographic QR</span>
                <span className="font-bold text-slate-800">{activeDonation.trackingCode}</span>
                <span className="text-[10px] text-emerald-700 block font-medium">✓ SHA-256 Checksummed</span>
              </div>
            </div>
          </div>

          {/* Chronological Milestone Breadcrumbs */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Chain-of-Custody Checkpoints
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-forest-200">
              {activeDonation.milestones.map((ms, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-forest-700 text-white flex items-center justify-center text-[10px] font-bold shadow-sm ring-4 ring-white">
                    ✓
                  </span>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 w-full text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-forest-950 uppercase tracking-wide text-[11px]">
                        {ms.checkpoint.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{ms.timestamp}</span>
                    </div>
                    <p className="text-slate-700 font-medium">📍 {ms.location}</p>
                    <p className="text-[11px] text-slate-500">Verified by: <strong>{ms.verifiedBy}</strong></p>
                    {ms.notes && <p className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-200/60 mt-1">{ms.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ALL DONATION RECORDS TABLE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-base text-slate-900">Public Donation Traceability Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Tracking Code</th>
                <th className="py-2.5 px-3">Donor</th>
                <th className="py-2.5 px-3">Items / Amount</th>
                <th className="py-2.5 px-3">Allocated Location</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-forest-900">{d.trackingCode}</td>
                  <td className="py-2.5 px-3 text-slate-800">{d.donorName}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{d.amountOrQuantity}</td>
                  <td className="py-2.5 px-3 text-slate-600">{d.allocatedShelterName || 'Regional Hub'}</td>
                  <td className="py-2.5 px-3"><Badge status={d.status} size="sm" /></td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setSelectedDonationId(d.id)}
                      className="px-2 py-1 rounded text-[11px] font-bold text-forest-800 hover:bg-forest-100"
                    >
                      View Timeline →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Scanner Modal Simulation */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        availableCodes={donations.map(d => d.trackingCode)}
        onConfirmScan={(code, status, loc, verifier) => {
          onScanCheckpoint(code, status, loc, verifier);
        }}
      />
    </div>
  );
};
