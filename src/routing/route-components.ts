import { lazyRoute } from './lazy-route';

// Every page App.tsx routes to, code-split. Shared with preload-route.ts, which loads the current
// route's chunk before the first render.
export const PortfolioHome = lazyRoute(() => import('../pages/PortfolioHome'));
export const AboutPage = lazyRoute(() => import('../pages/AboutPage'));
export const KnowledgeGraphPage = lazyRoute(() => import('../pages/KnowledgeGraphPage'));
export const LabsIndexPage = lazyRoute(() => import('../pages/LabsIndexPage'));
export const WritingIndexPage = lazyRoute(() => import('../pages/WritingIndexPage'));
export const TagsIndexPage = lazyRoute(() => import('../pages/TagsIndexPage'));
export const TagDetailPage = lazyRoute(() => import('../pages/TagDetailPage'));
export const ContentListPage = lazyRoute(() => import('../pages/content/ContentListPage'));
export const ContentDetailPage = lazyRoute(() => import('../pages/content/ContentDetailPage'));
export const SearchPage = lazyRoute(() => import('../pages/SearchPage'));
