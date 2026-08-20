import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import LoadingState from '../../components/LoadingState';
import ArticleHeader from '../../components/content/ArticleHeader';
import ArticleNav from '../../components/content/ArticleNav';
import ErrorNotice from '../../components/content/ErrorNotice';
import MarkdownContent from '../../components/content/MarkdownContent';
import ReadingProgress from '../../components/content/ReadingProgress';
import RelatedContent from '../../components/content/RelatedContent';
import { scrollToHash } from '../../components/content/scrollToHash';
import TableOfContents from '../../components/content/TableOfContents';
import { getContentDetail, getRelatedArticles, prefetchNextArticle } from '../../content-engine/content-service';
import { routeForCollection } from '../../content-engine/format';
import type { ContentCollection, ContentDetail, ContentIndexItem } from '../../content-engine/types';
import { resolveImageUrl, useSeo } from '../../seo/useSeo';

interface Props {
  collection: ContentCollection;
}

// schema.org type per collection. `projects` are case studies of a shipped
// system, not a blog post — CreativeWork fits better. research/system-design/
// experiments are technical deep-dives, which schema.org models as TechArticle
// (a real Article subtype Google's structured-data docs recognize), not
// BlogPosting. Previously every collection was hardcoded to BlogPosting.
const STRUCTURED_DATA_TYPE: Record<ContentCollection, string> = {
  blog: 'BlogPosting',
  'field-notes': 'BlogPosting',
  research: 'TechArticle',
  'system-design': 'TechArticle',
  experiments: 'TechArticle',
  projects: 'CreativeWork',
};

function ContentDetailPage({ collection }: Props) {
  const { slug } = useParams();
  const location = useLocation();
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [related, setRelated] = useState<ContentIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const jsonLd = useMemo(() => {
    if (!detail) {
      return undefined;
    }

    // Query string stripped — same reasoning as the canonical/og:url fix in
    // useSeo.ts, and this is a direct read of window.location rather than a
    // shared helper, so it needs the same fix applied independently here.
    const url = `${window.location.origin}${window.location.pathname}`;

    return {
      '@context': 'https://schema.org',
      '@type': STRUCTURED_DATA_TYPE[detail.collection],
      headline: detail.title,
      datePublished: detail.date,
      description: detail.summary,
      keywords: detail.tags.join(', '),
      articleSection: detail.collection,
      image: resolveImageUrl(detail.ogImage),
      url,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
      author: {
        '@type': 'Person',
        name: 'Trần Nguyễn Anh Khoa',
      },
      publisher: {
        '@type': 'Person',
        name: 'Trần Nguyễn Anh Khoa',
      },
    };
  }, [detail]);

  useSeo({
    title: detail?.title ?? 'Article',
    description: detail?.summary ?? 'Technical article',
    type: 'article',
    image: detail?.ogImage,
    jsonLd,
    // See the comment on SeoOptions.skip — without this, every article's
    // first paint briefly carries this generic title/description as real
    // meta, before the actual data resolves a moment later.
    skip: !detail,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const data = await getContentDetail(collection, slug);
        if (active) {
          setDetail(data);
          if (data) {
            const relatedArticles = await getRelatedArticles(slug, data.tags, 3, data.related);
            if (active) setRelated(relatedArticles);
            void prefetchNextArticle(collection, slug);
          }
        }
      } catch {
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    setError(false);
    setDetail(null);
    void load();

    return () => {
      active = false;
    };
  }, [collection, slug, retryToken]);

  useEffect(() => {
    if (!detail) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (location.hash) {
        scrollToHash(location.hash);
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [detail, location.hash]);

  const backRoute = useMemo(() => routeForCollection(collection), [collection]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4">
        <LoadingState label="Loading article…" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <ErrorNotice
          message="Couldn't load this article. Check your connection and try again."
          onRetry={() => setRetryToken((token) => token + 1)}
        />
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Article not found</h1>
        <Link to={backRoute} className="btn-back mt-2">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to list
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 md:px-6 md:pt-10">
      <ReadingProgress targetId="article-content" />
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <article id="article-content" className="min-w-0">
          <ArticleHeader detail={detail} />
          <MarkdownContent html={detail.html} />
          <ArticleNav collection={collection} slug={detail.slug} />
          <RelatedContent items={related} />
        </article>

        <aside className="hidden md:block">
          <TableOfContents toc={detail.toc} />
        </aside>
      </div>
    </main>
  );
}

export default ContentDetailPage;
