import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    vueDevTools(),
    VitePWA({
      // 'prompt' never force-reloads: a new build is only applied when the
      // user taps "Reload" in the update toast — safe during a live game.
      registerType: 'prompt',
      // Static assets (committed under public/) that should be precached too.
      includeAssets: ['favicon.ico', 'logo-mark.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Svey',
        short_name: 'Svey',
        description: 'Track games, decks and stats for your Magic: The Gathering Commander playgroup.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#06070D',
        background_color: '#06070D',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell + brand fonts (fontsource ships woff2, which
        // is not in Workbox's default glob) so the shell renders offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // SPA fallback, but never let the SW answer API/upload requests.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
      },
      // Keep the service worker out of `vite dev`; verify via `vite preview`.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
