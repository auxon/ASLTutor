const KILL_SWITCH = `/* signflow-sw-kill */
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
`;

export default {
  async fetch() {
    return new Response(KILL_SWITCH, {
      status: 200,
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store, max-age=0, must-revalidate',
        'cdn-cache-control': 'no-store',
        'cloudflare-cdn-cache-control': 'no-store',
        'x-asltutor-sw': 'kill-v6',
      },
    });
  },
};
