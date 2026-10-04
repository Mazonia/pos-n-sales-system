import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  ShoppingBag, 
  Boxes, 
  Landmark, 
  Wifi, 
  ShieldAlert, 
  Play, 
  Check, 
  Sliders
} from 'lucide-react';
import { 
  getNotificationPreferences, 
  saveNotificationPreferences, 
  playSoundEffect, 
  triggerVibration, 
  NotificationPreferences 
} from '../../utils/notificationSystem';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
}) => {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const updated = { ...prefs, soundEnabled: !prefs.soundEnabled };
    setPrefs(updated);
    saveNotificationPreferences(updated);
    if (updated.soundEnabled) playSoundEffect('click');
  };

  const handleToggleVibration = () => {
    const updated = { ...prefs, vibrationEnabled: !prefs.vibrationEnabled };
    setPrefs(updated);
    saveNotificationPreferences(updated);
    if (updated.vibrationEnabled) triggerVibration(30);
  };

  const handleVolumeChange = (vol: number) => {
    const updated = { ...prefs, volume: vol };
    setPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const handleChannelToggle = (channel: keyof NotificationPreferences['channels']) => {
    const updated = {
      ...prefs,
      channels: {
        ...prefs.channels,
        [channel]: !prefs.channels[channel],
      },
    };
    setPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const handleTestSound = (type: 'success' | 'cash' | 'alert' | 'error') => {
    playSoundEffect(type);
    triggerVibration(40);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden text-xs ${
          isDark ? 'bg-slate-900 border-slate-700/80 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 id="notification-settings-title" className="text-base font-bold text-white">
                Notification & Sound Engine
              </h2>
              <p className="text-[11px] text-slate-400">
                Customize audio chimes, tactile haptics, and alert channels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Master Sound & Vibration Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-3.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                prefs.soundEnabled
                  ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {prefs.soundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span className="font-bold text-xs text-white">Sound Effects</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                prefs.soundEnabled ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {prefs.soundEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleVibration}
              className={`p-3.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                prefs.vibrationEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white">Touch Haptics</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                prefs.vibrationEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {prefs.vibrationEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Volume Slider */}
          {prefs.soundEnabled && (
            <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-400" />
                  Volume Level
                </span>
                <span className="font-mono text-orange-400">{Math.round(prefs.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={prefs.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-[#FF4500] cursor-pointer"
              />
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                <span>Gentle</span>
                <span>Balanced</span>
                <span>Loud (Store Till)</span>
              </div>
            </div>
          )}

          {/* Test Audio Chimes */}
          {prefs.soundEnabled && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Synthesized Sound Previews:
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Sale Success', type: 'success' },
                  { label: 'Cash Drawer', type: 'cash' },
                  { label: 'Warning Tone', type: 'alert' },
                  { label: 'Error Tone', type: 'error' },
                ].map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => handleTestSound(s.type as any)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex flex-col items-center gap-1 transition text-slate-200 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-[9.5px] font-medium truncate w-full text-center">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notification Channels */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Notification Alert Categories:
            </div>
            <div className="space-y-2">
              {[
                {
                  key: 'salesAndPayments',
                  label: 'Sales & MoMo Payment Approvals',
                  desc: 'Chime on cash settlement, MoMo USSD approval, card swipe',
                  icon: <ShoppingBag className="w-4 h-4 text-emerald-400" />,
                },
                {
                  key: 'lowStockAlerts',
                  label: 'Low Stock & Replenishment Sentinel',
                  desc: 'Alerts when item dips below minimum safety threshold',
                  icon: <Boxes className="w-4 h-4 text-amber-400" />,
                },
                {
                  key: 'shiftAndTillWarnings',
                  label: 'Cash Drawer Limits & Till Shifts',
                  desc: 'Safe drop recommendations & end-of-shift reminders',
                  icon: <Landmark className="w-4 h-4 text-cyan-400" />,
                },
                {
                  key: 'networkAndDumsorSync',
                  label: 'Dumsor Outage & Cloud Auto-Sync',
                  desc: 'Notifies when network reconnects and syncs queued tickets',
                  icon: <Wifi className="w-4 h-4 text-purple-400" />,
                },
                {
                  key: 'systemErrorsAndSecurity',
                  label: 'Security & PIN Override Alerts',
                  desc: 'Manager PIN authorizations, tax edits, lockout notices',
                  icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
                },
              ].map((item) => {
                const isEnabled = prefs.channels[item.key as keyof NotificationPreferences['channels']];
                return (
                  <div
                    key={item.key}
                    onClick={() => handleChannelToggle(item.key as any)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                      isEnabled
                        ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.desc}</div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                      isEnabled ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-600 bg-slate-800'
                    }`}>
                      {isEnabled && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-slate-400">
          <span className="text-[11px]">Settings save instantly to this terminal</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
