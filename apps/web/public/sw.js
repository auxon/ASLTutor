/* signflow-sw-kill
 * Old tabs registered this unhashed URL. Installing this worker drops the
 * stale precache and reloads so the app can register sw-v5.js instead.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      await Promise.all(
        clients.map((client) =>
          typeof client.navigate === 'function' ? client.navigate(client.url) : undefined,
        ),
      );
    })(),
  );
});
