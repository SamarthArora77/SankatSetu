import React from 'react';
import { UrgencyLevel, IncidentStatus, DonationStatus } from '../../types';

interface BadgeProps {
  urgency?: UrgencyLevel;
  status?: IncidentStatus | DonationStatus;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ urgency, status, children, className = '', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  if (urgency) {
    switch (urgency) {
      case 'CRITICAL':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-red-50 border border-red-200 text-red-700 font-bold uppercase tracking-wide ${sizeClasses} ${className}`}>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            {children || 'Critical'}
          </span>
        );
      case 'HIGH':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-warm-50 border border-warm-200 text-warm-700 font-bold uppercase tracking-wide ${sizeClasses} ${className}`}>
            <span className="w-2 h-2 rounded-full bg-warm-600" />
            {children || 'High'}
          </span>
        );
      case 'MEDIUM':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-semibold uppercase tracking-wide ${sizeClasses} ${className}`}>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {children || 'Medium'}
          </span>
        );
      case 'LOW':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium uppercase tracking-wide ${sizeClasses} ${className}`}>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            {children || 'Low'}
          </span>
        );
    }
  }

  if (status) {
    switch (status) {
      case 'REPORTED':
      case 'PLEDGED':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-medium ${sizeClasses} ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            {children || (status === 'REPORTED' ? 'Pending Triage' : 'Pledged')}
          </span>
        );
      case 'VERIFIED':
      case 'COLLECTED':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-blue-50 border border-blue-200 text-blue-800 font-medium ${sizeClasses} ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            {children || (status === 'VERIFIED' ? 'Verified' : 'Collected')}
          </span>
        );
      case 'ASSIGNED':
      case 'IN_TRANSIT':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-forest-50 border border-forest-200 text-forest-800 font-medium ${sizeClasses} ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-forest-600 animate-pulse" />
            {children || (status === 'ASSIGNED' ? 'Assigned' : 'In Transit')}
          </span>
        );
      case 'IN_PROGRESS':
      case 'RECEIVED_AT_CAMP':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 font-medium ${sizeClasses} ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            {children || (status === 'IN_PROGRESS' ? 'On Scene' : 'At Relief Camp')}
          </span>
        );
      case 'RESOLVED':
      case 'DISTRIBUTED':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium ${sizeClasses} ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {children || (status === 'RESOLVED' ? 'Resolved' : 'Distributed')}
          </span>
        );
      case 'FLAGGED_HOAX':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded bg-red-100 border border-red-300 text-red-900 font-semibold line-through ${sizeClasses} ${className}`}>
            {children || 'Flagged Hoax'}
          </span>
        );
    }
  }

  return (
    <span className={`inline-flex items-center rounded bg-slate-100 border border-slate-200 text-slate-800 font-medium ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
};
