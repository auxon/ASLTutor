import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

/**
 * Register the PWA service worker and force-activate updates.
 * Without skipWaiting/clientsClaim, mobile Chrome can keep an old SW that
 * serves a broken hand-tracker build forever.
 */
async function clearStaleMediaPipeCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key === 'mediapipe-cache' || key === 'mediapipe-model-cache')
      .map((key) => caches.delete(key)),
  );
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  try {
    // Drop old CDN CacheFirst entries that could wedge tracker init.
    await clearStaleMediaPipeCaches();

    const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    });

    // Activate a waiting worker immediately.
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Reload once when the new SW takes control so we don't run mixed old/new assets.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Proactively check for updates on load.
    void reg.update();
  } catch {
    // SW registration failures should not block the app.
  }
}

void registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
