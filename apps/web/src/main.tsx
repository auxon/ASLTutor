import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

/** Bump this when a stale PWA cache must be dropped (iOS Chrome keeps old SW). */
const CACHE_BUST_KEY = 'signflow-sw-v5';

async function resetStaleCaches(): Promise<boolean> {
  try {
    if (localStorage.getItem(CACHE_BUST_KEY) === '1') return false;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    localStorage.setItem(CACHE_BUST_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void (async () => {
      if (await resetStaleCaches()) {
        window.location.reload();
        return;
      }
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw-v5.js`,
        { scope: import.meta.env.BASE_URL, updateViaCache: 'none' },
      );
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      void registration.update();
    })();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
