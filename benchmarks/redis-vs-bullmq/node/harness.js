// BullMQ harness for the redis-vs-bullmq benchmark lab (/labs/redis-vs-bullmq).
//
// Same methodology as the Go Redis Streams harness (../go/main.go), on purpose — the two must be
// directly comparable: enqueue `jobs` jobs first (each carrying a payload of exactly `payload`
// bytes and an enqueue timestamp), only start the `workers` concurrent Worker instances once
// enqueueing is done, and measure drain-from-backlog throughput and per-job latency. No artificial
// processing delay in the job handler — this measures BullMQ's own queueing/dispatch overhead, the
// same thing the Go harness isolates.
//
// Usage: node harness.js --payload 1024 --workers 5 --jobs 3000 --redis-host redis --redis-port 6379

import { Queue, Worker } from 'bullmq';
import crypto from 'node:crypto';

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
  }
  return {
    payload: Number(args.payload ?? 1024),
    workers: Number(args.workers ?? 1),
    jobs: Number(args.jobs ?? 3000),
    redisHost: args['redis-host'] ?? 'redis',
    redisPort: Number(args['redis-port'] ?? 6379),
  };
}

function randomPayload(bytes) {
  // Same construction as the Go harness's randomPayload: base64-encode raw random bytes and
  // truncate to the exact target length, so both harnesses ship the same-sized payload.
  const raw = crypto.randomBytes(Math.floor((bytes * 3) / 4) + 1);
  return raw.toString('base64').slice(0, bytes);
}

function percentile(sorted, p) {
  const idx = Math.min(Math.floor((sorted.length * p) / 100), sorted.length - 1);
  return sorted[idx];
}

async function main() {
  const { payload, workers, jobs, redisHost, redisPort } = parseArgs();
  const connection = { host: redisHost, port: redisPort, maxRetriesPerRequest: null };
  const queueName = 'bench-queue';

  const queue = new Queue(queueName, { connection });
  // Clean slate: drop any state left by a previous run.
  await queue.obliterate({ force: true }).catch(() => {});

  const body = randomPayload(payload);

  process.stderr.write(`[bullmq] enqueueing ${jobs} jobs (${payload} bytes each)...\n`);
  const enqueueStart = performance.now();
  // bulkAdd is the fair comparison to the Go harness's tight XADD loop — both are the queue
  // client's own fastest path for enqueueing many jobs, not an artificially slow one-by-one call.
  const bulk = Array.from({ length: jobs }, () => ({
    name: 'bench-job',
    data: { ts: Date.now(), payload: body },
  }));
  await queue.addBulk(bulk);
  const enqueueSeconds = (performance.now() - enqueueStart) / 1000;
  process.stderr.write(`[bullmq] enqueue done in ${enqueueSeconds.toFixed(2)}s, starting ${workers} worker(s)...\n`);

  const latencies = [];
  let completed = 0;

  const drainStart = performance.now();
  const done = new Promise((resolve) => {
    const workerInstances = Array.from({ length: workers }, () => {
      const w = new Worker(
        queueName,
        async (job) => {
          const latencyMs = Date.now() - job.data.ts;
          latencies.push(latencyMs);
          completed += 1;
          if (completed >= jobs) resolve(workerInstances);
        },
        { connection, concurrency: 1 }
      );
      return w;
    });
  });

  const workerInstances = await done;
  const durationSeconds = (performance.now() - drainStart) / 1000;

  await Promise.all(workerInstances.map((w) => w.close()));
  await queue.close();

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  const result = {
    engine: 'bullmq',
    payloadBytes: payload,
    workers,
    jobs,
    throughputPerSec: jobs / durationSeconds,
    avgLatencyMs: avg,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    durationSeconds,
    enqueueSeconds,
  };

  console.log(JSON.stringify(result));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
