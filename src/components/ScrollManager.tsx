import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { createScrollMemory } from '../navigation/scroll-memory';
import { scrollToHash } from './content/scrollToHash';

/**
 * Scroll position across client-side navigation, the way a multi-page site behaves natively:
 * going to a new page starts at its top (or at its #hash), and Back/Forward returns to where the
 * reader left.
 *
 * Without this the window kept whatever offset the previous page had. Whether that showed up
 * depended on chunk caching: a cold lazy route committed its short Suspense fallback first, which
 * clamped the offset to 0 by accident, while a warm one rendered at the old offset - so the second
 * visit to a lab opened it 1,700px down with its title off screen. The browser's own restoration
 * ran on popstate, before the lazy route had any height, and landed short for the same reason.
 *
 * Only a pathname change resets to the top: a filter or query-string change (/writing?type=blog,
 * /search?q=) is the same page and keeps its offset.
 */

const memory = createScrollMemory(sessionStorageOrNull());
const RESTORE_TIMEOUT_MS = 3000;
const HASH_TIMEOUT_MS = 10000;
const READER_INPUT = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Runs `act` once `ready()` holds - polled per frame, since route content arrives asynchronously -
 * or when `timeoutMs` passes. Abandoned the moment the reader scrolls, taps or types: their own
 * movement always beats a restore that arrives late.
 */
function whenReady(ready: () => boolean, act: () => void, timeoutMs: number): () => void {
  let frame = 0;
  const started = performance.now();
  const stop = () => {
    cancelAnimationFrame(frame);
    READER_INPUT.forEach((type) => window.removeEventListener(type, stop));
  };
  const tick = () => {
    if (ready() || performance.now() - started > timeoutMs) {
      stop();
      act();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  READER_INPUT.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  tick();
  return stop;
}

function hashTarget(hash: string): HTMLElement | null {
  let id = hash.replace(/^#/, '');
  // A hand-edited URL like `#%E0%A4%A` makes decodeURIComponent throw; that must not take the page down.
  try {
    id = decodeURIComponent(id);
  } catch {
    // keep the raw id
  }
  return document.getElementById(id);
}

function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const keyRef = useRef(location.key);
  const pathRef = useRef<string | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        memory.save(keyRef.current, window.scrollY);
      });
    };
    const onPageHide = () => memory.flush();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onPageHide);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  // Layout effect: the reset has to happen before the new page is painted, or it flashes at the
  // old offset for a frame.
  useLayoutEffect(() => {
    const previousPath = pathRef.current;
    pathRef.current = location.pathname;
    keyRef.current = location.key;
    memory.flush();

    if (navigationType === 'POP') {
      const saved = memory.get(location.key);
      if (saved !== undefined) {
        const root = document.documentElement;
        return whenReady(
          () => root.scrollHeight - window.innerHeight >= saved,
          () => window.scrollTo({ top: Math.min(saved, root.scrollHeight - window.innerHeight), behavior: 'instant' }),
          RESTORE_TIMEOUT_MS
        );
      }
    } else if (previousPath !== location.pathname) {
      // `instant`: html has `scroll-behavior: smooth`, which would animate a page change from wherever the reader was.
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (location.hash) {
      return whenReady(() => hashTarget(location.hash) !== null, () => scrollToHash(location.hash), HASH_TIMEOUT_MS);
    }
  }, [location.key, location.pathname, location.hash, navigationType]);

  return null;
}

export default ScrollManager;
