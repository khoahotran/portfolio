const HEADER_OFFSET = 64;

/**
 * Scrolls to the element identified by `hash` (with or without the leading
 * `#`), compensating for the sticky site header + reading-progress bar.
 * Shared by ContentDetailPage's initial deep-link scroll, its heading-anchor
 * copy-link click handler, and TableOfContents so all three land in the
 * same place instead of the browser's uncompensated default anchor jump.
 */
export function scrollToHash(hash: string, offset: number = HEADER_OFFSET): void {
  if (!hash) {
    return;
  }

  const id = hash.replace('#', '');
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}
