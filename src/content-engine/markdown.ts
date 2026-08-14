import GithubSlugger from 'github-slugger';
import type { Node } from 'hast';
import type { Element, ElementContent, Root } from 'hast';
import protobufLanguage from 'highlight.js/lib/languages/protobuf';
import { common } from 'lowlight';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { TocItem } from './types';

interface MarkdownNode {
  type: string;
  depth?: number;
  children?: MarkdownNode[];
  value?: string;
  alt?: string;
}

function headingText(node: MarkdownNode): string {
  if (typeof node.value === 'string') {
    return node.value;
  }

  if (typeof node.alt === 'string') {
    return node.alt;
  }

  if (!node.children?.length) {
    return '';
  }

  return node.children.map(headingText).join('');
}

const tocParser = unified().use(remarkParse).use(remarkGfm);

export function extractToc(markdown: string): TocItem[] {
  const tree = tocParser.parse(markdown) as MarkdownNode & { children?: MarkdownNode[] };
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];

  const walk = (node: MarkdownNode) => {
    if (node.type === 'heading' && (node.depth === 2 || node.depth === 3) && node.children) {
      const text = headingText(node).trim();
      if (text) {
        toc.push({
          text,
          depth: node.depth,
          id: slugger.slug(text),
        });
      }
    }

    node.children?.forEach(walk);
  };

  tree.children?.forEach(walk);
  return toc;
}

/**
 * Custom rehype plugin that converts Mermaid fenced code blocks into
 * <div class="mermaid-diagram" data-diagram="..."> elements.
 *
 * This must run BEFORE rehype-highlight so that mermaid source is not
 * syntax-highlighted as code. The client-side mermaid.js library renders
 * the SVG after React injects the HTML into the DOM.
 */
function rehypeMermaidExtract() {
  return (tree: Node) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Element | Root | undefined) => {
      if (
        node.tagName !== 'pre' ||
        node.children.length === 0
      ) {
        return;
      }

      const codeNode = node.children[0];
      if (
        codeNode.type !== 'element' ||
        codeNode.tagName !== 'code' ||
        !Array.isArray(codeNode.properties?.className) ||
        !(codeNode.properties.className as string[]).includes('language-mermaid')
      ) {
        return;
      }

      // Extract the raw diagram source text
      const textChild = codeNode.children?.[0];
      const source = textChild?.type === 'text' ? textChild.value : '';

      if (!source.trim()) {
        return;
      }

      // Replace <pre><code class="language-mermaid">...</code></pre>
      // with <div class="mermaid-diagram" data-diagram="..."></div>
      if (parent && typeof index === 'number') {
        const replacement: Element = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['mermaid-diagram'],
            'data-diagram': source,
          },
          children: [],
        };
        parent.children[index] = replacement;
      }
    });
  };
}

const CALLOUT_LABELS = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
} as const;

type CalloutKind = keyof typeof CALLOUT_LABELS;

const CALLOUT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n?/i;

/**
 * Custom rehype plugin implementing GitHub-style Markdown alerts
 * (`> [!NOTE]`, `> [!WARNING]`, etc.) as documented in
 * .ai/writing-style-guide.md. remark-gfm does not implement these itself —
 * it is a separate GFM-adjacent convention — so without this plugin the
 * marker rendered as literal text inside a plain blockquote.
 *
 * Detects a <blockquote> whose first paragraph opens with a `[!TYPE]`
 * marker, strips the marker, and replaces the blockquote with
 * <div class="callout callout-{type}">, styled in index.css. Follows the
 * same visit-and-replace shape as rehypeMermaidExtract above.
 */
function rehypeCallout() {
  return (tree: Node) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Element | Root | undefined) => {
      if (node.tagName !== 'blockquote' || !parent || typeof index !== 'number') {
        return;
      }

      const firstParagraph = node.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'p'
      );

      if (!firstParagraph) {
        return;
      }

      const firstNode = firstParagraph.children[0];
      if (!firstNode || firstNode.type !== 'text') {
        return;
      }

      const match = firstNode.value.match(CALLOUT_MARKER);
      if (!match) {
        return;
      }

      const kind = match[1].toLowerCase() as CalloutKind;

      // Strip the marker in place; drop the text node entirely if nothing follows,
      // so a callout whose marker is on its own line doesn't leave a blank line.
      firstNode.value = firstNode.value.slice(match[0].length);
      if (!firstNode.value) {
        firstParagraph.children.shift();
      }

      const title: Element = {
        type: 'element',
        tagName: 'p',
        properties: { className: ['callout-title'] },
        children: [{ type: 'text', value: CALLOUT_LABELS[kind] }],
      };

      const calloutDiv: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout', `callout-${kind}`] },
        children: [title, ...(node.children as ElementContent[])],
      };

      parent.children[index] = calloutDiv;
    });
  };
}

// Cheap pre-check so the ~78 KB gzipped KaTeX renderer is only ever fetched
// for the handful of articles that actually contain LaTeX — everything else
// (30 of 33 articles) never triggers this import. A bare `$` is a
// deliberately loose heuristic: false positives just mean an article with a
// literal dollar sign pays for an unused import; false negatives are
// impossible, since remark-math's own syntax always requires `$`.
function hasMathSyntax(markdown: string): boolean {
  return markdown.includes('$');
}

async function loadMathPlugins() {
  const [{ default: remarkMath }, { default: rehypeKatex }] = await Promise.all([
    import('remark-math'),
    // KaTeX's stylesheet, needed to render the `.katex` markup rehype-katex
    // emits. Loaded alongside the plugin, not at module top level, so it
    // never ships to articles that don't need it.
    import('rehype-katex'),
    import('katex/dist/katex.min.css'),
  ]);

  return { remarkMath, rehypeKatex };
}

export async function compileMarkdownToHtml(markdown: string): Promise<string> {
  const math = hasMathSyntax(markdown) ? await loadMathPlugins() : null;

  // `.use(list)` with an empty array is a documented unified no-op, used
  // here (rather than an `if` + reassignment) so both branches produce the
  // exact same processor type — conditionally reassigning `let processor =
  // processor.use(...)` across an if/else gives each branch a slightly
  // different generic instantiation that TS won't unify.
  const output = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    // Renders `$inline$` and `$$block$$` LaTeX (used for the OBI formulas in
    // the order-book-imbalance research article and a couple of others) —
    // previously unhandled, so it displayed as literal `\frac{...}` source.
    .use(math ? [math.remarkMath] : [])
    // allowDangerousHtml + rehypeRaw: content authors embed raw HTML for CTA
    // buttons linking articles to their companion /labs/<id> lab (see any
    // file in content/experiments/). Without this pair, remark-rehype's
    // default silently drops those tags and leaves only their bare text
    // behind — the buttons never rendered as clickable elements at all.
    // Content is author-controlled, not user input, so this carries no
    // injection risk.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(math ? [math.rehypeKatex] : [])
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'prepend',
      properties: {
        className: ['heading-anchor'],
        ariaLabel: 'Copy heading link',
      },
    })
    .use(rehypeMermaidExtract) // Must be before rehypeHighlight
    .use(rehypeCallout)
    .use(rehypeHighlight, {
      // `common` is rehype-highlight's own default; explicitly listing it
      // lets us add `protobuf` (used in the Aegis gRPC article) without
      // pulling in lowlight's full `all` bundle, which would import every
      // highlight.js grammar into the client bundle just for one extra
      // language.
      languages: { ...common, protobuf: protobufLanguage },
    })
    .use(rehypeStringify)
    .process(markdown);

  return String(output);
}
