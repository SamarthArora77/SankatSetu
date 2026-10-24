import React, { useState } from 'react';
import { BroadcastAlert } from '../../types';
import { AlertTriangle, X, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

interface AlertBannerProps {
  alerts: BroadcastAlert[];
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (alerts.length === 0 || isDismissed) return null;

  const currentAlert = alerts[0];
  const isCritical = currentAlert.severity === 'CRITICAL_EVACUATION';

  return (
    <div className={`relative border-b text-sm transition-all z-[999] ${
      isCritical 
        ? 'bg-red-700 text-white border-red-800' 
        : 'bg-warm-600 text-white border-warm-700'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-black/20 font-bold">
            <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
          </span>
          
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold tracking-wide uppercase text-xs px-2 py-0.5 rounded bg-black/25">
              {currentAlert.severity.replace('_', ' ')}
            </span>
            <span className="font-semibold truncate">{currentAlert.title}</span>
            <span className="hidden md:inline text-white/80 text-xs">— {currentAlert.message}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium px-2 py-1 rounded bg-black/20 hover:bg-black/30 transition-colors flex items-center gap-1"
          >
            <span>{isExpanded ? 'Hide' : 'Affected Zones'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
            className="p-1 rounded hover:bg-black/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-black/30 border-t border-white/10 px-4 py-3 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
            <p className="text-white/95 leading-relaxed">{currentAlert.message}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white/70 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> High Risk Zones:
              </span>
              {currentAlert.affectedZones.map(zone => (
                <span key={zone} className="bg-white/20 text-white px-2 py-0.5 rounded font-mono font-medium">
                  {zone}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
