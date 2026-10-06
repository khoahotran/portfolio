# websockets-vs-sse benchmark harness

Backs [`/labs/websockets-vs-sse`](https://khoahotran.github.io/portfolio/labs/websockets-vs-sse) and
the [WebSockets vs Server-Sent Events](https://khoahotran.github.io/portfolio/experiments/websockets-vs-sse)
article. Written *before* the article's numbers, per `.ai/phases/phase-5.md` §5.8's lesson: every
prior benchmark that skipped this step ended up with a hardcoded, unreproducible dataset.

## What it measures

One Go binary, two roles (`-role=server` / `-role=client`), so the only variable between a WebSocket
run and an SSE run is the transport — both are implemented in the same language and process model,
deliberately avoiding the confound a language/runtime difference would introduce (that comparison is
what `../go-vs-ts-concurrency/` already measures, separately).

The server exposes `/ws` and `/sse`, broadcasting a timestamped tick to every connected client every
200ms. The client opens N concurrent long-lived connections to one transport, waits for them to
establish, holds them open for 3 seconds (so broadcasts actually flow and the server reaches a
steady state), then reads the server's own `/stats` endpoint.

**Peak memory** is the server's own `/proc/self/status` `VmHWM` — same technique as
`../go-vs-ts-concurrency/`'s harness — read *after* N connections have been open and receiving
broadcasts for several seconds. The server is restarted fresh before every single data point
(not just between transports) because `VmHWM` is a monotonic high-water mark for the life of a
process — reusing one server across connection counts would have every run after the first report
the *previous* run's peak, not its own.

**Connect time** is wall-clock from the first dial attempt to the Nth connection completing its
handshake. See the honesty note below — this metric turned out to be far less reliable than memory.

## Reproducing it

Requires Docker and Docker Compose.

```bash
cd benchmarks/websockets-vs-sse
./run.sh
```

Builds the harness image and runs all 6 combinations (connection counts 100 / 1,000 / 5,000, for
both transports), writing `results.json` — the exact file the interactive lab imports (a copy lives
at `src/pages/experiments/websockets-vs-sse-results.json`; keep the two in sync after a re-run).

To run one combination manually:

```bash
docker compose up -d server
docker compose run --rm client -role=client -mode=ws  -conns=5000 -host=server:8090 -holdSeconds=3
docker compose run --rm client -role=client -mode=sse -conns=5000 -host=server:8090 -holdSeconds=3
```

## The finding: memory is close and consistent, not the gap conventional wisdom assumes

At 5,000 held-open connections, WebSocket used **122.2MB** peak RSS against SSE's **137.5MB** — SSE
is *not* the leaner transport here, contrary to the intuition that a "simpler" one-directional
protocol should cost less to hold open. Across the full matrix (100 / 1,000 / 5,000 connections),
the two transports track within single-digit percent of each other at every point, with SSE
consistently slightly higher — most plausibly explained by this harness's own SSE handler holding a
`bufio.Reader` and manual header-parsing state per connection that the WebSocket path (handled
entirely inside `gorilla/websocket`) doesn't carry. That is a property of *this implementation*, not
a law about the wire protocols themselves — a production SSE library optimized for this exact
case could plausibly close or reverse the small gap.

**This has been run at the 5,000-connection point three separate times across this harness's
lifetime** — the original committed matrix, one manual spot-check re-run, and a full re-run after a
later robustness fix to the SSE client (a read-deadline guard and a buffered-reader fix, neither of
which touches what's actually measured — see Decision 21 in `.ai/decision-log.md`) — and the memory
figures reproduced closely across all three (124.8MB/137.1MB, 126.1MB/136.1MB, then this file's
current 122.2MB/137.5MB). Memory is the metric this README treats as reliable.

## Honesty about connect time

This is the part worth stating plainly rather than smoothing over: **connect-time showed high
run-to-run variance at the 5,000-connection point on the sandboxed host this ran on, across all
three runs**, including reversing which transport was faster (run 1: WS 1,311ms vs. SSE 4,136ms;
run 2: WS 2,281ms vs. SSE 2,068ms; run 3 — this file's current committed numbers — WS 1,908ms vs.
SSE 2,702ms). Opening 5,000 concurrent TCP connections from one client process is exactly the kind
of workload sensitive to host scheduling jitter, container CPU contention, and ephemeral-port/
file-descriptor pressure — this harness does not isolate those from the number it reports. The
`connectMs` field is committed in `results.json`
for transparency, and the lab surfaces it, but neither the lab nor the companion article draws a
conclusion from it. If you re-run this harness and get a different connect-time gap than what's
committed, that is expected, not a bug — it is genuinely the less trustworthy of this benchmark's
two numbers, and this file exists partly to say so before a reader has to discover it themselves.

## Honesty about the environment

Both transports ran on the same local host, one at a time. Host hardware is whatever machine runs
`./run.sh` — re-run it before quoting an exact figure if the number matters to you. The broadcast
interval (200ms) and hold duration (3s) are fixed constants in the harness, not tuned per run.
