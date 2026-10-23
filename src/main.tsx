import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { capturePrerenderedDiagrams } from './content-engine/mermaid-prerendered';
import './index.css';
import { reportWebVitals } from './performance/reportWebVitals';
import { preloadRoute } from './routing/preload-route';

// Before createRoot: React discards #root's children on its first render, and the prerendered
// mermaid SVG lives in them. See src/content-engine/mermaid-prerendered.ts.
capturePrerenderedDiagrams();

/*
 * The prerendered page in #root is what the reader sees from the first paint. createRoot replaces
 * it on its first commit (hydrateRoot is not an option: the snapshot is the DOM after effects ran,
 * which a first client render cannot match - React #418/#423 on every route). So the first commit
 * waits until the route's code and data are loaded: it then renders the same page, complete, and
 * the swap is invisible. Rendering before that committed a "Loading…" state over real content,
 * which is why the page used to be hidden until React was ready - 1.5-3.4s of blank screen on a
 * throttled phone, for HTML that had already arrived.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const { pathname } = window.location;
const routePath = (pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || '/';

void preloadRoute(routePath).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});

reportWebVitals();
