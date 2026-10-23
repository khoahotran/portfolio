import { Suspense, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingState from './components/LoadingState';
import ScrollManager from './components/ScrollManager';
import SiteFooter from './components/content/SiteFooter';
import SiteHeader from './components/content/SiteHeader';
import { labs } from './labs/registry';
import NotFoundPage from './pages/NotFoundPage';
import RouteVitalsTracker from './performance/RouteVitalsTracker';
import {
  AboutPage,
  ContentDetailPage,
  ContentListPage,
  KnowledgeGraphPage,
  LabsIndexPage,
  PortfolioHome,
  SearchPage,
  TagDetailPage,
  TagsIndexPage,
  WritingIndexPage,
} from './routing/route-components';

function LoadingFallback() {
  return <LoadingState label="Loading page…" className="mx-auto max-w-6xl px-4" />;
}

/**
 * Ends the boot handover on the first client-side navigation.
 *
 * The prerendered page is on screen from the first paint, and React's first commit replaces it
 * with an identical tree (main.tsx preloads the route so that commit is complete). index.html sets
 * `boot-handover` on <html> to switch the entrance fade off for that view - otherwise the swap
 * replays it and the page visibly fades in a second time. Every later page should still fade in,
 * so the class goes once the pathname first changes - a query-string change (a /writing filter)
 * keeps the same <main>, and lifting the guard under it would start its fade mid-page. A layout
 * effect, so it is gone before the new page's first paint and its animation starts from the top.
 */
function useEndBootHandover(pathname: string) {
  const firstPathname = useRef(pathname);
  useLayoutEffect(() => {
    if (pathname !== firstPathname.current) document.documentElement.classList.remove('boot-handover');
  }, [pathname]);
}

/**
 * Routes live in their own component so ErrorBoundary can be keyed on the
 * current path via useLocation() (which requires Router context, so it
 * can't be called from App itself, above <BrowserRouter>). Keying by
 * pathname remounts the boundary - and clears any caught error - on every
 * navigation, so a failed route doesn't permanently blank the rest of the site.
 */
function AppRoutes() {
  const location = useLocation();
  useEndBootHandover(location.pathname);

  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<PortfolioHome />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/graph" element={<KnowledgeGraphPage />} />
          {/* One browse surface over the five writing collections. Their own list routes stay -
              see the note at the top of WritingIndexPage. */}
          <Route path="/writing" element={<WritingIndexPage />} />
          <Route
            path="/projects"
            element={
              <ContentListPage
                collection="projects"
                title="Flagship Projects"
                description="Deep architectural dives into the systems I've designed and built end-to-end."
              />
            }
          />
          <Route path="/projects/:slug" element={<ContentDetailPage collection="projects" />} />
          <Route
            path="/blog"
            element={
              <ContentListPage
                collection="blog"
                title="Developer Blog"
                description="Narrative build stories - how a specific system got built, and what broke along the way."
              />
            }
          />
          <Route path="/blog/:slug" element={<ContentDetailPage collection="blog" />} />
          <Route
            path="/research"
            element={
              <ContentListPage
                collection="research"
                title="Engineering Case Studies"
                description="Why a technical decision was investigated - the options considered, and what the evidence said."
              />
            }
          />
          <Route path="/research/:slug" element={<ContentDetailPage collection="research" />} />
          <Route
            path="/experiments"
            element={
              <ContentListPage
                collection="experiments"
                title="Experiment Notes"
                description="Experiment write-ups, simulation notes, and interactive engineering demos."
              />
            }
          />
          <Route path="/experiments/:slug" element={<ContentDetailPage collection="experiments" />} />
          <Route path="/labs" element={<LabsIndexPage />} />
          {labs.map((lab) => (
            <Route key={lab.id} path={`/labs/${lab.id}`} element={<lab.component />} />
          ))}
          {/* Redirects for the old /experiments/<lab> paths so existing links, bookmarks, and search
              engine indexes keep working now that interactive labs live under /labs/*. Skipped for
              labs whose id is also a real article slug (collidesWithArticleSlug) - for those,
              /experiments/<slug> must render the article via the :slug route below, not redirect. */}
          {labs
            .filter((lab) => !lab.collidesWithArticleSlug)
            .map((lab) => (
              <Route
                key={`redirect-${lab.id}`}
                path={`/experiments/${lab.id}`}
                element={<Navigate to={`/labs/${lab.id}`} replace />}
              />
            ))}
          <Route
            path="/system-design"
            element={
              <ContentListPage
                collection="system-design"
                title="System Design Notes"
                description="How one system or subsystem was actually designed - the architecture, not the debate."
              />
            }
          />
          <Route path="/system-design/:slug" element={<ContentDetailPage collection="system-design" />} />
          <Route
            path="/field-notes"
            element={
              <ContentListPage
                collection="field-notes"
                title="Field Notes"
                description="Short, opinionated notes on real engineering decisions - framework choices, language trade-offs, and hard-won lessons."
              />
            }
          />
          <Route path="/field-notes/:slug" element={<ContentDetailPage collection="field-notes" />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tags" element={<TagsIndexPage />} />
          <Route path="/tags/:tag" element={<TagDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RouteVitalsTracker />
      <ScrollManager />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-inverse focus:px-4 focus:py-2 focus:text-meta focus:font-semibold focus:text-inverse-fg"
        >
          Skip to content
        </a>
        <SiteHeader />
        {/* At least a viewport tall, so the footer is never on screen while a route is still loading.
            It used to sit right under a short "Loading…" state and then get shoved out of view when
            the content landed - a CLS of ~0.77 on every article, and a footer floating mid-screen
            on short pages such as the 404. */}
        <div id="main-content" className="min-h-screen">
          <AppRoutes />
        </div>
        <SiteFooter />
      </div>
    </BrowserRouter>
  );
}

export default App;
