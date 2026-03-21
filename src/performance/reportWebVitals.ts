import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

declare global {
  interface Window {
    __PORTFOLIO_VITALS__?: Array<{
      name: string;
      value: number;
      rating: string;
      id: string;
      delta: number;
      path: string;
      ts: number;
    }>;
    __printVitalsReport__?: () => void;
  }
}

function sendMetricToEndpoint(payload: Record<string, unknown>) {
  const endpoint = import.meta.env.VITE_VITALS_ENDPOINT;
  if (!endpoint) {
    return;
  }

  const json = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([json], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
    keepalive: true,
  });
}

function sendToStore(metric: Metric) {
  const item = {
    name: metric.name,
    value: Number(metric.value.toFixed(2)),
    rating: metric.rating,
    id: metric.id,
    delta: Number(metric.delta.toFixed(2)),
    path: window.location.pathname,
    ts: Date.now(),
  };

  const store = window.__PORTFOLIO_VITALS__ ?? [];
  store.push(item);
  window.__PORTFOLIO_VITALS__ = store;

  sendMetricToEndpoint(item);

  if (import.meta.env.DEV) {
    console.table(item);
  }
}

function printVitalsReport() {
  const store = window.__PORTFOLIO_VITALS__ ?? [];
  const latestByMetric = new Map<string, (typeof store)[number]>();

  store.forEach((item) => {
    latestByMetric.set(item.name, item);
  });

  const report = Array.from(latestByMetric.values()).sort((a, b) => a.name.localeCompare(b.name));
  console.table(report);
}

export function reportWebVitals() {
  onCLS(sendToStore);
  onINP(sendToStore);
  onLCP(sendToStore);
  onFCP(sendToStore);
  onTTFB(sendToStore);
  window.__printVitalsReport__ = printVitalsReport;
}
