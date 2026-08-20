import { useEffect, useRef } from 'react';
import { renderMermaidInto } from '../../content-engine/mermaid';

interface Props {
  chart: string;
  /**
   * Called once after a successful render with the container element, so a
   * caller can post-process the generated SVG (e.g. wire up click-to-navigate
   * on `click nodeId href "..."` anchors — see KnowledgeGraphPage). Read from
   * a ref rather than the effect's dependency array: `chart` is the only
   * thing that should re-trigger a re-render, and callers typically pass a
   * fresh closure on every render (e.g. one capturing `navigate`).
   */
  onRendered?: (container: HTMLElement) => void;
}

export default function MermaidDiagram({ chart, onRendered }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onRenderedRef = useRef(onRendered);
  onRenderedRef.current = onRendered;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let stale = false;
    void renderMermaidInto(container, chart, () => stale, (el) => onRenderedRef.current?.(el));

    return () => {
      stale = true;
    };
  }, [chart]);

  return <div ref={containerRef} className="mermaid-diagram flex justify-center w-full" data-diagram={chart} />;
}
