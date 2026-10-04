/**
 * Akwaaba POS Platform Detection & Hardware Interop Engine
 * Detects whether the app is executing inside:
 * - Windows Desktop (.exe) via Electron
 * - macOS Desktop (.dmg / .app) via Electron
 * - Android Tablet via Capacitor
 * - Apple iPad / iOS via Capacitor
 * - Web Browser / PWA
 */

export type PlatformType = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'web';

export interface PlatformDetails {
  type: PlatformType;
  name: string;
  isNative: boolean;
  isDesktop: boolean;
  isTabletOrMobile: boolean;
  isPWA: boolean;
  hasHardwarePrinting: boolean;
}

export const detectPlatform = (): PlatformDetails => {
  // Check if running inside Electron desktop container
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    const p = window.electronAPI.platform;
    if (p === 'win32') {
      return {
        type: 'windows',
        name: 'Windows Desktop (.exe)',
        isNative: true,
        isDesktop: true,
        isTabletOrMobile: false,
        isPWA: false,
        hasHardwarePrinting: true,
      };
    } else if (p === 'darwin') {
      return {
        type: 'mac',
        name: 'macOS Desktop (.dmg)',
        isNative: true,
        isDesktop: true,
        isTabletOrMobile: false,
        isPWA: false,
        hasHardwarePrinting: true,
      };
    } else {
      return {
        type: 'linux',
        name: 'Linux Desktop',
        isNative: true,
        isDesktop: true,
        isTabletOrMobile: false,
        isPWA: false,
        hasHardwarePrinting: true,
      };
    }
  }

  // Check if running inside Capacitor container (Android / iOS)
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
    const capPlatform = (window as any).Capacitor.getPlatform();
    if (capPlatform === 'android') {
      return {
        type: 'android',
        name: 'Android Tablet / POS',
        isNative: true,
        isDesktop: false,
        isTabletOrMobile: true,
        isPWA: false,
        hasHardwarePrinting: true,
      };
    } else if (capPlatform === 'ios') {
      return {
        type: 'ios',
        name: 'Apple iPad / iOS',
        isNative: true,
        isDesktop: false,
        isTabletOrMobile: true,
        isPWA: false,
        hasHardwarePrinting: true,
      };
    }
  }

  // Check if running as PWA (standalone browser window)
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  let pType: PlatformType = 'web';
  if (isIPad) pType = 'ios';
  else if (isAndroid) pType = 'android';
  else if (/Win/i.test(ua)) pType = 'windows';
  else if (/Mac/i.test(ua)) pType = 'mac';

  return {
    type: pType,
    name: isStandalone ? 'Web PWA (Installed)' : 'Web Browser',
    isNative: false,
    isDesktop: !isIPad && !isAndroid,
    isTabletOrMobile: isIPad || isAndroid,
    isPWA: isStandalone,
    hasHardwarePrinting: false,
  };
};

/**
 * Universal Print Adapter:
 * Uses high-speed silent hardware printing in Electron desktop mode,
 * or standard system print dialog in Web/PWA mode.
 */
export const printReceiptUniversal = async (options?: { silent?: boolean; printerName?: string }): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.printReceipt) {
    try {
      const res = await window.electronAPI.printReceipt(options);
      return res.success;
    } catch (e) {
      console.warn('[Print Adapter] Electron print failed, falling back to window.print', e);
    }
  }
  
  if (typeof window !== 'undefined') {
    window.print();
    return true;
  }
  return false;
};

/**
 * POS Kiosk / Lock Till Manager
 */
export const toggleKioskUniversal = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.toggleKiosk) {
    return await window.electronAPI.toggleKiosk();
  }
  
  // Web Fullscreen fallback
  if (typeof document !== 'undefined') {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      return true;
    } else {
      await document.exitFullscreen().catch(() => {});
      return false;
    }
  }
  return false;
};

/**
 * GitHub Release URLs and download metadata for end-users
 */
export const GITHUB_REPO_URL = 'https://github.com/Mazonia/pos-n-sales-system';

export interface PlatformDownload {
  platform: PlatformType;
  title: string;
  subtitle: string;
  badge: string;
  filename: string;
  url: string;
  icon: string;
  features: string[];
}

export const getPlatformDownloads = (version: string = '1.0.0'): PlatformDownload[] => [
  {
    platform: 'windows',
    title: 'Windows Desktop (.exe)',
    subtitle: 'Windows 10, 11 (64-bit)',
    badge: 'Recommended for PC Tills',
    filename: `AkwaabaPOS-Setup-${version}.exe`,
    url: `${GITHUB_REPO_URL}/releases/latest/download/AkwaabaPOS-Setup-${version}.exe`,
    icon: 'Monitor',
    features: [
      'Native USB / COM Thermal Receipt Printer (ESC/POS)',
      'Cash Drawer Kick Pulse Trigger',
      'F11 Kiosk Lock (Prevents Cashiers Leaving Till)',
      'Full Offline SQLite & IndexedDB Storage',
      'Hardware Barcode Scanner Instant Feed',
    ],
  },
  {
    platform: 'mac',
    title: 'macOS Desktop (.dmg)',
    subtitle: 'Apple Silicon (M1/M2/M3/M4) & Intel',
    badge: 'Universal Binary',
    filename: `AkwaabaPOS-${version}.dmg`,
    url: `${GITHUB_REPO_URL}/releases/latest/download/AkwaabaPOS-${version}.dmg`,
    icon: 'Laptop',
    features: [
      'Retina HiDPI Display Optimization',
      'Silent Printing to Network / CUPS Receipt Printers',
      'Keyboard Hotkey Quick Checkout (Ctrl+Space)',
      'Offline-First Data Storage',
    ],
  },
  {
    platform: 'android',
    title: 'Android Tablet (.apk)',
    subtitle: 'Android 8.0+ (Oreo to Android 15)',
    badge: 'Optimized for 10"-12" Tablets',
    filename: `AkwaabaPOS-Tablet-${version}.apk`,
    url: `${GITHUB_REPO_URL}/releases/latest/download/AkwaabaPOS-Tablet-${version}.apk`,
    icon: 'Tablet',
    features: [
      'Bluetooth / Wi-Fi Portable Thermal Receipt Printing',
      'Camera Barcode / QR Code Scanner',
      'Touch-Optimized Big Button Till Interface',
      'Offline Dumsor Resilience with Auto-Sync',
      'Direct APK Sideload (No Google Play required)',
    ],
  },
  {
    platform: 'ios',
    title: 'Apple iPad (iPadOS)',
    subtitle: 'iPadOS 14+ (iPad, iPad Air, iPad Pro)',
    badge: 'Retina Touch POS',
    filename: 'Xcode / Enterprise App Store',
    url: `${GITHUB_REPO_URL}/releases`,
    icon: 'TabletSmartphone',
    features: [
      'Full iPad Split-View & Slide-Over Multitasking',
      'High-Speed Apple Touch Engine (60/120Hz ProMotion)',
      'AirPrint & Bluetooth ESC/POS Receipt Support',
      'Camera Barcode Scanning',
    ],
  },
  {
    platform: 'web',
    title: 'Web App / PWA',
    subtitle: 'Chrome, Edge, Safari, Firefox',
    badge: 'Instant Zero-Install',
    filename: 'Run in Browser or Install as PWA',
    url: 'https://mazonia.github.io/pos-n-sales-system/',
    icon: 'Globe',
    features: [
      'Runs immediately on any device with a modern browser',
      'PWA Installable to Home Screen / Desktop icon',
      'Full Offline Mode via Service Worker and Dexie.js',
      'GRA VSDC QR Compliance',
    ],
  },
];
