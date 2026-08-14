import { useEffect, useRef } from 'react';

interface Props {
  targetId: string;
}

/**
 * Scroll progress bar for the given target element's height. Writes width
 * directly to the DOM inside a requestAnimationFrame-throttled scroll
 * handler instead of React state, so scrolling never re-renders the article.
 */
function ReadingProgress({ targetId }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number | null = null;

    const update = () => {
      frame = null;
      const target = document.getElementById(targetId);
      const bar = barRef.current;
      if (!target || !bar) {
        return;
      }

      const total = target.scrollHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
      bar.style.width = `${progress}%`;
    };

    const onScroll = () => {
      if (frame === null) {
        frame = window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [targetId]);

  return (
    <div className="sticky top-12 z-20 mb-6 h-1 w-full overflow-hidden rounded-full bg-slate-200">
      <div ref={barRef} className="h-full bg-teal-500 transition-[width]" style={{ width: '0%' }} />
    </div>
  );
}

export default ReadingProgress;
