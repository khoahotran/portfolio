import GithubSlugger from 'github-slugger';
import type { Node } from 'hast';
import type { Element, Root } from 'hast';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
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

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'prepend',
    properties: {
      className: ['heading-anchor'],
      ariaLabel: 'Copy heading link',
    },
  })
  .use(rehypeMermaidExtract) // Must be before rehypeHighlight
  .use(rehypeHighlight)
  .use(rehypeStringify);

export async function compileMarkdownToHtml(markdown: string): Promise<string> {
  const output = await markdownProcessor.process(markdown);
  return String(output);
}
