// Lightweight browser regression check: horizontal overflow + console/page errors
// across every route and the seven audited viewport widths.
//
// Why this exists: the production UI/UX audit found two real mobile-overflow bugs
// (missing `min-w-0` on a Grid/Flex item with unwrappable content — see
// .ai/audit-followups.md item 5) that were invisible from source review and only
// surfaced by measuring `scrollWidth` in a real browser. This script keeps that
// measurement repeatable instead of one-off.
//
// Usage:
//   npm run check:responsive              # against a running `npm run preview` server
//   npm run check:responsive -- --base=http://localhost:5173  # e.g. against `npm run dev`
//
// Requires `npm run build` to have produced dist/ and a preview/dev server already
// running — this script does not start one itself, to keep it usable against either
// `vite preview` (production build) or `vite dev` (fast iteration).

import { chromium } from 'playwright';
import { readArticleRoutes, staticRoutes } from './lib/site-routes.mjs';

const VIEWPORTS = [
  { name: '320', width: 320, height: 700 },
  { name: '375', width: 375, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1280', width: 1280, height: 900 },
  { name: '1440', width: 1440, height: 960 },
];

// Routes this check adds on top of the shared `staticRoutes` list: /search renders nothing
// until a query is typed (so it's excluded from the sitemap and prerender), and the bogus
// path exercises the 404 page. Everything else — pages, collection lists, the nine labs —
// comes from scripts/lib/site-routes.mjs so this file can't drift from what actually ships.
const EXTRA_ROUTES = ['/search', '/this-route-does-not-exist'];

function parseArgs() {
  const baseArg = process.argv.find((a) => a.startsWith('--base='));
  const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='));
  return {
    base: baseArg ? baseArg.slice('--base='.length) : 'http://localhost:4173/portfolio',
    // Six parallel Chromium contexts each pulling ~40 lazy chunks can saturate a constrained
    // virtual network (WSL2 in particular), which surfaces as ERR_NETWORK_CHANGED storms that the
    // retry logic above cannot outlast because the flapping persists for the whole run. Lowering
    // this trades wall-clock for stability on such a machine; CI keeps the default.
    concurrency: concurrencyArg ? Number(concurrencyArg.slice('--concurrency='.length)) : CONCURRENCY,
  };
}

/**
 * Mermaid renders asynchronously after route mount (dynamic import + mermaid.render()),
 * so a diagram that's still loading at the moment of this check is not yet a failure —
 * this waits (bounded) for every `.mermaid-diagram` on the page to finish, then asserts
 * each one actually produced a non-empty SVG rather than an error box. Catches the class
 * of bug console-error detection alone missed: a diagram that renders "successfully" as
 * an empty or error SVG without ever calling console.error. Runs once per route (at the
 * widest viewport only — Mermaid's own output doesn't change across breakpoints), not
 * once per viewport, so this doesn't multiply the route's wall-clock cost by 7.
 */
async function checkMermaid(page) {
  const failures = [];
  const diagramCount = await page.evaluate(() => document.querySelectorAll('.mermaid-diagram').length);
  if (diagramCount === 0) {
    return failures;
  }

  try {
    await page.waitForFunction(
      (expected) => document.querySelectorAll('.mermaid-diagram.mermaid-rendered').length >= expected,
      diagramCount,
      { timeout: 10000 }
    );
  } catch {
    failures.push({ kind: 'mermaid', detail: `${diagramCount} diagram(s) present but rendering never settled within 10s` });
    return failures;
  }

  const results = await page.evaluate(() =>
    [...document.querySelectorAll('.mermaid-diagram')].map((el, i) => {
      const svg = el.querySelector('svg');
      return {
        index: i,
        hasSvg: !!svg,
        isEmpty: !svg || svg.childElementCount === 0,
        isErrorBox: !!el.querySelector('.mermaid-error'),
      };
    })
  );

  for (const r of results) {
    if (r.isErrorBox) {
      failures.push({ kind: 'mermaid', detail: `diagram #${r.index} rendered an error box` });
    } else if (!r.hasSvg || r.isEmpty) {
      failures.push({ kind: 'mermaid', detail: `diagram #${r.index} produced no/empty SVG` });
    }
  }

  return failures;
}

/**
 * Chromium reports a dropped connection as a console error (net::ERR_NETWORK_CHANGED,
 * ERR_NETWORK_IO_SUSPENDED, ERR_CONNECTION_RESET) and — when the dropped request happened to be
 * a lazy route chunk — as a downstream "Failed to fetch dynamically imported module" plus the
 * React render error that follows it. None of that is a property of the page: on WSL, and on any
 * runner whose network interface flaps, it lands on different routes and viewports run to run
 * (observed: 17 failures on one run, 14 on the next, overlapping on none of the same routes).
 *
 * Treating it as a failure makes this gate flaky, and a flaky gate gets ignored. So a route is
 * re-run when ANY of its failures is network-shaped. Retrying is safe precisely because the
 * failures this check exists to catch are deterministic: a real overflow, a real mermaid syntax
 * error, or a genuinely missing chunk reproduces on every attempt, so it still fails. A dropped
 * connection does not.
 *
 * "Any", not "all", because the collateral matters: when the dropped request is the mermaid or
 * dagre chunk, the diagram renders an error box, and that surfaces as a `mermaid` failure with a
 * network error sitting right next to it. Requiring every failure to be network-shaped left those
 * routes failing for a reason that had nothing to do with their diagrams.
 */
const TRANSIENT_ERROR_PATTERNS = [
  'net::ERR_NETWORK_CHANGED',
  'net::ERR_NETWORK_IO_SUSPENDED',
  'net::ERR_CONNECTION_RESET',
  'net::ERR_CONNECTION_CLOSED',
  'net::ERR_ABORTED',
  'Failed to fetch dynamically imported module',
];

/**
 * Three, empirically. A flapping interface has been observed hitting the same route on three
 * consecutive attempts (WSL2 with six concurrent Chromium contexts each pulling ~40 lazy chunks
 * from a local preview server). The cost of a retry is a few seconds; the cost of a flaky gate is
 * that it stops being trusted.
 */
const MAX_RETRIES = 3;

function isTransientFailure(failure) {
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => failure.detail.includes(pattern));
}

