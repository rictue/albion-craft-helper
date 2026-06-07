import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Recover from "deploy happened while this tab was open" white screens.
// When a new build ships, the old lazy-route chunks are deleted; a tab still
// running the old index.html then 404s on its next dynamic import. Vite fires
// `vite:preloadError` for exactly this — reload once to pull the fresh HTML +
// asset graph. The 10s guard stops an infinite reload loop if the chunk is
// genuinely gone for another reason.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'ac-preload-reload-at';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
