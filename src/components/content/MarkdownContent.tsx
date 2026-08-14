import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderMermaidInto } from '../../content-engine/mermaid';
import { scrollToHash } from './scrollToHash';

interface Props {
  html: string;
}

/**
 * Rewrites root-absolute internal links so they include the app's base path
 * (e.g. '/projects/aegis' -> '/portfolio/projects/aegis'), and opens external
 * links safely. Content is compiled to raw HTML by the content engine and
 * injected via dangerouslySetInnerHTML, so anchors inside it are plain DOM
 * nodes with no knowledge of Vite's `base` config — without this, every
 * internal link and lab button in Markdown 404s once the site is deployed
 * under a subpath. Runs as a DOM pass (not a string transform) so it stays
 * correct for every interaction: click, middle-click, copy-link, and no-JS.
 */
function normalizeLinks(container: HTMLElement) {
  const base = import.meta.env.BASE_URL;
  const anchors = container.querySelectorAll<HTMLAnchorElement>('a[href]');

  anchors.forEach((anchor) => {
    if (anchor.classList.contains('heading-anchor')) {
      // Handled separately by ContentDetailPage's copy-link behavior.
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) {
      return;
    }

    if (/^https?:\/\//i.test(href)) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
      // Other schemes (mailto:, tel:...) or protocol-relative URLs — leave alone.
      return;
    }

    if (!href.startsWith('/') || href.startsWith(base)) {
      return;
    }

    anchor.setAttribute('href', `${base}${href.slice(1)}`);
  });
}

/**
 * Intercepts clicks on the now base-prefixed internal links so navigation
 * stays client-side (no full page reload) instead of falling back to the
 * href rewrite above, which is a correctness floor, not the common path.
 */
function handleLinkClick(event: MouseEvent, navigate: ReturnType<typeof useNavigate>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const anchor = (event.target as HTMLElement).closest('a');
  if (!anchor || anchor.classList.contains('heading-anchor')) {
    return;
  }

  const href = anchor.getAttribute('href');
  const base = import.meta.env.BASE_URL;
  if (!href || anchor.target === '_blank' || !href.startsWith(base)) {
    return;
  }

  event.preventDefault();
  // Router's basename already accounts for `base`; keep the leading slash.
  navigate(href.slice(base.length - 1));
}

/**
 * Wraps standalone images (a paragraph whose only child is an <img>) in a
 * <figure>, promoting `alt` to a <figcaption>, and defers their load.
 * Images inline with text are left as-is — only block-level images are
 * figures. `.markdown-body img` has no layout rules otherwise, so an
 * oversized screenshot would blow out the article column.
 */
function enhanceImages(container: HTMLElement) {
  const images = container.querySelectorAll<HTMLImageElement>('p > img:only-child');

  images.forEach((img) => {
    const paragraph = img.parentElement;
    if (!paragraph || paragraph.tagName !== 'P') {
      return;
    }

    img.loading = 'lazy';
    img.decoding = 'async';

    const alt = img.getAttribute('alt');
    const figure = document.createElement('figure');
    paragraph.replaceWith(figure);
    figure.appendChild(img);

    if (alt) {
      const caption = document.createElement('figcaption');
      caption.textContent = alt;
      figure.appendChild(caption);
    }
  });
}

/**
 * Adds a language label + copy-to-clipboard button above every
 * language-tagged code block. Fenced blocks with no language (the ASCII
 * diagrams and decision trees used throughout this content) are
 * intentionally left untouched — they get no label and no toolbar.
 */
function enhanceCodeBlocks(container: HTMLElement) {
  const codeBlocks = container.querySelectorAll<HTMLElement>('pre > code[class*="language-"]');

  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.dataset.enhanced === 'true') {
      return;
    }
    pre.dataset.enhanced = 'true';
    pre.classList.add('has-toolbar');

    const language = [...code.classList].find((cls) => cls.startsWith('language-'))?.slice('language-'.length);

    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';

    if (language) {
      const label = document.createElement('span');
      label.className = 'code-language';
      label.textContent = language;
      toolbar.appendChild(label);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-button';
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
      void navigator.clipboard.writeText(code.textContent ?? '').then(() => {
        button.textContent = 'Copied';
        button.classList.add('code-copy-button--copied');
        window.setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('code-copy-button--copied');
        }, 1500);
      });
    });
    toolbar.appendChild(button);

    pre.insertBefore(toolbar, code);
  });
}

/**
 * Wires up the "copy heading link" icon rehype-autolink-headings prepends to
 * every h1/h2/h3: copies the absolute URL, updates the visible hash, and
 * scrolls with the sticky-header offset instead of the browser's default
 * (uncompensated) anchor jump.
 */
function enhanceHeadingAnchors(container: HTMLElement) {
  const anchors = container.querySelectorAll<HTMLAnchorElement>('.heading-anchor');

  anchors.forEach((anchor) => {
    if (anchor.dataset.enhanced === 'true') {
      return;
    }
    anchor.dataset.enhanced = 'true';

    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      const href = anchor.getAttribute('href');
      if (!href) {
        return;
      }

      const fullUrl = `${window.location.origin}${window.location.pathname}${href}`;
      window.history.replaceState(null, '', href);
      void navigator.clipboard.writeText(fullUrl);
      scrollToHash(href);
    });
  });
}

function MarkdownContent({ html }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    normalizeLinks(container);
    enhanceImages(container);
    enhanceCodeBlocks(container);
    enhanceHeadingAnchors(container);

    const onClick = (event: MouseEvent) => handleLinkClick(event, navigate);
    container.addEventListener('click', onClick);
    return () => container.removeEventListener('click', onClick);
  }, [html, navigate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let stale = false;
    const diagrams = container.querySelectorAll<HTMLElement>('.mermaid-diagram');
    diagrams.forEach((diagram) => {
      void renderMermaidInto(diagram, diagram.getAttribute('data-diagram') ?? '', () => stale);
    });

    return () => {
      stale = true;
    };
  }, [html]);

  return <div ref={containerRef} className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default MarkdownContent;
