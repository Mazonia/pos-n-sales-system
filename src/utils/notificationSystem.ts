/**
 * Akwaaba POS & Retail OS - Universal Custom Notification & Haptics Engine
 * Provides synthesized Web Audio sound effects, custom vibration profiles,
 * and high-fidelity custom toasts across Web, Windows, Mac, Android, and iPad.
 */

export interface NotificationPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number; // 0.0 to 1.0
  channels: {
    salesAndPayments: boolean;
    lowStockAlerts: boolean;
    shiftAndTillWarnings: boolean;
    networkAndDumsorSync: boolean;
    systemErrorsAndSecurity: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  volume: 0.7,
  channels: {
    salesAndPayments: true,
    lowStockAlerts: true,
    shiftAndTillWarnings: true,
    networkAndDumsorSync: true,
    systemErrorsAndSecurity: true,
  },
};

const STORAGE_KEY = 'akwaaba_notification_settings';

export const getNotificationPreferences = (): NotificationPreferences => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PREFERENCES;
  }
};

export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent('notificationPreferencesUpdated', { detail: prefs }));
  } catch (e) {
    console.warn('[Notification System] Failed to persist preferences', e);
  }
};

// -------------------------------------------------------------
// Real-time Web Audio API Synthesizer (Zero External Audio Files)
// -------------------------------------------------------------
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SoundEffectType = 'success' | 'cash' | 'alert' | 'error' | 'click';

export const playSoundEffect = (type: SoundEffectType): void => {
  const prefs = getNotificationPreferences();
  if (!prefs.soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(prefs.volume * 0.25, now);
    gainNode.connect(ctx.destination);

    if (type === 'success') {
      // Pleasant rising major chord chime (C5 -> E5 -> G5)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        osc.connect(gainNode);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    } else if (type === 'cash') {
      // Register bell chime (Dual harmonic pulse)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc2.frequency.setValueAtTime(1318.51, now + 0.05); // E6
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc1.start(now);
      osc2.start(now + 0.05);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.45);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    } else if (type === 'alert') {
      // Warm double pulse for warnings / till thresholds
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.28);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    } else if (type === 'error') {
      // Subtle low-tone descending notice
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.26);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    }
  } catch (err) {
    // Audio contexts can be blocked by browser autoplay policy until first click
  }
};

// -------------------------------------------------------------
// Haptic Vibrations for Android, iPad, and Touch Screens
// -------------------------------------------------------------
export const triggerVibration = (pattern: number | number[] = 25): void => {
  const prefs = getNotificationPreferences();
  if (!prefs.vibrationEnabled) return;

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration failures on unsupported devices
    }
  }
};

// -------------------------------------------------------------
// Custom Toast Event Bus
// -------------------------------------------------------------
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'offline';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const notify = {
  success: (title: string, message: string = '', options: { sound?: boolean; duration?: number } = {}) => {
    dispatchToast({
      id: 'toast-' + Math.random().toString(36).substring(2, 9),
      type: 'success',
      title,
      message,
      duration: options.duration || 4000,
    });
    if (options.sound !== false) {
      playSoundEffect('success');
      triggerVibration(30);
    }
  },

  cash: (title: string, message: string = '') => {
    dispatchToast({
      id: 'toast-' + Math.random().toString(36).substring(2, 9),
      type: 'success',
      title,
      message,
      duration: 5000,
    });
    playSoundEffect('cash');
    triggerVibration([40, 60, 40]);
  },

  error: (title: string, message: string = '', options: { duration?: number } = {}) => {
    dispatchToast({
      id: 'toast-' + Math.random().toString(36).substring(2, 9),
      type: 'error',
      title,
      message,
      duration: options.duration || 5500,
    });
    playSoundEffect('error');
    triggerVibration([50, 40, 50]);
  },

  warning: (title: string, message: string = '', options: { duration?: number } = {}) => {
    dispatchToast({
      id: 'toast-' + Math.random().toString(36).substring(2, 9),
      type: 'warning',
      title,
      message,
      duration: options.duration || 4500,
    });
    playSoundEffect('alert');
    triggerVibration(45);
  },

  info: (title: string, message: string = '', options: { duration?: number } = {}) => {
    dispatchToast({
      id: 'toast-' + Math.random().toString(36).substring(2, 9),
      type: 'info',
      title,
      message,
      duration: options.duration || 4000,
    });
    playSoundEffect('click');
  },

  offline: (title: string, message: string = '') => {
    dispatchToast({
      id: 'toast-' + Math.random().toString(36).substring(2, 9),
      type: 'offline',
      title,
      message,
      duration: 6000,
    });
    playSoundEffect('alert');
    triggerVibration([30, 30, 30]);
  },
};

function dispatchToast(toast: ToastMessage) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('akwaaba:toast', { detail: toast }));
  }
}

// -------------------------------------------------------------
// Custom Modal Dialog Engine (Replaces native window.confirm & alert)
// -------------------------------------------------------------
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const showConfirmModal = (options: ConfirmDialogOptions): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('akwaaba:confirm-dialog', { detail: options }));
  }
};
