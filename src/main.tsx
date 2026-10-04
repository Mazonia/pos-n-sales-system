import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { initGlobalEmojiSanitizer } from './utils/emojiSanitizer';

// Initialize global emoji sanitization for all input fields across the POS application
initGlobalEmojiSanitizer();

const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
if (!isElectron && 'serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Force reload to activate latest version immediately with no stale flash
      updateSW(true);
    },
    onOfflineReady() {
      console.log('[Akwaaba PWA] Application cached and ready for offline operation.');
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
