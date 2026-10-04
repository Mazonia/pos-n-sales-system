import React from 'react';
import { 
  ShoppingBag, 
  BookOpen, 
  Boxes, 
  Landmark, 
  Database, 
  Bell, 
  Download, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface TabletTouchNavigationProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  onOpenBackup: () => void;
  onOpenNotifications: () => void;
  onOpenDownloads: () => void;
  onOpenShowcase?: () => void;
  isDark?: boolean;
}

export const TabletTouchNavigation: React.FC<TabletTouchNavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenBackup,
  onOpenNotifications,
  onOpenDownloads,
  onOpenShowcase,
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
      {/* Floating Bottom Navigation Bar for Tablets & Mobile (Constrained & Ergonomic in Both Orientations) */}
      <div className="lg:hidden fixed bottom-3 inset-x-0 mx-auto max-w-md px-3 z-40 pointer-events-auto">
        <div className={`p-1.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-1.5 ${
          isDark 
            ? 'bg-[#16181F]/95 border-[#282B34] text-[#F4F4F6]' 
            : 'bg-white/95 border-[#CBD5E1] text-[#0F172A] shadow-xl'
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
                  className={`flex-1 py-2 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation cursor-pointer ${
                    isActive
                      ? 'bg-[#FF4500] text-white font-bold shadow-md shadow-[#FF4500]/25'
                      : isDark
                      ? 'text-[#9CA3AF] hover:text-white hover:bg-[#1A1C22]'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EBEEF2]'
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
                ? 'bg-[#FF4500] text-white border-[#FF4500]'
                : isDark
                ? 'border-[#282B34] bg-[#121316] text-[#FF4500]'
                : 'border-[#CBD5E1] bg-[#EBEEF2] text-[#FF4500]'
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
          <div className={`relative p-5 rounded-t-3xl border-t shadow-2xl space-y-3 animate-slide-in-bottom max-w-xl mx-auto w-full ${
            isDark ? 'bg-[#16181F] border-[#282B34] text-[#F4F4F6]' : 'bg-white border-[#CBD5E1] text-[#0F172A]'
          }`}>
            <div className={`w-12 h-1 rounded-full mx-auto mb-2 ${isDark ? 'bg-[#282B34]' : 'bg-[#CBD5E1]'}`} />
            
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#282B34]' : 'border-[#CBD5E1]'}`}>
              <span className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>
                Tablet Tools &bull; Engineered by Mazonia
              </span>
              <button 
                type="button"
                onClick={() => setToolsDrawerOpen(false)}
                className={`p-1 rounded-lg transition ${isDark ? 'text-[#9CA3AF] hover:text-white' : 'text-[#64748B] hover:text-black'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setToolsDrawerOpen(false);
                  onOpenBackup();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer active:scale-95 ${
                  isDark 
                    ? 'bg-[#121316] hover:bg-[#1A1C22] border-[#282B34]' 
                    : 'bg-[#EBEEF2]/60 hover:bg-[#EBEEF2] border-[#CBD5E1]'
                }`}
              >
                <Database className="w-5 h-5 text-[#FF4500]" />
                <span className="text-[11px] font-bold">Backups</span>
                <span className={`text-[9px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>Auto &amp; Export</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setToolsDrawerOpen(false);
                  onOpenNotifications();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer active:scale-95 ${
                  isDark 
                    ? 'bg-[#121316] hover:bg-[#1A1C22] border-[#282B34]' 
                    : 'bg-[#EBEEF2]/60 hover:bg-[#EBEEF2] border-[#CBD5E1]'
                }`}
              >
                <Bell className="w-5 h-5 text-[#00CED1]" />
                <span className="text-[11px] font-bold">Chimes</span>
                <span className={`text-[9px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>Audio &amp; Haptics</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setToolsDrawerOpen(false);
                  onOpenDownloads();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer active:scale-95 ${
                  isDark 
                    ? 'bg-[#121316] hover:bg-[#1A1C22] border-[#282B34]' 
                    : 'bg-[#EBEEF2]/60 hover:bg-[#EBEEF2] border-[#CBD5E1]'
                }`}
              >
                <Download className="w-5 h-5 text-[#FF4500]" />
                <span className="text-[11px] font-bold">Installers</span>
                <span className={`text-[9px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>.exe / .dmg / APK</span>
              </button>

              {onOpenShowcase && (
                <button
                  type="button"
                  onClick={() => {
                    setToolsDrawerOpen(false);
                    onOpenShowcase();
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer active:scale-95 ${
                    isDark 
                      ? 'bg-[#121316] hover:bg-[#1A1C22] border-[#282B34]' 
                      : 'bg-[#EBEEF2]/60 hover:bg-[#EBEEF2] border-[#CBD5E1]'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-[#FF5722]" />
                  <span className="text-[11px] font-bold">Showcase</span>
                  <span className={`text-[9px] ${isDark ? 'text-[#9CA3AF]' : 'text-[#64748B]'}`}>Product Site</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
