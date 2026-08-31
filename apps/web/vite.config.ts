import fs from 'node:fs';
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
      filename: 'sw-v5.js',
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
        cacheId: 'signflow-asl-v5',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        globIgnores: ['**/sw.js'],
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/ASLTutor\/api\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mediapipe-wasm-v3',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    }),
    {
      name: 'signflow-sw-reload-clients',
      apply: 'build',
      enforce: 'post',
      closeBundle() {
        const swPath = path.resolve(__dirname, 'dist/sw-v5.js');
        if (!fs.existsSync(swPath)) return;
        const src = fs.readFileSync(swPath, 'utf8');
        if (src.includes('signflow-reload-clients')) return;
        fs.appendFileSync(
          swPath,
          '\n/* signflow-reload-clients */\nself.addEventListener("activate",event=>{event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:!0}).then(cs=>Promise.all(cs.map(c=>typeof c.navigate=="function"?c.navigate(c.url):undefined))))});\n',
        );
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/ASLTutor/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ASLTutor/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
