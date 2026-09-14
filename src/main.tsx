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
 * Zwei Familien mit je einer Aufgabe (DESIGN.md §2): Barlow trägt Fließ- und
 * Bedientext, Barlow Condensed jede Zahl, jede Überschrift und jeden Button.
 */
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-600.css'
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
