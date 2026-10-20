import React from 'react';
import { 
  Activity, 
  Map, 
  Radio, 
  Package, 
  Users, 
  HeartHandshake, 
  ShieldCheck, 
  PhoneCall, 
  AlertCircle, 
  RotateCcw,
  Menu,
  X
} from 'lucide-react';

export type ActiveTab = 'map' | 'responder' | 'ngo' | 'volunteer' | 'donor' | 'admin';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSOS: () => void;
  criticalCount: number;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenSOS,
  criticalCount,
  onResetData
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'map' as ActiveTab, label: 'Live Map', icon: Map, badge: criticalCount > 0 ? `${criticalCount} SOS` : undefined },
    { id: 'responder' as ActiveTab, label: 'Responder Command', icon: Radio },
    { id: 'ngo' as ActiveTab, label: 'NGO Logistics', icon: Package },
    { id: 'volunteer' as ActiveTab, label: 'Volunteer Force', icon: Users },
    { id: 'donor' as ActiveTab, label: 'Donor Tracking', icon: HeartHandshake },
    { id: 'admin' as ActiveTab, label: 'Admin Ops', icon: ShieldCheck },
  ];

  return (
    <header className="bg-forest-950 text-white border-b border-forest-900 sticky top-0 z-[1000] shadow-md select-none">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Situation Tag */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onTabChange('map')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded bg-forest-800 border border-forest-700 flex items-center justify-center text-warm-400 font-black text-lg shadow-sm group-hover:bg-forest-700 transition-colors">
              <span className="text-white">R</span>
              <span className="text-warm-500">S</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-base tracking-tight text-white">ReliefSync</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warm-500/20 text-warm-400 border border-warm-500/30 font-semibold uppercase">
                  Live Ops
                </span>
              </div>
              <span className="text-[10px] text-forest-300 font-medium tracking-wide">
                Unified Disaster Response
              </span>
            </div>
          </div>

          {/* Quick situation pill */}
          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-forest-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-forest-200">Yamuna Flood Stage 4</span>
            <span className="text-forest-400 font-mono">|</span>
            <span className="text-forest-300 font-mono">Water: 208.66m</span>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-forest-800 text-white shadow-inner border border-forest-700'
                    : 'text-forest-200 hover:text-white hover:bg-forest-900/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-warm-400' : 'text-forest-300'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Controls & Emergency SOS Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Call Helpline */}
          <a
            href="tel:112"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-forest-900 border border-forest-800 text-forest-200 hover:text-white hover:border-forest-700 transition-colors"
            title="Official National Disaster Helpline"
          >
            <PhoneCall className="w-3.5 h-3.5 text-warm-400" />
            <span>Call 112</span>
          </a>

          {/* Reset Demo Data Button (Hackathon convenience) */}
          <button
            onClick={onResetData}
            title="Reset Mock Disaster Data to Initial State"
            className="p-2 rounded text-forest-300 hover:text-white hover:bg-forest-900 border border-forest-900 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* THE PROMINENT EMERGENCY SOS TRIGGER */}
          <button
            onClick={onOpenSOS}
            className="flex items-center gap-2 px-4 py-2 rounded font-bold text-xs bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-lg shadow-red-950/50 border border-red-400 transition-transform active:scale-95 group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="tracking-wider uppercase">Emergency SOS</span>
          </button>

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded text-forest-200 hover:text-white hover:bg-forest-900"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-forest-900 border-t border-forest-800 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-sm font-medium ${
                  isActive ? 'bg-forest-800 text-white font-bold' : 'text-forest-200 hover:bg-forest-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-warm-400' : 'text-forest-300'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-red-600 text-white font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
