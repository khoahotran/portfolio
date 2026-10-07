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
 * C. Header nav strip at both scroll edges.
 *
 * The strip hides its scrollbar and signals overflow with mask-image fades keyed off
 * data-scroll-start / data-scroll-end, which the component sets from real scrollLeft. At rest
 * only one of them is ever present, so a gate that measures the page on load sees exactly half
 * of this behaviour. 360px is used because the strip must actually overflow for any of it to mean
 * anything.
 */
async function checkNavStrip(page, base) {
  const failures = [];
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(300);

  const strip = page.locator('.nav-strip').first();
  if ((await strip.count()) === 0) {
    failures.push({ probe: 'nav-strip', detail: '.nav-strip not found — the header markup changed' });
    return failures;
  }

  const geometry = await strip.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    offsetHeight: el.offsetHeight,
    clientHeight: el.clientHeight,
  }));

  if (geometry.scrollWidth <= geometry.clientWidth + 2) {
    // Not a failure: a wider default font or fewer nav items could legitimately fit. But then this
    // probe is asserting nothing, and silently passing would be the exact trap item 9 describes.
    failures.push({ probe: 'nav-strip', detail: `strip does not overflow at 360px (scrollWidth ${geometry.scrollWidth} <= clientWidth ${geometry.clientWidth}); this probe can no longer verify the fades — retune the viewport or drop it` });
    return failures;
  }

  // A visible horizontal scrollbar steals layout height. This is what the fades replaced.
  if (geometry.offsetHeight - geometry.clientHeight > 2) {
    failures.push({ probe: 'nav-strip', detail: `scrollbar is taking ${geometry.offsetHeight - geometry.clientHeight}px of layout height — it should be hidden` });
  }

  const readEdges = () =>
    strip.evaluate((el) => ({
      start: el.hasAttribute('data-scroll-start'),
      end: el.hasAttribute('data-scroll-end'),
    }));

  const atLeft = await readEdges();
  if (atLeft.start || !atLeft.end) {
    failures.push({ probe: 'nav-strip', detail: `at the left edge expected end-fade only, got start=${atLeft.start} end=${atLeft.end}` });
  }

  await strip.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await page.waitForTimeout(250);
  const atRight = await readEdges();
  if (!atRight.start || atRight.end) {
    failures.push({ probe: 'nav-strip', detail: `at the right edge expected start-fade only, got start=${atRight.start} end=${atRight.end}` });
  }

  await strip.evaluate((el) => { el.scrollLeft = Math.floor(el.scrollWidth / 2); });
  await page.waitForTimeout(250);
  const middle = await readEdges();
  if (!middle.start || !middle.end) {
    failures.push({ probe: 'nav-strip', detail: `mid-scroll expected both fades, got start=${middle.start} end=${middle.end}` });
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
  console.log(`[check-interactions] graph clicks, ${labIds.length} labs' controls, nav-strip scroll edges against ${base}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const failures = [];
  failures.push(...(await withRetry('graph', () => checkGraph(page, base))));
  for (const labId of labIds) {
    failures.push(...(await withRetry(`lab/${labId}`, () => checkLab(page, base, labId))));
  }
  failures.push(...(await withRetry('nav-strip', () => checkNavStrip(page, base))));

  await browser.close();

  if (failures.length > 0) {
    console.error('');
    for (const f of failures) console.error(`FAIL [${f.probe}] ${f.detail}`);
    console.error(`\n[check-interactions] ${failures.length} failure(s).`);
    process.exit(1);
  }

  console.log(`[check-interactions] PASS — graph node click resolves, ${labIds.length} labs survive their control extremes, nav strip fades at both edges.`);
}

await main();
