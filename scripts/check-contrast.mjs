// WCAG contrast audit across both themes.
//
// Why this exists: `.ai/audit-followups.md` item 2 flagged ~44 `text-slate-400` occurrences as
// "potentially borderline" and deliberately did not touch them, because nobody had measured which
// ones actually fail. That was the right call — a blind global colour change is a worse outcome than
// an unmeasured one — but it left the question open. Adding dark mode made it urgent: the neutral
// ramp is hand-tuned (see the token block in src/index.css), and "I think these values are legible"
// is not a thing to ship on.
//
// This measures instead of guessing. For every visible text node it resolves the effective
// background by walking up the ancestor chain past transparent fills, computes the WCAG 2.1
// contrast ratio, and applies the large-text threshold where the font metrics earn it.
//
// Usage: npm run check:contrast          (needs `npm run preview` already running)
//        npm run check:contrast -- --base=http://localhost:5173

import { chromium } from 'playwright';
import { readArticleRoutes, staticRoutes } from './lib/site-routes.mjs';

const CONCURRENCY = 4;

function parseArgs() {
  const baseArg = process.argv.find((a) => a.startsWith('--base='));
  return { base: baseArg ? baseArg.slice('--base='.length) : 'http://localhost:4173/portfolio' };
}

/**
 * Runs in the page. Kept as one self-contained function because it is serialized into the browser
 * — it cannot close over anything from this module.
 */
function auditPage() {
  const parseRgb = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };

  const luminance = ({ r, g, b }) => {
    const chan = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  };

  const ratio = (fg, bg) => {
    const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  };

  // Composite a partially transparent colour over what is behind it, so `bg-surface/90` and
  // `text-slate-500/70` are measured as rendered rather than as authored.
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });

  /** Walks ancestors until an opaque background is found, compositing translucent layers on the way. */
  const effectiveBg = (el) => {
    let layers = [];
    for (let node = el; node && node !== document.documentElement.parentNode; node = node.parentElement) {
      const bg = parseRgb(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 1) break;
      }
    }
    if (layers.length === 0) return { r: 255, g: 255, b: 255, a: 1 };
    // innermost last so the fold composites outermost-first
    return layers.reverse().reduce((acc, layer) => over(layer, acc));
  };

  const findings = [];
  const seen = new Set();

  for (const el of document.querySelectorAll('body *')) {
    // SVG text is out of scope: it is painted with `fill`, not `color`, and sits on shapes rather
    // than CSS backgrounds, so the ancestor walk below cannot resolve a meaningful pair — it
    // reports fg == bg and produces a 1:1 false positive. Mermaid diagrams are excluded for the
    // same reason plus a second one: they render on a deliberately fixed light card (see
    // --c-diagram-bg in src/index.css) with colours Mermaid chooses, not ours.
    if (el.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
    if (el.closest('svg, .mermaid-diagram')) continue;

    // Only elements that render their own text, not containers that merely wrap it.
    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!ownText) continue;

    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    const fgRaw = parseRgb(style.color);
    if (!fgRaw) continue;
    const bg = effectiveBg(el);
    const fg = fgRaw.a < 1 ? over(fgRaw, bg) : fgRaw;

    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    // WCAG "large text": >=24px, or >=18.66px when bold.
    const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
    const threshold = isLarge ? 3 : 4.5;

    const value = ratio(fg, bg);
    if (value >= threshold) continue;

    const key = `${style.color}|${style.fontSize}|${el.className}`;
    if (seen.has(key)) continue;
    seen.add(key);

    findings.push({
      ratio: Math.round(value * 100) / 100,
      threshold,
      color: style.color,
      fontSize: style.fontSize,
      className: typeof el.className === 'string' ? el.className.slice(0, 110) : '',
      sample: ownText.slice(0, 50),
    });
  }

  return findings;
}

async function main() {
  const { base } = parseArgs();
  const routes = [...staticRoutes, '/search', ...readArticleRoutes('check-contrast')];
  const browser = await chromium.launch();
  const results = [];

  // Sequential per scheme, CONCURRENCY pages wide within it — this is a diagnostic, not a hot path.
  const contexts = [];
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme });
    contexts.push(context);
    const pages = await Promise.all(Array.from({ length: CONCURRENCY }, () => context.newPage()));
    let i = 0;
    await Promise.all(
      pages.map(async (page) => {
        for (;;) {
          const index = i++;
          if (index >= routes.length) break;
          const route = routes[index];
          try {
            await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 25_000 });
            await page.waitForTimeout(200);
            for (const f of await page.evaluate(auditPage)) results.push({ route, colorScheme, ...f });
          } catch (error) {
            console.warn(`[check-contrast] ${colorScheme} ${route}: ${error.message}`);
          }
        }
      })
    );
  }
  for (const c of contexts) await c.close();
  await browser.close();

  // Group by the actual style that fails, not by route: one bad token shows up on 40 pages, and a
  // per-route list would bury the four or five real causes under hundreds of duplicates.
  //
  // The printed className must come from the WORST node in the group, not the first one seen.
  // Grouping on colour+size alone merges elements with different classes, and reporting the first
  // class next to the group's worst ratio attributes a bad number to innocent markup — which sent
  // an earlier run chasing a 1:1 reading on an element that actually measured 3.58:1.
  const byStyle = new Map();
  for (const r of results) {
    const key = `${r.colorScheme}|${r.color}|${r.fontSize}`;
    const entry = byStyle.get(key);
    if (!entry) {
      byStyle.set(key, { ...r, count: 1, routes: new Set([r.route]), worst: r.ratio });
      continue;
    }
    entry.count += 1;
    entry.routes.add(r.route);
    if (r.ratio < entry.worst) {
      entry.worst = r.ratio;
      entry.className = r.className;
      entry.sample = r.sample;
      entry.threshold = r.threshold;
    }
    byStyle.set(key, entry);
  }

  const sorted = [...byStyle.values()].sort((a, b) => a.worst - b.worst);
  if (sorted.length === 0) {
    console.log(`[check-contrast] PASS — no text below WCAG AA across ${routes.length} routes x 2 themes.`);
    return;
  }

  console.log(`[check-contrast] ${sorted.length} distinct failing style(s) across ${routes.length} routes x 2 themes:\n`);
  for (const f of sorted) {
    console.log(
      `  [${f.colorScheme}] ${f.worst}:1 (needs ${f.threshold}) ${f.color} @ ${f.fontSize} — ${f.count} node(s), ${f.routes.size} route(s)`
    );
    console.log(`      class: ${f.className}`);
    console.log(`      text:  ${JSON.stringify(f.sample)}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[check-contrast] ${error.stack ?? error.message}`);
  process.exit(1);
});
