import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { capturePrerenderedDiagrams } from './content-engine/mermaid-prerendered';
import './index.css';
import { reportWebVitals } from './performance/reportWebVitals';

// Before createRoot: React discards #root's children on its first render, and the prerendered
// mermaid SVG lives in them. See src/content-engine/mermaid-prerendered.ts.
capturePrerenderedDiagrams();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

reportWebVitals();
