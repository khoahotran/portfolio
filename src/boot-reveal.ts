/**
 * Keeps `#root` hidden while the client boots, so the prerendered page is never painted and then
 * thrown away in front of the reader.
 *
 * The problem. scripts/prerender.mjs writes a fully rendered DOM into `#root` for every route
 * (Decision 6) - that is what makes the site indexable. But the client mounts with `createRoot()`,
 * and React 18 discards existing children rather than hydrating. hydrateRoot is not available as a
 * fix: measured, not assumed, it fails with React #418/#423 on every route, because the snapshot is
 * the DOM *after* the router resolved, `lazy()` chunks loaded and effects ran - a first client
 * render cannot match that.
 *
 * So the browser painted the snapshot, React deleted it, and every route being `lazy()` meant the
 * next paint was a spinner. Measured on a throttled connection: snapshot at 1516ms, wiped to
 * "Loading page…" at 2595ms, content back at 3200ms. Content that appears and then vanishes reads
 * far worse than a blank page that fills in - which is exactly what this site did before
 * prerendering existed, and what it does again now.
 *
 * An earlier attempt moved the snapshot into a fixed overlay and dropped it once React was ready.
 * It removed the spinner but not the double render: the snapshot and the React tree each run the
 * same `fadeIn`, staggered, so the handover showed the text fade in a second time. Waiting for
 * React's animations to finish before dropping the overlay did not fix it either. Hiding instead of
 * bridging has no such seam - there is only ever one tree on screen.
 *
 * The curtain also lifts without React, on a failed script, an uncaught error or a rejected
 * dynamic import (see the boot script in index.html) - keyed on those rather than on a timer,
 * because a timer cannot distinguish a dead boot from a slow one, and lifting mid-boot puts the
 * flash straight back.
 *
 * What this costs and what it does not. Readers lose nothing they had before prerendering: the
 * page is blank for the same window the old SPA was. Crawlers lose nothing at all - the markup is
 * still in the HTML, and `#root` is only hidden once JS has actually started, so a crawler that
 * does not execute scripts, or a reader whose JS failed, still sees the fully rendered page.
 */

const BOOTING_CLASS = 'js-booting';

export function revealApp(): void {
  document.documentElement.classList.remove(BOOTING_CLASS);
}
