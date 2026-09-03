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
 */
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-800.css'
import '@fontsource/inter/latin-900.css'
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
