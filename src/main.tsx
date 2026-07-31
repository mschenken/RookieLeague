import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// HashRouter, not BrowserRouter: GitHub Pages serves static files only, so a hard
// refresh on /stats/championships would 404. The hash keeps deep links working
// without the 404.html redirect hack.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
