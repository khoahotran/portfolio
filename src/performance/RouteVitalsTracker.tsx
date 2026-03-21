import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function RouteVitalsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const timer = window.setTimeout(() => {
      const path = `${location.pathname}${location.search}${location.hash}`;
      const routeMetrics = (window.__PORTFOLIO_VITALS__ ?? []).filter(
        (item) => item.path === location.pathname
      );

      if (routeMetrics.length > 0) {
        console.groupCollapsed(`[Vitals] ${path}`);
        console.table(routeMetrics);
        console.groupEnd();
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, location.search]);

  return null;
}

export default RouteVitalsTracker;
