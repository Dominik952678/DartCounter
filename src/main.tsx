import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { migrateStorage } from './utils/storage'

/**
 * Fonts, self-hosted, latin subsets only.
 *
 * They came from the Google Fonts CDN, which hands the visitor's IP address to
 * a third party — in Germany a documented legal risk — and costs a DNS lookup
 * plus a render-blocking round trip before the first paint. Only the weights
 * the stylesheets actually ask for are bundled.
 *
 * Caprasimo hat nur einen Schnitt; es ist eine Display-Schrift und trägt
 * ausschließlich Überschriften (--font-heading). Figtree hat Inter als
 * Fließtext ersetzt und liefert 400/500/600 — 700 nur, weil die Legende der
 * Dartboard-Heatmap 800 verlangt und das Widget nach DESIGN.md §7 unangetastet
 * bleibt; der Browser rundet dort auf den nächsten vorhandenen Schnitt.
 * Orbitron und Share Tech Mono gehören den zwei Retro-Themes.
 */
import '@fontsource/caprasimo/latin-400.css'
import '@fontsource/figtree/latin-400.css'
import '@fontsource/figtree/latin-500.css'
import '@fontsource/figtree/latin-600.css'
import '@fontsource/figtree/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import '@fontsource/orbitron/latin-400.css'
import '@fontsource/orbitron/latin-700.css'
import '@fontsource/orbitron/latin-900.css'
import '@fontsource/share-tech-mono/latin-400.css'
import './index.css'

// Before anything reads a stored value.
migrateStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
