import GithubSlugger from 'github-slugger';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
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
  .use(rehypeHighlight)
  .use(rehypeStringify);

export async function compileMarkdownToHtml(markdown: string): Promise<string> {
  const output = await markdownProcessor.process(markdown);
  return String(output);
}
