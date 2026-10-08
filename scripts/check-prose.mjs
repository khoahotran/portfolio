// Blocks the em dash.
//
// Why a gate and not a line in the style guide: this repo has already watched an unenforced
// convention decay. check:contrast existed for a whole phase while nobody ran it, which is what
// `.ai/audit-followups.md` item 9 is about. 2,195 em dashes had accumulated across 217 files by the
// time anyone asked for a hyphen, so the convention needs something that fails a build.
//
// The `&mdash;` entity is checked too: it renders identically, so catching only the literal
// character would leave the obvious workaround open.
//
// Usage: npm run check:prose

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { walkFiles } from './lib/walk-files.mjs';

const PATTERNS = [
  { find: /—/g, name: 'em dash (—)', use: 'a plain hyphen -' },
  { find: /&mdash;/g, name: '&mdash; entity', use: 'a plain hyphen -' },
];

const files = [
  ...walkFiles('src', ['.ts', '.tsx', '.css']),
  ...walkFiles('content', ['.md']),
  ...walkFiles('scripts', ['.mjs']),
  ...walkFiles('.ai', ['.md']),
  ...readdirSync('.', { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name),
  'index.html',
].filter(existsSync);

/**
 * Naming the character is documentation; using it is the violation. A line that writes the em dash
 * inside backticks is spelling out the rule (the style guide does exactly this), so inline code
 * spans are stripped before the line is tested. Without that carve-out the only way to document
 * the convention would be to break it.
 */
function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, '``');
}

const SELF = 'scripts/check-prose.mjs';

const findings = [];
for (const file of files) {
  // This file holds the patterns as regex literals, so it cannot describe its own job without
  // containing the character it looks for.
  if (file === SELF) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const subject = stripInlineCode(line);
    for (const { find, name, use } of PATTERNS) {
      find.lastIndex = 0;
      if (find.test(subject)) {
        findings.push({ file, line: i + 1, name, use, text: line.trim().slice(0, 80) });
      }
    }
  });
}

if (findings.length > 0) {
  for (const f of findings.slice(0, 40)) {
    console.error(`${f.file}:${f.line}  ${f.name} -> use ${f.use}`);
    console.error(`  ${f.text}`);
  }
  if (findings.length > 40) console.error(`  ... and ${findings.length - 40} more`);
  console.error(`\n[check-prose] ${findings.length} em dash(es) across ${new Set(findings.map((f) => f.file)).size} file(s).`);
  process.exit(1);
}

console.log(`[check-prose] PASS - no em dashes across ${files.length} files.`);
