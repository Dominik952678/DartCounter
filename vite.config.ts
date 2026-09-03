import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    allowedHosts: true
  },
  define: {
    global: 'window',
    __APP_VERSION__: JSON.stringify('v1.4.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Dart Counter Pro',
        short_name: 'Dart Counter Pro',
        theme_color: '#1c1c1e',
        background_color: '#1c1c1e',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        /**
         * Only the libraries every screen needs are pinned to a stable chunk,
         * so they stay cached across deploys. recharts is deliberately absent:
         * naming a chunk for it made rolldown park Vite's preload helper inside
         * it, and the entry's import of that helper pulled all 400 kB of
         * charting into the first paint — the very thing the lazy stats and
         * profile routes exist to avoid. Unnamed, it rides along with them.
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          // Matched on the package directory rather than anywhere in the path:
          // `id.includes('react')` also caught recharts' react-smooth and hauled
          // it into the eager chunk.
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
        }
      }
    }
  }
})
