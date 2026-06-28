import { useEffect, useRef } from 'react';

interface Props {
  chart: string;
}

export default function MermaidDiagram({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!chart.trim() || !containerRef.current) {
      return;
    }

    initialized.current = false;

    void import('mermaid').then(({ default: mermaid }) => {
      if (initialized.current) {
        return;
      }
      initialized.current = true;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        securityLevel: 'loose',
        flowchart: { curve: 'basis' },
      });

      const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      void mermaid.render(id, chart).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          containerRef.current.classList.add('mermaid-rendered');
        }
      }).catch((e) => {
        console.error('Mermaid render error', e);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="mermaid-error text-xs text-rose-500 overflow-auto p-4 bg-rose-50 rounded-lg"><code>${chart}</code></pre>`;
        }
      });
    });
  }, [chart]);

  return <div ref={containerRef} className="mermaid-diagram flex justify-center w-full" data-diagram={chart} />;
}
