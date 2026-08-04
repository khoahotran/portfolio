export type ContentCollection = 'blog' | 'research' | 'experiments' | 'system-design' | 'field-notes' | 'projects';

export interface ContentFrontmatter {
  title: string;
  date: string;
  tags: string[];
  summary: string;
  reading_time?: string;
  draft?: boolean;
  ogImage?: string;
}

export interface ContentIndexItem extends ContentFrontmatter {
  slug: string;
  collection: ContentCollection;
  readingMinutes: number;
  readingText: string;
}

export interface SearchIndexItem extends ContentIndexItem {
  searchableText: string;
}

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export interface ContentDetail extends ContentIndexItem {
  html: string;
  toc: TocItem[];
  body: string;
}
