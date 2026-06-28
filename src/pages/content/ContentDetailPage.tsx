import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getContentDetail, getRelatedArticles, prefetchNextArticle } from '../../content-engine/content-service';
import type { ContentCollection, ContentDetail, ContentIndexItem } from '../../content-engine/types';
import { useSeo } from '../../seo/useSeo';

interface Props {
  collection: ContentCollection;
}

const routeByCollection: Record<ContentCollection, string> = {
  blog: '/blog',
  research: '/research',
  experiments: '/experiments',
  'system-design': '/system-design',
  'field-notes': '/field-notes',
  projects: '/projects',
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
  const [related, setRelated] = useState<ContentIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const mermaidInitialized = useRef(false);

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
        if (data) {
          const relatedArticles = await getRelatedArticles(slug, data.tags, 3);
          if (active) setRelated(relatedArticles);
          void prefetchNextArticle(collection, slug);
        }
        setLoading(false);
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

  // Render Mermaid diagrams after HTML content is injected into the DOM.
  // Uses dynamic import so mermaid's large bundle is only loaded on article
  // pages that actually contain diagrams.
  useEffect(() => {
    if (!detail) {
      return;
    }

    const containers = document.querySelectorAll<HTMLElement>('.mermaid-diagram');
    if (containers.length === 0) {
      return;
    }

    // Prevent double-rendering on hot-reload in dev
    mermaidInitialized.current = false;

    void import('mermaid').then(({ default: mermaid }) => {
      if (mermaidInitialized.current) {
        return;
      }
      mermaidInitialized.current = true;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        securityLevel: 'loose',
        flowchart: { curve: 'basis' },
      });

      let counter = 0;
      containers.forEach((container) => {
        const source = container.getAttribute('data-diagram') ?? '';
        if (!source.trim()) {
          return;
        }

        const id = `mermaid-${Date.now()}-${counter++}`;
        void mermaid.render(id, source).then(({ svg }) => {
          container.innerHTML = svg;
          container.classList.add('mermaid-rendered');
        }).catch(() => {
          // On parse error show the raw source in a code block
          container.innerHTML = `<pre class="mermaid-error"><code>${source}</code></pre>`;
        });
      });
    });
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
          
          {/* Related Articles Component */}
          {related.length > 0 && (
            <div className="mt-16 pt-8 border-t border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Read Next</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map(item => (
                  <Link 
                    key={item.slug} 
                    to={`/${item.collection}/${item.slug}`}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 hover:border-teal-500 hover:shadow-lg transition-all duration-300"
                  >
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-teal-600 font-bold mb-2">{item.collection.replace('-', ' ')}</div>
                      <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2">{item.title}</h3>
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2">{item.summary}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>{formatDate(item.date)}</span>
                      <span>{item.readingText}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
