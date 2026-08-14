/**
 * Shared mermaid.js lifecycle helper. Previously duplicated with two slightly
 * different configs and two different error-rendering approaches in
 * MermaidDiagram.tsx and ContentDetailPage.tsx. mermaid.js is only ever
 * dynamically imported here, so pages without diagrams never pay for it.
 */

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;
let idCounter = 0;

async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        // Matches Tailwind's default font-sans stack. "Inter" was previously
        // listed first here but is never loaded anywhere in the app (no
        // @font-face, no Google Fonts, no Tailwind fontFamily override), so
        // diagram text silently fell through to this fallback on every
        // machine anyway — asking for it was dead, misleading config.
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        securityLevel: 'loose',
        flowchart: { curve: 'basis' },
      });
      return mermaid;
    });
  }

  return mermaidPromise;
}

function nextMermaidId(): string {
  idCounter += 1;
  return `mermaid-${idCounter}`;
}

function renderError(container: HTMLElement, source: string) {
  // Add, not remove: the class also stops the infinite loading shimmer
  // (see `.mermaid-rendered` in index.css), which is just as much "done
  // loading" on a render failure as it is on success.
  container.classList.add('mermaid-rendered');
  container.innerHTML = '';

  const pre = document.createElement('pre');
  pre.className = 'mermaid-error';
  const code = document.createElement('code');
  // textContent, not innerHTML, so the raw diagram source can't be interpreted as markup.
  code.textContent = source;
  pre.appendChild(code);
  container.appendChild(pre);
}

/**
 * Renders a mermaid diagram into `container`. Safe to call on an element that
 * gets unmounted mid-render: pass an `isStale` callback (e.g. reading a ref
 * flipped in an effect cleanup) and the result is discarded instead of being
 * written into a detached or reused node.
 */
export async function renderMermaidInto(
  container: HTMLElement,
  source: string,
  isStale: () => boolean = () => false,
  onRendered?: (container: HTMLElement) => void
): Promise<void> {
  const trimmed = source.trim();
  if (!trimmed) {
    return;
  }

  try {
    const mermaid = await getMermaid();
    if (isStale()) {
      return;
    }

    const { svg } = await mermaid.render(nextMermaidId(), trimmed);
    if (isStale()) {
      return;
    }

    container.innerHTML = svg;
    container.classList.add('mermaid-rendered');

    // Mermaid's output SVG has no text alternative by default, so screen
    // readers either skip it entirely or read through its internal <text>
    // nodes out of context. A generic label at least announces it as a
    // diagram rather than silence or noise — a real per-diagram description
    // would mean writing content, not a rendering fix.
    const svgEl = container.querySelector('svg');
    if (svgEl && !svgEl.hasAttribute('aria-label')) {
      svgEl.setAttribute('role', 'img');
      svgEl.setAttribute('aria-label', 'Architecture diagram');
    }

    // Optional hook for callers that need to post-process the rendered SVG —
    // e.g. wiring up `click nodeId href "..."` anchors (see KnowledgeGraphPage)
    // to client-side routing instead of a full page reload. Only fires on a
    // real successful render, never on error/stale.
    onRendered?.(container);
  } catch (error) {
    console.error('Mermaid render error', error);
    if (!isStale()) {
      renderError(container, trimmed);
    }
  }
}
