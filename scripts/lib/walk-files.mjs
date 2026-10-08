// A dependency-free, version-portable file walker.
//
// This exists because of a real CI failure. `globSync` from `node:fs` landed in Node 22; the
// check:prose and check:type-scale gates were written on Node 24 and passed locally, then failed
// on CI's Node 20 with "does not provide an export named 'globSync'". The gates were correct and
// the environment was not, which is the worst shape a gate failure can take - it says nothing
// about the code under test.
//
// Two fixes were possible: raise CI's Node, or stop depending on the version. Raising CI would
// have moved the deploy job onto an untested runtime to satisfy a convenience import, so the
// scripts stopped depending on the version instead. `readdirSync` with `withFileTypes` has been
// stable for a decade.
//
// Usage: walkFiles('src', ['.ts', '.tsx']) -> ['src/App.tsx', ...] (paths relative to cwd)

import { readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', '.vite']);

export function walkFiles(dir, extensions) {
  const wanted = new Set(extensions);
  const out = [];

  const visit = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      // A directory listed by a caller but absent from this checkout is not a failure - the
      // callers pass a fixed list of roots and some are optional.
      return;
    }

    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (wanted.has(extname(entry.name))) {
        out.push(full);
      }
    }
  };

  visit(dir);
  return out.sort();
}
