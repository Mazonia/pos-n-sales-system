import React from 'react';
import { 
  ShoppingBag, 
  BookOpen, 
  Boxes, 
  Landmark, 
  Database, 
  Bell, 
  Download, 
  ShieldCheck, 
  Menu, 
  X,
  Smartphone,
  Tablet
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface TabletTouchNavigationProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  onOpenBackup: () => void;
  onOpenNotifications: () => void;
  onOpenDownloads: () => void;
  isDark?: boolean;
}

export const TabletTouchNavigation: React.FC<TabletTouchNavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenBackup,
  onOpenNotifications,
  onOpenDownloads,
  isDark = true,
}) => {
  const [toolsDrawerOpen, setToolsDrawerOpen] = React.useState(false);

  const tabs = [
    { id: 'POS', label: 'Till POS', icon: ShoppingBag },
    { id: 'BISA', label: 'Bisa Book', icon: BookOpen },
    { id: 'INVENTORY', label: 'Stock', icon: Boxes },
    { id: 'FINANCIALS', label: 'Metrics', icon: Landmark },
  ];

  return (
    <>
      {/* Floating Bottom Navigation Bar for Tablets & Mobile */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className={`p-1.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-1.5 ${
          isDark 
            ? 'bg-slate-900/95 border-slate-700/80 text-white' 
            : 'bg-white/95 border-slate-300 text-slate-900 shadow-xl'
        }`}>
          {/* Main POS Navigation Tabs */}
          <div className="flex items-center gap-1 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onTabChange(tab.id);
                  }}
                  className={`flex-1 py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation cursor-pointer ${
                    isActive
                      ? 'bg-[#FF4500] text-white font-bold shadow-md shadow-orange-500/25'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] tracking-tight leading-none">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tools / Quick Drawer Trigger */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              setToolsDrawerOpen(!toolsDrawerOpen);
            }}
            className={`p-2.5 rounded-xl border flex items-center justify-center transition active:scale-95 touch-manipulation cursor-pointer ${
              toolsDrawerOpen
                ? 'bg-orange-500 text-white border-orange-500'
                : isDark
                ? 'border-slate-700 bg-slate-800/80 text-orange-400'
                : 'border-slate-300 bg-slate-100 text-orange-600'
            }`}
            aria-label="Open Tablet Quick Tools"
          >
            {toolsDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Slide-Up Bottom Drawer for Quick Actions on Tablets */}
      {toolsDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setToolsDrawerOpen(false)} 
          />
          <div className={`relative p-5 rounded-t-3xl border-t shadow-2xl space-y-3 animate-slide-in-bottom ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2" />
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Tablet Quick Actions &bull; Built by Mazonia
              </span>
              <button 
                onClick={() => setToolsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setToolsDrawerOpen(false);
                  onOpenBackup();
                }}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 flex flex-col items-center gap-1.5 transition text-center cursor-pointer active:scale-95"
              >
                <Database className="w-5 h-5 text-orange-400" />
                <span className="text-[11px] font-bold text-white">Backups</span>
                <span className="text-[9px] text-slate-400">Auto &amp; Export</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setToolsDrawerOpen(false);
                  onOpenNotifications();
                }}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 flex flex-col items-center gap-1.5 transition text-center cursor-pointer active:scale-95"
              >
                <Bell className="w-5 h-5 text-emerald-400" />
                <span className="text-[11px] font-bold text-white">Chimes</span>
                <span className="text-[9px] text-slate-400">Audio &amp; Haptics</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setToolsDrawerOpen(false);
                  onOpenDownloads();
                }}
                className="p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 flex flex-col items-center gap-1.5 transition text-center cursor-pointer active:scale-95"
              >
                <Download className="w-5 h-5 text-cyan-400" />
                <span className="text-[11px] font-bold text-white">Installers</span>
                <span className="text-[9px] text-slate-400">.exe / .dmg / APK</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
