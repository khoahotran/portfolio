# grpc-vs-rest

A real, runnable comparison of gRPC (protobuf over HTTP/2) against REST (JSON over HTTP/1.1),
isolating the protocol as the single variable — same philosophy as `benchmarks/go-vs-ts-concurrency`
isolating language runtime. Both protocols are served by the same Go process
(`server/main.go`), reading from the same deterministic data generator
(`internal/gen/user.go`), so a given id produces byte-identical *content* whether it's fetched over
gRPC or REST. The only thing that differs between a `-target grpc` and `-target rest` run is the
wire protocol and its serialization.

## What's measured

Two payload shapes, three concurrency levels — 12 runs total:

- **single** — one `User` record per request (`GetUser` / `GET /users/:id`).
- **list** — 100 `User` records per request (`ListUsers` / `GET /users?count=100`).
- **clients** — 10, 25, 50 concurrent goroutines, 30 requests each.

Both targets use one shared, reused connection for the whole run — a single `*grpc.ClientConn`
(HTTP/2 multiplexes every concurrent RPC over it) for gRPC, a single `*http.Client` with a
transport sized to the concurrency (`MaxIdleConnsPerHost`) for REST's keep-alive pooling. This is
the realistic way either protocol is actually deployed; reconnecting per request on only one side
would flatter it unfairly.

Each run reports throughput (req/s), average/p50/p95 latency, and average response payload size in
bytes (`proto.Size()` for gRPC, `len(body)` for REST — the encoded payload itself, not full HTTP/2
frame or TCP/TLS overhead; see the companion article for what that scope does and doesn't cover).

## Reproduce it

```bash
cd benchmarks/grpc-vs-rest
./run.sh
```

Requires Docker + Docker Compose. Rebuilds the harness image (generating the protobuf/gRPC Go code
from `proto/users.proto` at build time — nothing generated is committed), runs all 12
combinations, and overwrites `results.json` with real output. Takes a few minutes.

## Files

- `proto/users.proto` — the `User` message and `UserService` RPC definitions.
- `internal/gen/user.go` — the single, shared, deterministic data generator both protocols serve.
- `server/main.go` — runs both listeners: gRPC on `:50051`, REST/JSON on `:8080`.
- `client/main.go` — the bench client; `-target`, `-mode`, `-clients`, `-requests`, `-count`, `-host`.
- `Dockerfile` — multi-stage: generates protobuf/gRPC code, builds both binaries.
- `results.json` — committed raw output from the last real run; source of truth for the
  `/labs/grpc-vs-rest` lab and its companion article.
