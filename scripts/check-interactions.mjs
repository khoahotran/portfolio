// Interaction smoke checks: the states you only reach by clicking, dragging or scrolling.
//
// Why this exists: `.ai/audit-followups.md` item 9. check:responsive and check:contrast both
// navigate to a route, wait for load, and measure. Neither hovers, focuses, clicks, drags or
// scrolls anything, so any defect that only exists after an interaction is invisible to both.
// That is not a hypothetical — `wireGraphLinks` in KnowledgeGraphPage.tsx once double-prefixed
// every knowledge-graph href (`/portfolio/portfolio/...`), so every node 404'd on click, and
// BOTH gates passed, because they load the graph page and never click a node. Review caught it.
//
// Deliberately narrow. Item 9 argues against a per-route click matrix: it would be slow and
// brittle for little return on static pages. This covers three surfaces where the interactive
// state is the whole point, and nothing else:
//
//   A. graph node hrefs + a real click        — the wireGraphLinks regression, directly
//   B. lab controls at their extremes          — labs are simulators; defaults are the one state
//                                                the other gates already see
//   C. header nav strip scrolled to both edges — scroll-position-driven CSS, invisible at rest
//
// Usage: npm run check:interactions         (needs `npm run preview` already running)
//        npm run check:interactions -- --base=http://localhost:5173

import { chromium } from 'playwright';
import { labIds } from './lib/site-routes.mjs';
import { isTransientErrorMessage } from './lib/transient-errors.mjs';

const MAX_RETRIES = 3; // see ./lib/transient-errors.mjs

function parseArgs() {
  const baseArg = process.argv.find((a) => a.startsWith('--base='));
  return { base: baseArg ? baseArg.slice('--base='.length) : 'http://localhost:4173/portfolio' };
}

/** Collects console/page errors for the lifetime of a page, so every probe can assert on them. */
function trackErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return {
    /** Returns errors seen since the last drain, ignoring runner-level network flap. */
    drain() {
      const seen = errors.filter((e) => !isTransientErrorMessage(e));
      errors.length = 0;
      return seen;
    },
  };
}

async function noOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  return scrollWidth > clientWidth + 2
    ? `horizontal overflow: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`
    : null;
}

/**
 * A. Knowledge graph.
 *
 * Two assertions, because they fail for different reasons. The href check is the cheap one and
 * is what would have caught wireGraphLinks: a path segment repeated back-to-back means the base
 * prefix was applied twice. The click is the expensive one and is the only thing that proves the
 * whole chain — wired handler, router, route exists — actually works end to end.
 */
