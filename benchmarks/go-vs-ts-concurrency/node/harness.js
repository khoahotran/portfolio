// Node.js harness for the go-vs-ts-concurrency benchmark lab (/labs/go-vs-ts-concurrency).
//
// Mirrors ../go/main.go exactly: N concurrent workers, each a mock 50ms network request (a
// setTimeout, not a real network call), driven by Promise.all over N async functions — matching
// the methodology already stated in content/experiments/go-vs-ts-concurrency.md ("Node.js
// Implementation: Uses Promise.all() over an array of asynchronous functions").
//
// Peak memory is read from /proc/self/status VmHWM, the OS's own peak-RSS accounting — the same
// source the Go harness uses, so the two are compared on identical footing rather than Go using an
// OS-level peak and Node using a periodically-sampled process.memoryUsage().rss, which could miss
// the actual peak between samples.
//
// Usage: node harness.js --tasks 10000

import { readFileSync } from 'node:fs';

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
  }
  return { tasks: Number(args.tasks ?? 10000) };
}

function peakRssKB() {
  const status = readFileSync('/proc/self/status', 'utf8');
  const match = status.match(/^VmHWM:\s+(\d+)\s+kB$/m);
  if (!match) throw new Error('VmHWM not found in /proc/self/status');
  return Number(match[1]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { tasks } = parseArgs();

  process.stderr.write(`[node] spawning ${tasks} concurrent tasks, each sleeping 50ms...\n`);

  const start = performance.now();
  await Promise.all(Array.from({ length: tasks }, () => sleep(50)));
  const durationMs = performance.now() - start;

  const peakKB = peakRssKB();

  const result = {
    language: 'node',
    tasks,
    peakMemoryMB: peakKB / 1024,
    durationMs,
  };
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
