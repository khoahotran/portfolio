import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteHeader from './components/content/SiteHeader';
import RouteVitalsTracker from './performance/RouteVitalsTracker';

const PortfolioHome = lazy(() => import('./pages/PortfolioHome'));
const ContentListPage = lazy(() => import('./pages/content/ContentListPage'));
const ContentDetailPage = lazy(() => import('./pages/content/ContentDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ThroughputSimulationPage = lazy(() => import('./pages/experiments/ThroughputSimulationPage'));
const RetryStrategyVisualizerPage = lazy(() => import('./pages/experiments/RetryStrategyVisualizerPage'));
const FailureInjectionDemoPage = lazy(() => import('./pages/experiments/FailureInjectionDemoPage'));
const QueueVsPubSubPage = lazy(() => import('./pages/experiments/QueueVsPubSubPage'));

function LoadingFallback() {
  return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-slate-500">Loading page...</div>;
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RouteVitalsTracker />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <SiteHeader />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<PortfolioHome />} />
            <Route
              path="/blog"
              element={
                <ContentListPage
                  collection="blog"
                  title="Developer Blog"
                  description="System design notes, architecture breakdowns, and practical engineering lessons."
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
                  description="Deep technical case studies focused on architecture choices and trade-offs."
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
            <Route path="/experiments/throughput-simulation" element={<ThroughputSimulationPage />} />
            <Route path="/experiments/retry-strategy" element={<RetryStrategyVisualizerPage />} />
            <Route path="/experiments/failure-injection" element={<FailureInjectionDemoPage />} />
            <Route path="/experiments/queue-vs-pubsub" element={<QueueVsPubSubPage />} />
            <Route path="/experiments/:slug" element={<ContentDetailPage collection="experiments" />} />
            <Route
              path="/system-design"
              element={
                <ContentListPage
                  collection="system-design"
                  title="System Design Notes"
                  description="Architecture notes and design trade-off analysis from real project scenarios."
                />
              }
            />
            <Route path="/system-design/:slug" element={<ContentDetailPage collection="system-design" />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;