async function checkGraph(page, base) {
  const failures = [];
  const basePath = new URL(base).pathname.replace(/\/$/, '');

  await page.goto(`${base}/graph`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(500); // the graph SVG is rendered by mermaid, then wired

  const hrefs = await page.evaluate(() => {
    const XLINK = 'http://www.w3.org/1999/xlink';
    return [...document.querySelectorAll('a')]
      .filter((a) => a.ownerSVGElement)
      .map((a) => ({
        href: a.getAttributeNS(XLINK, 'href') ?? a.getAttribute('href'),
        appPath: a.dataset.appPath ?? null,
      }));
  });

  if (hrefs.length === 0) {
    failures.push({ probe: 'graph', detail: 'no SVG anchors found — the graph did not render or lost its links' });
    return failures;
  }

  for (const { href, appPath } of hrefs) {
    if (!href) {
      failures.push({ probe: 'graph', detail: `anchor for ${appPath ?? '(unknown)'} has no href` });
      continue;
    }
    // `/portfolio/portfolio/labs/x` — the exact shape the wireGraphLinks bug produced.
    if (basePath && href.startsWith(`${basePath}${basePath}/`)) {
      failures.push({ probe: 'graph', detail: `href has the base prefix twice: ${href}` });
    }
    if (!appPath) {
      failures.push({ probe: 'graph', detail: `anchor ${href} was never wired (no data-app-path)` });
    }
  }

  // Click a real node and require that we land on a page with content, not the 404 route. One
  // node, not all of them: the hrefs are all produced by the same code path, so clicking every
  // node re-tests the same line. What one click adds over zero is proof the handler fires at all.
  const target = hrefs.find((h) => h.appPath);
  if (target) {
    await page.evaluate((appPath) => {
      const a = [...document.querySelectorAll('a')].find(
        (el) => el.ownerSVGElement && el.dataset.appPath === appPath
      );
      a?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, target.appPath);
    await page.waitForTimeout(600);

    const landed = await page.evaluate(() => ({
      path: window.location.pathname,
      text: document.body.innerText.slice(0, 400),
    }));
    const expected = `${basePath}${target.appPath}`;
    if (landed.path !== expected) {
      failures.push({ probe: 'graph', detail: `click on ${target.appPath} landed on ${landed.path}, expected ${expected}` });
    }
    if (/not found|404/i.test(landed.text)) {
      failures.push({ probe: 'graph', detail: `click on ${target.appPath} rendered the 404 page` });
    }
  }

  return failures;
}

/**
 * B. Lab controls at their extremes.
 *
 * Labs are simulators: the default `useState` values are the one state check:responsive and
 * check:contrast already cover, and every other state — which is what the lab is for — is
 * uncovered. Sliders are driven to both ends because that is where off-by-one and divide-by-zero
 * live; every toggle is clicked once because a toggle has no interesting middle.
 *
 * The slider is set via the native value setter rather than `fill()` so React's synthetic onChange
 * actually fires — assigning `.value` directly is swallowed by React's own value tracker.
 */
async function checkLab(page, base, labId) {
  const failures = [];
  const tracker = trackErrors(page);

  await page.goto(`${base}/labs/${labId}`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  tracker.drain(); // ignore anything from load itself — the other gates own that

  // Re-queried by index on every touch rather than held as handles: changing one control can
  // re-render the panel and detach every handle taken before it. Holding them made /labs/redlock
  // time out waiting on a slider that no longer existed.
  const sliderCount = await page.locator('main input[type="range"]').count();
  for (let index = 0; index < sliderCount; index++) {
    for (const end of ['min', 'max']) {
      const slider = page.locator('main input[type="range"]').nth(index);
      const value = await slider.getAttribute(end, { timeout: 5000 }).catch(() => null);
      if (value === null) continue;
      await slider.evaluate((el, v) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      await page.waitForTimeout(150);

      const errors = tracker.drain();
      if (errors.length > 0) {
        failures.push({ probe: `lab/${labId}`, detail: `slider ${index} at ${end}=${value}: ${errors.join(' | ')}` });
      }
      const overflow = await noOverflow(page);
      if (overflow) {
        failures.push({ probe: `lab/${labId}`, detail: `slider ${index} at ${end}=${value}: ${overflow}` });
      }
    }
  }

  // Re-query each time: clicking a control can re-render the subtree and detach earlier handles.
  // `main button`, not `button[type="button"]`: most labs set the type explicitly but
  // SagaStateMachinePage and EventSourcingReplayPage do not, and the narrower selector silently
  // found zero controls on both — a gate that passes by not looking is the failure mode item 9
  // is about.
  const buttonCount = await page.locator('main button').count();
  for (let i = 0; i < buttonCount; i++) {
    const button = page.locator('main button').nth(i);
    if (!(await button.isVisible().catch(() => false))) continue;
    await button.click({ timeout: 5000 }).catch((error) => {
      failures.push({ probe: `lab/${labId}`, detail: `button ${i} could not be clicked: ${error.message}` });
    });
    await page.waitForTimeout(120);

    const errors = tracker.drain();
    if (errors.length > 0) {
      failures.push({ probe: `lab/${labId}`, detail: `button ${i}: ${errors.join(' | ')}` });
    }
    const overflow = await noOverflow(page);
    if (overflow) {
      failures.push({ probe: `lab/${labId}`, detail: `button ${i}: ${overflow}` });
    }
  }

  // Selects drive the branch choice on the Saga and 2PC labs — every option is a distinct
  // simulated outcome, which is exactly the kind of state the other gates never reach.
  const selectCount = await page.locator('main select').count();
  for (let i = 0; i < selectCount; i++) {
    const select = page.locator('main select').nth(i);
    const values = await select.evaluate((el) => [...el.options].map((o) => o.value)).catch(() => []);
    for (const value of values) {
      await page.locator('main select').nth(i).selectOption(value, { timeout: 5000 }).catch((error) => {
        failures.push({ probe: `lab/${labId}`, detail: `select ${i} option "${value}": ${error.message}` });
      });
      await page.waitForTimeout(120);

      const errors = tracker.drain();
      if (errors.length > 0) {
        failures.push({ probe: `lab/${labId}`, detail: `select ${i} = "${value}": ${errors.join(' | ')}` });
      }
      const overflow = await noOverflow(page);
      if (overflow) {
        failures.push({ probe: `lab/${labId}`, detail: `select ${i} = "${value}": ${overflow}` });
      }
    }
  }

  if (sliderCount === 0 && buttonCount === 0 && selectCount === 0) {
    failures.push({ probe: `lab/${labId}`, detail: 'no sliders, buttons or selects found — a lab with no controls is almost certainly broken' });
  }

  return failures;
}

/**
 * C. Header at the narrowest supported width.
 *
 * This probe replaced one that measured the scroll-position fades on the old eleven-link strip.
 * That strip is gone: the header now carries four destinations plus two icon buttons, which is the
 * whole point of the navigation change, so the thing worth asserting is the thing that failed
 * before — that the header fits without clipping a label.
 *
 * 320px is the narrowest tested viewport. The old header overflowed at 1440px, so the bar this
 * sets is deliberately the one the previous design could not clear.
 */
async function checkHeader(page, base) {
  const failures = [];
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 20000 });
  // Header width is measured here, and the labels are set in a webfont that swaps in after first
  // paint — see the matching note in check-responsive.mjs.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const header = page.locator('header').first();
  if ((await header.count()) === 0) {
    failures.push({ probe: 'header', detail: 'no <header> found' });
    return failures;
  }

  const geometry = await header.evaluate((el) => {
    const bar = el.firstElementChild;
    return {
      scrollWidth: bar.scrollWidth,
      clientWidth: bar.clientWidth,
      links: [...el.querySelectorAll('nav a')].map((a) => ({
        text: a.textContent.trim(),
        width: a.getBoundingClientRect().width,
        right: a.getBoundingClientRect().right,
      })),
      viewport: window.innerWidth,
    };
  });

  if (geometry.scrollWidth > geometry.clientWidth + 2) {
    failures.push({
      probe: 'header',
      detail: `header overflows at 320px: scrollWidth ${geometry.scrollWidth} > clientWidth ${geometry.clientWidth}`,
    });
  }

  // The specific defect the redesign exists to fix: a nav label clipped by the viewport edge.
  for (const link of geometry.links) {
    if (link.right > geometry.viewport + 1) {
      failures.push({ probe: 'header', detail: `nav link "${link.text}" extends past the viewport (right ${Math.round(link.right)} > ${geometry.viewport})` });
    }
    if (link.width < 8) {
      failures.push({ probe: 'header', detail: `nav link "${link.text}" collapsed to ${Math.round(link.width)}px` });
    }
  }

  if (geometry.links.length !== 4) {
    failures.push({ probe: 'header', detail: `expected 4 primary nav links, found ${geometry.links.length}` });
  }

  return failures;
}

/**
 * D. The command palette.
 *
 * The header only gets to be this small because Cmd-K reaches everything it no longer lists, so a
 * broken palette is a navigation regression and not a missing nicety. Checked at desktop width
 * because that is where a keyboard is.
 */
async function checkPalette(page, base) {
  const failures = [];
  const tracker = trackErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  tracker.drain();

  await page.keyboard.press('Control+k');
  await page.waitForTimeout(400);

  const dialog = page.locator('[role="dialog"]');
  if ((await dialog.count()) === 0) {
    failures.push({ probe: 'palette', detail: 'Ctrl-K did not open the dialog' });
    return failures;
  }

  await page.keyboard.type('raft');
  await page.waitForTimeout(500);
  const firstResult = await page.locator('[role="dialog"] li button').first().textContent().catch(() => null);
  if (!firstResult || !/raft/i.test(firstResult)) {
    failures.push({ probe: 'palette', detail: `typing "raft" gave "${firstResult ?? '(nothing)'}" as the first result` });
  }

  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  const landed = await page.evaluate(() => window.location.pathname);
  if (!landed.includes('raft')) {
    failures.push({ probe: 'palette', detail: `Enter on the first result landed on ${landed}` });
  }

  const errors = tracker.drain();
  if (errors.length > 0) {
    failures.push({ probe: 'palette', detail: errors.join(' | ') });
  }

  return failures;
}

async function withRetry(label, run) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= MAX_RETRIES || !isTransientErrorMessage(error.message)) {
        return [{ probe: label, detail: `threw: ${error.message}` }];
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

async function main() {
  const { base } = parseArgs();
  console.log(`[check-interactions] graph clicks, ${labIds.length} labs' controls, header at 320px, command palette against ${base}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const failures = [];
  failures.push(...(await withRetry('graph', () => checkGraph(page, base))));
  for (const labId of labIds) {
    failures.push(...(await withRetry(`lab/${labId}`, () => checkLab(page, base, labId))));
  }
  failures.push(...(await withRetry('header', () => checkHeader(page, base))));
  failures.push(...(await withRetry('palette', () => checkPalette(page, base))));

  await browser.close();

  if (failures.length > 0) {
    console.error('');
    for (const f of failures) console.error(`FAIL [${f.probe}] ${f.detail}`);
    console.error(`\n[check-interactions] ${failures.length} failure(s).`);
    process.exit(1);
  }

  console.log(`[check-interactions] PASS — graph node click resolves, ${labIds.length} labs survive their control extremes, header fits at 320px, palette navigates.`);
}

await main();
