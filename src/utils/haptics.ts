/**
 * Akwaaba POS & Retail OS - Touch & Haptic Feedback Engine
 * Provides physical haptic vibration and audio feedback for touchscreens, keypads, and barcodes.
 */

class SoundSynthesizer {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem('akwaaba_sound_feedback');
      if (saved !== null) {
        this.soundEnabled = saved === 'true';
      }
    } catch (e) {
      // Ignore localStorage restrictions
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('akwaaba_sound_feedback', String(enabled));
    } catch (e) {}
  }

  /**
   * Subtle click / tap sound
   */
  public playClick() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  }

  /**
   * Cash register / checkout success chime
   */
  public playSuccess() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(523.25, 0, 0.08); // C5
      playTone(659.25, 0.07, 0.08); // E5
      playTone(783.99, 0.14, 0.18); // G5
    } catch (e) {}
  }

  /**
   * Error or alert tone
   */
  public playError() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  }
}

export const sounds = new SoundSynthesizer();

export type HapticType = 'tap' | 'keypad' | 'success' | 'warning' | 'error' | 'add';

/**
 * Triggers physical vibration on supported mobile devices and touch displays
 */
export function triggerHaptic(type: HapticType = 'tap') {
  // Sound feedback
  if (type === 'success') {
    sounds.playSuccess();
  } else if (type === 'error') {
    sounds.playError();
  } else {
    sounds.playClick();
  }

  // Mobile vibration feedback
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'tap':
          navigator.vibrate(8);
          break;
        case 'keypad':
          navigator.vibrate(12);
          break;
        case 'add':
          navigator.vibrate([10, 30, 10]);
          break;
        case 'success':
          navigator.vibrate([15, 40, 20]);
          break;
        case 'warning':
          navigator.vibrate([25, 40, 25]);
          break;
        case 'error':
          navigator.vibrate([40, 60, 40]);
          break;
      }
    } catch (e) {
      // Ignore vibration permissions or unsupported hardware
    }
  }
}
