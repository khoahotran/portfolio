import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getContentDetail, prefetchNextArticle } from '../../content-engine/content-service';
import type { ContentCollection, ContentDetail } from '../../content-engine/types';
import { useSeo } from '../../seo/useSeo';

interface Props {
  collection: ContentCollection;
}

const routeByCollection: Record<ContentCollection, string> = {
  blog: '/blog',
  research: '/research',
  experiments: '/experiments',
  'system-design': '/system-design',
};

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function scrollToHash(hash: string) {
  if (!hash) {
    return;
  }

  const id = hash.replace('#', '');
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  const offset = 64;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

function ContentDetailPage({ collection }: Props) {
  const { slug } = useParams();
  const location = useLocation();
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const jsonLd = useMemo(() => {
    if (!detail) {
      return undefined;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: detail.title,
      datePublished: detail.date,
      description: detail.summary,
      keywords: detail.tags.join(', '),
      articleSection: detail.collection,
      mainEntityOfPage: window.location.href,
      author: {
        '@type': 'Person',
        name: 'Tran Nguyen Anh Khoa',
      },
    };
  }, [detail]);

  useSeo({
    title: detail?.title ?? 'Article',
    description: detail?.summary ?? 'Technical article',
    type: 'article',
    image: detail?.ogImage,
    jsonLd,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      const data = await getContentDetail(collection, slug);
      if (active) {
        setDetail(data);
        setLoading(false);
        if (data) {
          void prefetchNextArticle(collection, slug);
        }
      }
    };

    setLoading(true);
    void load();

    return () => {
      active = false;
    };
  }, [collection, slug]);

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

  useEffect(() => {
    const onScroll = () => {
      const article = document.getElementById('article-content');
      if (!article) {
        return;
      }

      const total = article.scrollHeight - window.innerHeight;
      const nextProgress = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
      setProgress(nextProgress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!detail) {
      return;
    }

    const anchors = Array.from(document.querySelectorAll('.markdown-body .heading-anchor'));

    const onClick = (event: Event) => {
      event.preventDefault();
      const target = event.currentTarget as HTMLAnchorElement;
      const href = target.getAttribute('href');
      if (!href) {
        return;
      }

      const fullUrl = `${window.location.origin}${window.location.pathname}${href}`;
      window.history.replaceState(null, '', href);
      void navigator.clipboard.writeText(fullUrl);
      scrollToHash(href);
    };

    anchors.forEach((anchor) => anchor.addEventListener('click', onClick));

    return () => {
      anchors.forEach((anchor) => anchor.removeEventListener('click', onClick));
    };
  }, [detail]);

  const backRoute = useMemo(() => routeByCollection[collection], [collection]);

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 py-16 text-sm text-slate-500">Loading...</main>;
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Article not found</h1>
        <Link to={backRoute} className="mt-4 inline-block text-sm text-teal-600 hover:underline">
          Back to list
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 md:px-6 md:pt-10">
      <div className="sticky top-12 z-20 mb-6 h-1 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-teal-500 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <article id="article-content">
          <Link to={backRoute} className="mb-4 inline-block text-xs text-teal-600 hover:underline">
            Back
          </Link>
          <header className="mb-6 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{detail.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>{formatDate(detail.date)}</span>
              <span>{detail.readingText}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{detail.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {detail.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          </header>
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: detail.html }} />
        </article>

        <aside className="hidden md:block">
          {detail.toc.length > 0 && (
            <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Table of contents</h2>
              <ul className="space-y-2 text-sm">
                {detail.toc.map((item) => (
                  <li key={item.id} className={item.depth === 3 ? 'pl-3' : ''}>
                    <a href={`#${item.id}`} className="text-slate-600 hover:text-teal-600">
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

export default ContentDetailPage;
