/**
 * Reuses the mermaid SVG that prerendering already produced, instead of rendering it again.
 *
 * scripts/prerender.mjs runs every diagram through mermaid and writes the resulting SVG into the
 * HTML — on the two largest pages that is most of their 185 KB. React then discards all of it on
 * mount (see src/boot-reveal.ts), and MarkdownContent renders each diagram again from scratch.
 * Measured on a page with four diagrams: they reappeared at 756ms, 964ms, 1072ms and 1194ms, each
 * one resizing the page as it landed.
 *
 * So the prerendered SVG was downloaded, parsed, thrown away, and recomputed. This module keeps it:
 * the markup is captured before React can delete it, and `renderMermaidInto` uses it when the
 * source matches. Two things follow — diagrams are present in the first painted frame rather than
 * arriving over the next second, and `mermaid.core` (634 KB) is never fetched on a first visit
 * where every diagram is already in hand.
 *
 * Keyed by diagram source, not by position: `data-diagram` carries the exact source MarkdownContent
 * will ask for, so reordering or adding a diagram cannot hand back the wrong picture. Entries are
 * consumed on use, so the same source appearing twice on one page renders the second copy normally
 * rather than duplicating the SVG's element ids.
 */

const prerendered = new Map<string, string>();
let captured = false;

export function capturePrerenderedDiagrams(): void {
  // Must run before React's first render — createRoot deletes #root's children, and that is where
  // the prerendered diagrams live.
  if (captured) return;
  captured = true;

  // During prerendering the diagrams must be rendered for real; reusing a cached copy would hide a
  // genuine render failure behind an earlier page's output. scripts/prerender.mjs sets the flag.
  if ((window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__) return;

  document.querySelectorAll<HTMLElement>('.mermaid-diagram[data-diagram]').forEach((element) => {
    const source = element.getAttribute('data-diagram')?.trim();
    // Only a finished render counts. A container still showing the loading shimmer has no <svg>,
    // and caching that would pin the shimmer in place permanently.
    if (source && element.querySelector('svg')) {
      prerendered.set(source, element.innerHTML);
    }
  });
}

export function takePrerenderedDiagram(source: string): string | undefined {
  const html = prerendered.get(source);
  if (html !== undefined) prerendered.delete(source);
  return html;
}
