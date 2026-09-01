import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

/**
 * Bump this whenever the app shell (routes/nav) changes so returning PWA users
 * drop a stale service worker instead of keeping a pre-Talk index.html forever.
 * Without skipWaiting/clientsClaim, mobile Chrome can keep an old SW that
 * serves a broken hand-tracker (or missing /talk route) build forever.
 */
const SW_RELEASE = 'talk-shell-2026-09-01';
const SW_RELEASE_KEY = 'signflow-sw-release';

async function clearStaleMediaPipeCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key === 'mediapipe-cache' || key === 'mediapipe-model-cache')
      .map((key) => caches.delete(key)),
  );
}

async function unregisterStaleServiceWorkers(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(SW_RELEASE_KEY);
  } catch {
    previous = null;
  }
  if (previous === SW_RELEASE) return false;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const hadWorker = registrations.length > 0 || Boolean(navigator.serviceWorker.controller);
  await Promise.all(registrations.map((registration) => registration.unregister()));
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  let persisted = false;
  try {
    localStorage.setItem(SW_RELEASE_KEY, SW_RELEASE);
    persisted = true;
  } catch {
    /* private mode — skip the forced reload so we cannot loop */
  }
  return hadWorker && persisted;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  try {
    // Drop old CDN CacheFirst entries that could wedge tracker init.
    await clearStaleMediaPipeCaches();

    const purged = await unregisterStaleServiceWorkers();
    if (purged) {
      window.location.reload();
      return;
    }

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
