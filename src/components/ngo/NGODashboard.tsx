import React, { useState } from 'react';
import { ResourceInventory, ReliefShelter, EmergencyIncident } from '../../types';
import { Package, Truck, AlertCircle } from 'lucide-react';

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
  onDispatch,
}) => {
  const [targetShelterId, setTargetShelterId] = useState('');

  const criticalShelters = shelters.filter(shelter => shelter.suppliesStatus === 'CRITICAL_SHORTAGE');
  const foodWaterNeeds = emergencies.filter(
    incident => incident.category.includes('FOOD_WATER') && incident.status !== 'RESOLVED',
  );
  const dispatchableShelters = shelters.filter(shelter => shelter.isOpen);
  const selectedShelter =
    dispatchableShelters.find(shelter => shelter.id === targetShelterId) ?? dispatchableShelters[0] ?? null;

  const warehouseCount = new Set(
    inventory.map(item => item.warehouseName).filter(Boolean),
  ).size;

  const waterStock = inventory.find(item => /water/i.test(item.itemName) && item.availableQuantity > 0);
  const foodStock = inventory.find(
    item => /food|ration|meal/i.test(item.itemName) && item.availableQuantity > 0,
  );

  const dispatchTo = (item: ResourceInventory, requested: number, targetName: string | undefined) => {
    if (!targetName) return;
    const quantity = Math.min(requested, item.availableQuantity);
    if (quantity <= 0) return;
    onDispatch(item.id, quantity, targetName);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-forest-800 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <Package className="w-6 h-6 text-warm-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">NGO Relief Logistics & Inventory Command</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Warehouse stock levels, reported supply gaps, and manual dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-forest-100 text-forest-800 border border-forest-200">
            {warehouseCount} Registered {warehouseCount === 1 ? 'Warehouse' : 'Warehouses'}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-forest-900 to-forest-950 text-white rounded-xl p-5 shadow-lg border border-forest-800 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warm-400" />
            <h3 className="font-bold text-base text-white">Reported Supply Gaps</h3>
          </div>
          <span className="text-[11px] font-mono text-forest-300 bg-forest-800 px-2 py-0.5 rounded">
            Manual dispatch only
          </span>
        </div>

        <p className="text-xs text-forest-200 max-w-3xl leading-relaxed">
          Critical shelter shortages and field requests are listed next to the stock actually recorded in your
          warehouses. Nothing is dispatched automatically — confirm the destination and quantity below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {criticalShelters.length > 0 && (
            <div className="bg-forest-800/80 backdrop-blur-sm border border-forest-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Shelter deficit
                </span>
                <span className="text-[10px] font-mono bg-red-950/80 text-red-300 px-2 py-0.5 rounded border border-red-800">
                  Critical shortage
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white">{criticalShelters[0].name}</h4>
                <p className="text-xs text-forest-200 mt-0.5">
                  {criticalShelters[0].currentOccupancy} evacuees on site. The shelter reports a critical supply
                  shortage.
                </p>
              </div>

              <div className="p-2.5 rounded bg-forest-950/60 border border-forest-700/60 text-xs space-y-2">
                {waterStock ? (
                  <>
                    <div>
                      <span className="text-forest-400 text-[10px] block">Recorded water stock:</span>
                      <span className="font-bold text-white">
                        {waterStock.itemName} ({waterStock.availableQuantity} {waterStock.unit} at {waterStock.warehouseName})
                      </span>
                    </div>
                    <button
                      onClick={() => dispatchTo(waterStock, 50, criticalShelters[0].name)}
                      disabled={!waterStock.availableQuantity}
                      className="w-full px-3 py-1.5 rounded bg-warm-600 hover:bg-warm-500 active:bg-warm-700 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch {Math.min(50, waterStock.availableQuantity)} {waterStock.unit}</span>
                    </button>
                  </>
                ) : (
                  <p className="text-forest-300">No water stock is recorded in the warehouse ledger.</p>
                )}
              </div>
            </div>
          )}

          {foodWaterNeeds.length > 0 && (
            <div className="bg-forest-800/80 backdrop-blur-sm border border-forest-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-warm-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Field request
                </span>
                <span className="text-[10px] font-mono bg-warm-950/80 text-warm-300 px-2 py-0.5 rounded border border-warm-800">
                  Food / water SOS
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white">{foodWaterNeeds[0].title}</h4>
                <p className="text-xs text-forest-200 mt-0.5">
                  {foodWaterNeeds[0].location.address || 'Location supplied'} · {foodWaterNeeds[0].peopleCount} people
                </p>
              </div>

              <div className="p-2.5 rounded bg-forest-950/60 border border-forest-700/60 text-xs space-y-2">
                {foodStock ? (
                  <>
                    <div>
                      <span className="text-forest-400 text-[10px] block">Recorded food stock:</span>
                      <span className="font-bold text-white">
                        {foodStock.itemName} ({foodStock.availableQuantity} {foodStock.unit} at {foodStock.warehouseName})
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        dispatchTo(foodStock, 100, foodWaterNeeds[0].location.address || selectedShelter?.name)
                      }
                      disabled={!foodStock.availableQuantity}
                      className="w-full px-3 py-1.5 rounded bg-warm-600 hover:bg-warm-500 active:bg-warm-700 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch {Math.min(100, foodStock.availableQuantity)} {foodStock.unit}</span>
                    </button>
                  </>
                ) : (
                  <p className="text-forest-300">No food stock is recorded in the warehouse ledger.</p>
                )}
              </div>
            </div>
          )}

          {criticalShelters.length === 0 && foodWaterNeeds.length === 0 && (
            <div className="col-span-2 p-4 rounded bg-forest-900/60 border border-forest-700 text-xs text-forest-200">
              No critical shelter shortages or food/water field requests are currently reported.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-slate-900">Current Warehouse Stock Ledger</h3>
            <p className="text-xs text-slate-500">Inventory levels recorded by the API across staging depots</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-600">Dispatch destination</label>
            <select
              value={selectedShelter?.id ?? ''}
              onChange={event => setTargetShelterId(event.target.value)}
              disabled={dispatchableShelters.length === 0}
              className="px-2 py-1.5 border border-slate-300 rounded text-xs font-semibold disabled:bg-slate-100"
            >
              {dispatchableShelters.length === 0 ? (
                <option value="">No open shelters</option>
              ) : (
                dispatchableShelters.map(shelter => (
                  <option key={shelter.id} value={shelter.id}>
                    {shelter.name}
                  </option>
                ))
              )}
            </select>
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
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-3 text-center text-slate-500">
                    No resource inventory is available for your account.
                  </td>
                </tr>
              ) : (
                inventory.map(item => {
                  const isLow = item.availableQuantity <= item.criticalThreshold;
                  const quantity = Math.min(25, item.availableQuantity);
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
                            At or below threshold ({item.criticalThreshold})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Adequate supply
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => dispatchTo(item, 25, selectedShelter?.name)}
                          disabled={item.availableQuantity <= 0 || !selectedShelter}
                          className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-100 hover:bg-forest-800 hover:text-white disabled:hover:bg-slate-100 disabled:hover:text-slate-700 text-slate-700 transition-colors border border-slate-200 disabled:opacity-50"
                        >
                          {quantity > 0 ? `Send ${quantity} ${item.unit}` : 'Out of stock'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
