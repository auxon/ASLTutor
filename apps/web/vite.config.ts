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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,wasm}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/hand_landmarker\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-model-cache',
              expiration: {
                maxEntries: 4,
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
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
