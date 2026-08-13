import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    allowedHosts: true
  },
  define: {
    global: 'window',
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
        icons: []
      }
    })
  ]
})
