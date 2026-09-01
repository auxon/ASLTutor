import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASL_BASE_PATH = '/ASLTutor/';

export default defineConfig({
  base: ASL_BASE_PATH,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SignFlow ASL',
        short_name: 'SignFlow',
        description: 'Learn American Sign Language with interactive 3D hands',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: ASL_BASE_PATH,
        scope: ASL_BASE_PATH,
        icons: [
          {
            src: `${ASL_BASE_PATH}pwa-192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${ASL_BASE_PATH}pwa-512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Bump with SW_RELEASE in main.tsx so old precaches are discarded.
        cacheId: 'signflow-asl-talk-shell-2',
        // Do not precache multi‑MB mediapipe wasm/model — runtime cache instead.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        globIgnores: ['**/mediapipe/**'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: `${ASL_BASE_PATH}index.html`,
        navigateFallbackDenylist: [/^\/ASLTutor\/mediapipe\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/mediapipe/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-local-cache',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