async function checkRouteWithRetry(browser, base, path) {
  let failures = await checkRoute(browser, base, path);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    if (failures.length === 0 || !failures.some(isTransientFailure)) break;
    console.warn(`[check-responsive] transient network error on ${path} — retry ${attempt}/${MAX_RETRIES}`);
    failures = await checkRoute(browser, base, path);
  }

  return failures;
}

/**
 * Viewport x colour-scheme passes.
 *
 * The seven-width sweep runs in light, as it always has. Dark mode adds one pass at the widest
 * viewport rather than a second full sweep: horizontal overflow is a function of layout, not
 * colour, so re-measuring it at all seven widths in dark would double the runtime to re-verify
 * something theme-independent. What dark mode genuinely needs covering is that the page still
 * renders without console errors and that Mermaid still produces real SVGs — and the Mermaid check
 * only runs at the widest viewport anyway.
 *
 * `colorScheme` is how the theme is selected, deliberately: the inline bootstrap in index.html
 * reads `prefers-color-scheme`, so this exercises the real code path a visitor hits instead of
 * injecting a class the app didn't set.
 */
function passes() {
  const widest = VIEWPORTS[VIEWPORTS.length - 1];
  return [
    ...VIEWPORTS.map((vp) => ({ vp, colorScheme: 'light' })),
    { vp: widest, colorScheme: 'dark' },
  ];
}

async function checkRoute(browser, base, path) {
  const failures = [];

  for (const { vp: vpBase, colorScheme } of passes()) {
    const vp = colorScheme === 'dark' ? { ...vpBase, name: `${vpBase.name}/dark` } : vpBase;
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    try {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(300); // let mermaid/highlight/rAF settle
    } catch (error) {
      failures.push({ viewport: vp.name, kind: 'navigation', detail: error.message });
      await context.close();
      continue;
    }

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    if (overflow.scrollWidth > overflow.clientWidth + 2) {
      failures.push({
        viewport: vp.name,
        kind: 'overflow',
        detail: `scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`,
      });
    }
    if (consoleErrors.length > 0) {
      failures.push({ viewport: vp.name, kind: 'console-error', detail: consoleErrors.join(' | ') });
    }
    if (pageErrors.length > 0) {
      failures.push({ viewport: vp.name, kind: 'page-error', detail: pageErrors.join(' | ') });
    }

    // Widest viewport only — see checkMermaid's doc comment. Matched on width rather than name
    // because the dark pass suffixes its name (see passes()), and Mermaid rendering is exactly
    // what the dark pass is there to verify.
    if (vp.width === VIEWPORTS[VIEWPORTS.length - 1].width) {
      for (const f of await checkMermaid(page)) {
        failures.push({ viewport: vp.name, ...f });
      }
    }

    await context.close();
  }

  return failures;
}

const CONCURRENCY = 6;

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function runOne() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runOne));
  return results;
}

async function main() {
  const { base, concurrency } = parseArgs();
  const routes = [
    ...staticRoutes,
    ...EXTRA_ROUTES,
    ...readArticleRoutes('check-responsive'),
  ];

  console.log(
    `[check-responsive] ${routes.length} routes x ${VIEWPORTS.length} viewports (+ a dark pass at ` +
      `${VIEWPORTS[VIEWPORTS.length - 1].width}px) against ${base} (concurrency ${concurrency})`
  );

  const browser = await chromium.launch();
  let totalFailures = 0;
  let completed = 0;

  await runWithConcurrency(routes, concurrency, async (route) => {
    const failures = await checkRouteWithRetry(browser, base, route);
    completed += 1;
    if (failures.length > 0) {
      totalFailures += failures.length;
      console.error(`\nFAIL ${route}`);
      for (const f of failures) {
        console.error(`  [${f.viewport}px] ${f.kind}: ${f.detail}`);
      }
    } else if (completed % 10 === 0 || completed === routes.length) {
      console.log(`[check-responsive] ${completed}/${routes.length} routes checked...`);
    }
  });

  await browser.close();

  if (totalFailures > 0) {
    console.error(`\n[check-responsive] ${totalFailures} failure(s) across ${routes.length} routes.`);
    process.exit(1);
  }

  console.log(
    `[check-responsive] PASS — 0 failures across ${routes.length} routes x ${VIEWPORTS.length} viewports ` +
      `plus the dark pass.`
  );
}

await main();
