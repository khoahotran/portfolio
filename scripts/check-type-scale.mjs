// Blocks font sizes set by hand, outside the type scale.
//
// Why this exists: before the token layer there was no `fontFamily` and no `fontSize` scale in
// tailwind.config.js at all, so headings were sized ad-hoc (`text-4xl md:text-5xl` on one page,
// `text-3xl` on the next) and 77 places reached for an arbitrary value like `text-[10px]`. Two
// headings meant to be the same size were not, and nothing caught it.
//
// A scale that is not enforced decays back into ad-hoc values within a few features, so this is a
// gate rather than a convention in a document. It is a source check, not a browser check - it runs
// in milliseconds and needs no build.
//
// Usage: npm run check:type-scale

import { readFileSync, writeFileSync, globSync } from 'node:fs';

const SCALE = ['d1', 'd2', 'd3', 'lead', 'body', 'meta', 'micro', 'nano'];

// Tailwind's own size names. Allowed only where the scale has no equivalent - which, by design, is
// nowhere: every one of these has a token. Listed so the error can say what to use instead.
const LEGACY = {
  'text-xs': 'text-micro',
  'text-sm': 'text-meta',
  'text-base': 'text-body',
  'text-lg': 'text-lead',
  'text-xl': 'text-d3',
  'text-2xl': 'text-d3',
  'text-3xl': 'text-d2',
  'text-4xl': 'text-d2',
  'text-5xl': 'text-d1',
  'text-6xl': 'text-d1',
  'text-7xl': 'text-d1',
};

const ARBITRARY = /\btext-\[[^\]]*(?:px|rem|em|pt)\]/g;
const LEGACY_RE = new RegExp(`\\b(${Object.keys(LEGACY).join('|')})\\b`, 'g');

function scan(files) {
  const findings = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(ARBITRARY)) {
        findings.push({ file, line: i + 1, found: m[0], use: `one of ${SCALE.map((s) => `text-${s}`).join(', ')}` });
      }
      for (const m of line.matchAll(LEGACY_RE)) {
        findings.push({ file, line: i + 1, found: m[1], use: LEGACY[m[1]] });
      }
    });
  }
  return findings;
}

const files = [
  ...globSync('src/**/*.{ts,tsx}'),
  ...globSync('content/**/*.md'),
].filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));

const findings = scan(files);

// A ratchet, not a clean-or-fail gate. The token layer landed with 118 display-size uses still
// outside the scale (text-lg and up), and migrating those is not mechanical: text-xs/sm/base map
// onto micro/meta/body at the identical pixel size, but text-3xl -> d2 genuinely resizes the
// heading. Those belong to the phase that redesigns the surface they sit on, not to a token commit
// that would be hiding a visual change inside a mechanical one.
//
// The alternative was to write the gate now and wire it into CI later, once it could pass clean.
// That is exactly the failure mode .ai/audit-followups.md item 9 was filed about: check:contrast
// existed for a whole phase while nobody ran it. A gate that is not enforced on the day it is
// written does not get enforced. So this one runs from day one and holds the line at today's
// count: a new violation fails the build, and the debt can only shrink.
const BASELINE_PATH = new URL('./type-scale-baseline.json', import.meta.url);

if (process.argv.includes('--update-baseline')) {
  const counts = {};
  for (const f of findings) counts[f.file] = (counts[f.file] ?? 0) + 1;
  writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`[check-type-scale] baseline written: ${findings.length} known use(s) across ${Object.keys(counts).length} file(s).`);
  process.exit(0);
}

let baseline = {};
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
} catch {
  console.error('[check-type-scale] no baseline file. Run: npm run check:type-scale -- --update-baseline');
  process.exit(1);
}

const counts = {};
for (const f of findings) counts[f.file] = (counts[f.file] ?? 0) + 1;

const regressions = [];
for (const [file, count] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0;
  if (count > allowed) regressions.push({ file, count, allowed });
}

if (regressions.length > 0) {
  for (const r of regressions) {
    console.error(`FAIL ${r.file}: ${r.count} font size(s) outside the scale, baseline allows ${r.allowed}`);
    for (const f of findings.filter((x) => x.file === r.file)) {
      console.error(`  ${r.file}:${f.line}  ${f.found}  ->  use ${f.use}`);
    }
  }
  console.error(`\n[check-type-scale] ${regressions.length} file(s) above baseline. Use the scale, or run --update-baseline only when the count went DOWN.`);
  process.exit(1);
}

const total = findings.length;
const allowed = Object.values(baseline).reduce((a, b) => a + b, 0);
if (total < allowed) {
  console.log(`[check-type-scale] PASS - ${total} legacy size(s) left, down from ${allowed}. Run --update-baseline to lock the gain in.`);
} else {
  console.log(`[check-type-scale] PASS - no new violations; ${total} legacy display size(s) remain, to be migrated with the surfaces they sit on.`);
}
