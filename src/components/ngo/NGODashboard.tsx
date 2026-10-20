import React, { useState } from 'react';
import { ResourceInventory, ReliefShelter, EmergencyIncident } from '../../types';
import { Package, Truck, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Plus, Sparkles } from 'lucide-react';

interface NGODashboardProps {
  inventory: ResourceInventory[];
  shelters: ReliefShelter[];
  emergencies: EmergencyIncident[];
  onDispatch: (inventoryId: string, quantity: number, targetName: string) => void;
}

export const NGODashboard: React.FC<NGODashboardProps> = ({
  inventory,
  shelters,
  emergencies,
  onDispatch
}) => {
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Identify resource deficits
  const criticalShelters = shelters.filter(s => s.suppliesStatus === 'CRITICAL_SHORTAGE');
  const foodWaterNeeds = emergencies.filter(e => e.category.includes('FOOD_WATER') && e.status !== 'RESOLVED');

  const handleQuickDispatch = (inventoryId: string, quantity: number, targetName: string) => {
    onDispatch(inventoryId, quantity, targetName);
    setDispatchSuccess(`Successfully dispatched ${quantity} units to ${targetName}!`);
    setTimeout(() => setDispatchSuccess(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-forest-800 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <Package className="w-6 h-6 text-warm-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">NGO Relief Logistics & Inventory Command</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated warehouses, automated supply-demand matching & emergency restocking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-forest-100 text-forest-800 border border-forest-200">
            5 Registered Warehouses Active
          </span>
        </div>
      </div>

      {dispatchSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{dispatchSuccess}</span>
        </div>
      )}

      {/* AUTOMATED RESOURCE MATCHING ENGINE (USP) */}
      <div className="bg-gradient-to-r from-forest-900 to-forest-950 text-white rounded-xl p-5 shadow-lg border border-forest-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warm-400 animate-spin" style={{ animationDuration: '6s' }} />
            <h3 className="font-bold text-base text-white">Smart Resource Matching Engine</h3>
          </div>
          <span className="text-[11px] font-mono text-forest-300 bg-forest-800 px-2 py-0.5 rounded">
            Algorithmic Redistribution
          </span>
        </div>

        <p className="text-xs text-forest-200 max-w-3xl leading-relaxed">
          The engine continuously matches ground shortages from critical shelters and pending SOS reports against warehouse stockpiles to prevent resource mismatch and wasted transit.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Match Card 1: Critical Shelter Water Shortage */}
          {criticalShelters.length > 0 && (
            <div className="bg-forest-800/80 backdrop-blur-sm border border-forest-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> High Deficit Alert
                </span>
                <span className="text-[10px] font-mono bg-red-950/80 text-red-300 px-2 py-0.5 rounded border border-red-800">
                  Critical Shortage
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white">{criticalShelters[0].name}</h4>
                <p className="text-xs text-forest-200 mt-0.5">
                  Shelter holds {criticalShelters[0].currentOccupancy} evacuees without clean drinking water.
                </p>
              </div>

              <div className="p-2.5 rounded bg-forest-950/60 border border-forest-700/60 text-xs flex items-center justify-between">
                <div>
                  <span className="text-forest-400 text-[10px] block">Matching Stock in Depot:</span>
                  <span className="font-bold text-white">20L Water Cans (450 available)</span>
                </div>
                <button
                  onClick={() => handleQuickDispatch('inv-01', 50, criticalShelters[0].name)}
                  className="px-3 py-1.5 rounded bg-warm-600 hover:bg-warm-500 active:bg-warm-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatch 50 Cans</span>
                </button>
              </div>
            </div>
          )}

          {/* Match Card 2: Evacuee Flyover Hunger */}
          {foodWaterNeeds.length > 0 && (
            <div className="bg-forest-800/80 backdrop-blur-sm border border-forest-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-warm-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Field Need Match
                </span>
                <span className="text-[10px] font-mono bg-warm-950/80 text-warm-300 px-2 py-0.5 rounded border border-warm-800">
                  SOS Demand
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white">{foodWaterNeeds[0].title}</h4>
                <p className="text-xs text-forest-200 mt-0.5">
                  Location: {foodWaterNeeds[0].location.address} ({foodWaterNeeds[0].peopleCount} citizens)
                </p>
              </div>

              <div className="p-2.5 rounded bg-forest-950/60 border border-forest-700/60 text-xs flex items-center justify-between">
                <div>
                  <span className="text-forest-400 text-[10px] block">Matching Stock in Depot:</span>
                  <span className="font-bold text-white">Dry Ration Packets (1,850 available)</span>
                </div>
                <button
                  onClick={() => handleQuickDispatch('inv-02', 100, foodWaterNeeds[0].location.address || 'Field Group')}
                  className="px-3 py-1.5 rounded bg-warm-600 hover:bg-warm-500 active:bg-warm-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatch 100 Rations</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WAREHOUSE INVENTORY LEDGER */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Current Warehouse Stock Ledger</h3>
            <p className="text-xs text-slate-500">Real-time inventory levels across regional staging depots</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Item Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Warehouse Hub</th>
                <th className="py-3 px-3">Available Stock</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Quick Dispatch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {inventory.map((item) => {
                const isLow = item.availableQuantity <= item.criticalThreshold;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{item.itemName}</td>
                    <td className="py-3 px-3 text-slate-600">{item.category}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono">{item.warehouseName}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {item.availableQuantity} {item.unit}
                    </td>
                    <td className="py-3 px-3">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                          Low Stock Threshold ({item.criticalThreshold})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Adequate Supply
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleQuickDispatch(item.id, Math.min(25, item.availableQuantity), 'Kashmere Gate Camp')}
                        disabled={item.availableQuantity <= 0}
                        className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-100 hover:bg-forest-800 hover:text-white text-slate-700 transition-colors border border-slate-200"
                      >
                        Send 25 Units →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
