// Shared with check-responsive.mjs and check-contrast.mjs: a dropped network connection
// (net::ERR_NETWORK_CHANGED, ERR_CONNECTION_REFUSED, etc.) is a property of the runner — on WSL,
// and on any host whose network interface flaps or whose preview server is still warming up, it
// lands on different routes run to run, not the same one deterministically. See
// check-responsive.mjs's own long-standing comment on this, which first documented the pattern.
//
// Extracted here (2026-09-07) after check-contrast.mjs was found to have no retry logic at all,
// and — worse — to silently `console.warn` a page.goto failure and otherwise ignore it, so a
// completely unreachable preview server still printed "PASS — no text below WCAG AA across 105
// routes x 2 themes" with zero routes actually visited. Duplicating this logic risked exactly the
// kind of silent divergence `slugify()` already caused once (see
// src/content-engine/slugify.test.ts) — one script's copy staying correct while the other's drifts
// or, in this case, was simply never written in the first place.

export const TRANSIENT_ERROR_PATTERNS = [
  'net::ERR_NETWORK_CHANGED',
  'net::ERR_NETWORK_IO_SUSPENDED',
  'net::ERR_CONNECTION_RESET',
  'net::ERR_CONNECTION_CLOSED',
  'net::ERR_CONNECTION_REFUSED',
  'net::ERR_ABORTED',
  'Failed to fetch dynamically imported module',
];

export function isTransientErrorMessage(message) {
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}
