import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  server: {
    allowedHosts: true
  },
  define: {
    global: 'window',
    // Aus package.json, nicht noch einmal hier hingeschrieben: die Nummer
    // stand vorher an drei Stellen und musste von Hand synchron gehalten
    // werden — beim Redesign blieben prompt alle drei auf 1.4.0 stehen.
    __APP_VERSION__: JSON.stringify(`v${pkg.version}`),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Dart Counter Pro',
        short_name: 'Dart Counter Pro',
        theme_color: '#0F1613',
        background_color: '#0F1613',
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
         * so they stay cached across deploys. Lazily loaded libraries (html2canvas)
         * are deliberately left unnamed: naming a chunk for one made rolldown park
         * Vite's preload helper inside it, and the entry's import of that helper
         * pulled the whole library into the first paint.
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          // Matched on the package directory rather than anywhere in the path:
          // `id.includes('react')` also caught unrelated packages with "react"
          // in their name and hauled them into the eager chunk.
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
