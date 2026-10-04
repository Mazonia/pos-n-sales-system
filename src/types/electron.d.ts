export interface ElectronAPI {
  isElectron: boolean;
  platform: 'win32' | 'darwin' | 'linux' | string;
  version: string;
  appVersion: string;
  printReceipt: (options?: { silent?: boolean; printerName?: string }) => Promise<{ success: boolean; error?: string }>;
  toggleKiosk: () => Promise<boolean>;
  isKiosk: () => Promise<boolean>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  openExternal: (url: string) => Promise<void>;
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    nodeVersion: string;
    electronVersion: string;
    chromeVersion: string;
    appName: string;
    appVersion: string;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
