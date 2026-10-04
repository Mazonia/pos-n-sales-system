import React, { useState } from 'react';
import { usePwaInstall } from './usePwaInstall';
import { triggerHaptic } from '../../utils/haptics';
import { notify } from '../../utils/notificationSystem';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  WifiOff,
  Zap,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface PwaInstallBannerProps {
  isDark: boolean;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ isDark }) => {
  const { isInstallable, isInstalled, isIOS, isOffline, install } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('akwaaba_pwa_banner_dismissed') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  // If already installed as standalone PWA or user dismissed this session
  if (isInstalled || isDismissed) {
    // If offline, still show a compact offline status indicator
    if (isOffline) {
      return (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-500">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-semibold">Offline Mode Active:</span>
            <span>All sales, inventory deductions, and shifts are operating locally via Dexie IndexedDB.</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 font-bold">
            ZERO INTERNET REQUIRED
          </span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    triggerHaptic('tap');
    setIsInstalling(true);
    const success = await install();
    setIsInstalling(false);
    if (success) {
      triggerHaptic('success');
    }
  };

  const handleDismiss = () => {
    triggerHaptic('tap');
    setIsDismissed(true);
    try {
      localStorage.setItem('akwaaba_pwa_banner_dismissed', 'true');
    } catch (e) {}
  };

  return (
    <>
      {/* PWA INSTALL BANNER - Sleek, Unobtrusive */}
      <div className={`border-b px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 relative transition-colors ${
        isDark
          ? 'bg-[#1A1C22] border-[#282B34] text-stone-100'
          : 'bg-white border-slate-300 text-slate-900 shadow-xs'
      }`}>
        {/* Left: App Identity & Offline Capability Details */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black text-xs shadow-md shrink-0">
            AK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-extrabold text-xs tracking-tight flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Install Akwaaba POS for Offline Operation
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                <span>OFFLINE-FIRST PWA</span>
              </span>
              {isOffline && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" />
                  <span>OFFLINE</span>
                </span>
              )}
            </div>
            <p className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-slate-600 font-medium'} mt-0.5`}>
              Installs to home screen with standalone window, barcode scanner acceleration, and complete zero-network reliability.
            </p>
          </div>
        </div>

        {/* Right: Install Action and Dismiss */}
        <div className="flex items-center gap-2">
          {/* Chromium / Android / Desktop Install */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 touch-manipulation cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
            </button>
          )}

          {/* iOS Safari Guide Button */}
          {isIOS && (
            <button
              onClick={() => {
                triggerHaptic('tap');
                setShowIOSGuide(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 touch-manipulation cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Add to Home Screen</span>
            </button>
          )}

          {/* Fallback Install / Status info if neither prompt nor iOS */}
          {!isInstallable && !isIOS && (
            <button
              onClick={() => {
                triggerHaptic('tap');
                notify.info('PWA Installation Ready', 'Akwaaba POS is equipped with an active Service Worker! To install on your desktop or mobile browser, look for the install icon in your address bar or browser menu.');
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 touch-manipulation ${
                isDark ? 'border-[#282B34] text-stone-300 hover:bg-[#20232B]' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 shadow-2xs'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
              <span>PWA Ready</span>
            </button>
          )}

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className={`p-1.5 rounded-xl transition touch-manipulation ${
              isDark ? 'text-stone-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Dismiss banner for this session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS SAFARI STEP-BY-STEP INSTALLATION GUIDE MODAL */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-[#1A1C22] border-[#282B34] text-white' : 'bg-[#EBEEF2] border-slate-300 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#282B34]/40' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Install on iPhone / iPad</span>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className={`transition ${isDark ? 'text-stone-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-slate-600'} leading-relaxed`}>
              Install <strong>Akwaaba POS</strong> as a standalone application on your iOS device for full-screen checkout and offline resilience:
            </p>

            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">1. Tap Safari Share Button</div>
                  <div className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-slate-600'} mt-0.5`}>
                    Tap the square share button with an arrow pointing up at the bottom of Safari.
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                isDark ? 'bg-[#141519] border-[#282B34]' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                <div className={`p-1.5 rounded-xl shrink-0 ${isDark ? 'bg-stone-500/20 text-stone-300' : 'bg-slate-200 text-slate-700'}`}>
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">2. Select "Add to Home Screen"</div>
                  <div className={`text-[11px] ${isDark ? 'text-stone-400' : 'text-slate-600'} mt-0.5`}>
                    Scroll down the options list and select <strong>Add to Home Screen</strong>.
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                isDark ? 'bg-[#090B0E] border-[#242D37]' : 'bg-white border-slate-300 shadow-2xs'
              }`}>
                <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">3. Launch Standalone App</div>
                  <div className={`text-[11px] ${isDark ? 'text-[#8A99A8]' : 'text-slate-600'} mt-0.5`}>
                    Open from your home screen. Full offline till, barcode scanner, and tax returns work without cellular data.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('tap');
                setShowIOSGuide(false);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Compact Navbar Install Button that remains visible in header controls
 */
export const PwaInstallNavbarButton: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePwaInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={() => {
          triggerHaptic('tap');
          install();
        }}
        className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 touch-manipulation cursor-pointer"
        title="Install POS as desktop or mobile application"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <button
        onClick={() => {
          triggerHaptic('tap');
          setShowIOSModal(true);
        }}
        className="px-2 py-1 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1 transition active:scale-95 touch-manipulation cursor-pointer"
        title="Add to iPhone Home Screen"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">iOS App</span>
      </button>
    );
  }

  return null;
};
