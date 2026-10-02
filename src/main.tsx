import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for zero-internet offline caching
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[Akwaaba PWA] New version available.');
    },
    onOfflineReady() {
      console.log('[Akwaaba PWA] Application cached and ready for offline operation.');
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
