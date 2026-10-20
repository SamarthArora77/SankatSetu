import React from 'react';
import { Filter, AlertOctagon, Home, Radio, Search } from 'lucide-react';

export type MapFilterType = 'ALL' | 'CRITICAL_ONLY' | 'SHELTERS_ONLY' | 'RESPONDERS_ONLY';

interface MapFiltersProps {
  activeFilter: MapFilterType;
  onFilterChange: (filter: MapFilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: {
    emergencies: number;
    critical: number;
    shelters: number;
    responders: number;
  };
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  counts
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-lg p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search sector, landmark or camp..."
          className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-forest-600 focus:outline-none bg-slate-50"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onFilterChange('ALL')}
          className={`px-2.5 py-1.5 rounded font-semibold border transition-colors flex items-center gap-1.5 ${
            activeFilter === 'ALL'
              ? 'bg-forest-900 text-white border-forest-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-3 h-3" />
          <span>All Layers</span>
        </button>

        <button
          onClick={() => onFilterChange('CRITICAL_ONLY')}
          className={`px-2.5 py-1.5 rounded font-semibold border transition-colors flex items-center gap-1.5 ${
            activeFilter === 'CRITICAL_ONLY'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertOctagon className="w-3 h-3 text-red-500 group-hover:text-red-700" />
          <span>Critical Only ({counts.critical})</span>
        </button>

        <button
          onClick={() => onFilterChange('SHELTERS_ONLY')}
          className={`px-2.5 py-1.5 rounded font-semibold border transition-colors flex items-center gap-1.5 ${
            activeFilter === 'SHELTERS_ONLY'
              ? 'bg-forest-700 text-white border-forest-700'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Home className="w-3 h-3 text-forest-600" />
          <span>Shelters ({counts.shelters})</span>
        </button>

        <button
          onClick={() => onFilterChange('RESPONDERS_ONLY')}
          className={`px-2.5 py-1.5 rounded font-semibold border transition-colors flex items-center gap-1.5 ${
            activeFilter === 'RESPONDERS_ONLY'
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Radio className="w-3 h-3 text-blue-600" />
          <span>Units ({counts.responders})</span>
        </button>
      </div>
    </div>
  );
};
