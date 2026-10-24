import React, { useState } from 'react';
import { DonationRecord, DonationStatus, ReliefShelter } from '../../types';
import type { CurrentUser } from '../../api';
import { HeartHandshake, QrCode, ShieldCheck, Plus, Loader2, AlertCircle, LogIn, ScanLine } from 'lucide-react';
import { Badge } from '../common/Badge';
import { QRScannerModal } from '../common/QRScannerModal';
import { ApiError } from '../../api/client';

interface DonorDashboardProps {
  donations: DonationRecord[];
  shelters: ReliefShelter[];
  currentUser: CurrentUser | null;
  canVerifyCheckpoint: boolean;
  onCreateDonation: (data: {
    donorName: string;
    type: 'SUPPLIES' | 'MONETARY';
    amountOrQuantity: string;
    itemDescription: string;
    allocatedShelterName?: string;
  }) => Promise<DonationRecord | null>;
  onScanCheckpoint: (
    code: string,
    status: DonationStatus,
    location: string,
    verifier: string,
  ) => Promise<DonationRecord | null>;
  onRequireAuth: () => void;
}

export const DonorDashboard: React.FC<DonorDashboardProps> = ({
  donations,
  shelters,
  currentUser,
  canVerifyCheckpoint,
  onCreateDonation,
  onScanCheckpoint,
  onRequireAuth,
}) => {
  const [selectedDonationId, setSelectedDonationId] = useState<string>(donations[0]?.id || '');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New donation pledge form states
  const [donorName, setDonorName] = useState(currentUser?.name ?? '');
  const [donationType, setDonationType] = useState<'SUPPLIES' | 'MONETARY'>('SUPPLIES');
  const [amountOrQuantity, setAmountOrQuantity] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [targetShelter, setTargetShelter] = useState(shelters[0]?.name ?? '');

  const activeDonation = donations.find(d => d.id === selectedDonationId) || donations[0];

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!amountOrQuantity.trim() || !itemDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await onCreateDonation({
        donorName: donorName.trim() || 'Anonymous Donor',
        type: donationType,
        amountOrQuantity: amountOrQuantity.trim(),
        itemDescription: itemDescription.trim(),
        allocatedShelterName: targetShelter || undefined,
      });
      if (created) {
        setSelectedDonationId(created.id);
        setShowPledgeForm(false);
        setAmountOrQuantity('');
        setItemDescription('');
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'The pledge could not be registered.');
    } finally {
      setIsSubmitting(false);
    }
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
              Auditable chain-of-custody tracking from pledge to physical ground delivery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canVerifyCheckpoint ? (
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-3.5 py-2 rounded text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <ScanLine className="w-4 h-4 text-warm-400" />
              <span>Verify Custody Checkpoint</span>
            </button>
          ) : (
            <button
              onClick={onRequireAuth}
              title="NGO and administrator accounts record custody checkpoints"
              className="px-3.5 py-2 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verifier Sign-In</span>
            </button>
          )}

          <button
            onClick={() => setShowPledgeForm(!showPledgeForm)}
            className="px-3.5 py-2 rounded text-xs font-bold bg-warm-600 hover:bg-warm-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showPledgeForm ? 'Close Form' : 'Pledge Donation'}</span>
          </button>
        </div>
      </div>

      {!currentUser && (
        <div className="p-3 rounded-lg bg-forest-50 border border-forest-200 text-[11px] text-forest-800 flex items-start gap-2">
          <LogIn className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Pledges can be registered without an account. This device stores each one-time tracking token so your
            donation stays visible in this browser. Sign in as a donor to keep the full ledger across sessions.
          </span>
        </div>
      )}

      {/* New Donation Pledge Slide/Collapse Form */}
      {showPledgeForm && (
        <div className="bg-white rounded-lg border-2 border-forest-600 p-5 shadow-lg space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-forest-950 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-warm-600" />
              Make a Verifiable Relief Contribution
            </h3>
            <span className="text-[11px] text-slate-500">Server-generated tracking code & one-time access token</span>
          </div>

          {formError && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handlePledgeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Donor Name / Organization</label>
              <input
                type="text"
                placeholder="Your name or organization"
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Donation Type</label>
              <select
                value={donationType}
                onChange={e => setDonationType(e.target.value as 'SUPPLIES' | 'MONETARY')}
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
                required
                placeholder={donationType === 'SUPPLIES' ? 'e.g. 50 x 20L water cans' : 'e.g. INR 25,000'}
                value={amountOrQuantity}
                onChange={e => setAmountOrQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-forest-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Description / Relief Purpose</label>
              <input
                type="text"
                required
                placeholder="What is being donated and who should receive it?"
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
                <option value="">Unassigned — regional relief hub</option>
                {shelters.map((shelter) => (
                  <option key={shelter.id} value={shelter.name}>
                    {shelter.name}
                  </option>
                ))}
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
                disabled={isSubmitting}
                className="px-5 py-2 rounded text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white shadow-sm flex items-center gap-2 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSubmitting ? 'Registering Pledge...' : 'Confirm Pledge & Generate Tracking Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE VERIFIABLE TRACEABILITY TIMELINE */}
      {activeDonation ? (
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
                Donated by <strong>{activeDonation.donorName}</strong> | Allocation: {activeDonation.allocatedShelterName || 'Regional relief hub'}
              </p>
            </div>

            {/* Tracking code card */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-16 h-16 bg-white p-1 rounded border border-slate-300 flex items-center justify-center">
                <QrCode className="w-14 h-14 text-slate-900" />
              </div>
              <div className="text-xs">
                <span className="font-mono text-[10px] text-slate-500 block uppercase">Custody QR Payload</span>
                <span className="font-bold text-slate-800">{activeDonation.trackingCode}</span>
                <span className="text-[10px] text-forest-700 block font-medium">
                  Staff checkpoints require an authenticated verifier
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Milestone Breadcrumbs */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-forest-900">
              Chain-of-Custody Checkpoints
            </h4>

            {activeDonation.milestones.length === 0 ? (
              <div className="p-4 rounded border border-dashed border-slate-300 text-xs text-slate-500">
                No custody checkpoints recorded yet. An authorized NGO or administrator must scan this parcel at pickup,
                transit, camp receipt, and distribution.
              </div>
            ) : (
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
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
          No donation records are visible yet. Register a pledge to receive a tracking code, or sign in as a donor,
          NGO, or administrator to view the ledger.
        </div>
      )}

      {/* ALL DONATION RECORDS TABLE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-base text-slate-900">Donation Traceability Ledger</h3>
        {donations.length === 0 ? (
          <p className="text-xs text-slate-500 p-4 border border-dashed border-slate-300 rounded">
            No donations to display. Anonymous pledges registered on this browser will appear here using their stored
            tracking tokens.
          </p>
        ) : (
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
        )}
      </div>

      {/* Custody checkpoint verification (NGO / ADMIN only) */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        availableCodes={donations.map(d => d.trackingCode)}
        verifierName={currentUser?.name ?? ''}
        onConfirmScan={async (code, status, loc, verifier) => {
          const updated = await onScanCheckpoint(code, status, loc, verifier);
          if (updated) setSelectedDonationId(updated.id);
          return updated;
        }}
      />
    </div>
  );
};
