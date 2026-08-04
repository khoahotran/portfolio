const e=`---
title: "Distributed Tracing with OpenTelemetry and Jaeger"
date: "2026-06-28"
tags: ["opentelemetry", "jaeger", "observability", "go", "distributed-systems", "tracing"]
summary: "A practical guide to instrumenting Go microservices with OpenTelemetry: from SDK setup to trace context propagation, sampling strategies, and reading Jaeger flame graphs."
reading_time: "10 min read"
---

## The Debugging Problem at Scale

In a monolith, a slow API call is diagnosed with a single profiler. In a distributed system, that same slow call might traverse a GraphQL gateway, two gRPC services, a Redis lookup, and a Kafka publish before returning. The slowness could live anywhere in that chain.

Without distributed tracing, debugging means correlating fragmented logs across multiple services using a shared request ID — an error-prone, slow process that falls apart under high load when log volumes spike.

**Distributed tracing solves this** by propagating a single trace context from the moment a request enters the system through every hop until the final response. Every service adds its own span to the trace, and the tracing backend assembles them into a complete flamegraph of the request lifecycle.

We instrumented all four services in **Aegis** with OpenTelemetry (OTel) and Jaeger. Here is exactly how we did it.

---

## Core Concepts

Before implementation, three terms matter:

\`\`\`
Trace
  └── Span (GraphQL Gateway: resolve Login)
        └── Span (gRPC: IdentityService.Login)
              └── Span (DB: SELECT user WHERE email = ?)
              └── Span (CPU: Argon2id verify)
        └── Span (Kafka: publish auth.login.succeeded)
              └── Span (AuditService: INSERT audit_log)
\`\`\`

- **Trace**: The complete journey of one request, identified by a \`trace_id\`.
- **Span**: A single unit of work within a trace. It has a start time, duration, attributes, and optional events.
- **Context propagation**: The mechanism by which the \`trace_id\` and parent \`span_id\` travel between services (via HTTP headers or gRPC metadata).

---

## SDK Initialization

Every service calls \`telemetry.InitTracer\` at startup before accepting traffic:

\`\`\`go
package telemetry

import (
    "context"
    "fmt"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

// InitTracer sets up the OTel SDK, connects to Jaeger via OTLP/gRPC,
// and returns a shutdown func to flush pending spans on exit.
func InitTracer(ctx context.Context, serviceName, jaegerEndpoint string) (func(context.Context) error, error) {
    conn, err := grpc.DialContext(ctx, jaegerEndpoint,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithBlock(),
    )
    if err != nil {
        return nil, fmt.Errorf("connecting to jaeger: %w", err)
    }

    exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithGRPCConn(conn))
    if err != nil {
        return nil, fmt.Errorf("creating otlp exporter: %w", err)
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(semconv.ServiceName(serviceName)),
        resource.WithHost(),
        resource.WithProcess(),
    )
    if err != nil {
        return nil, fmt.Errorf("creating resource: %w", err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        // Sample 100% in dev; use ParentBased(TraceIDRatioBased(0.05)) in prod
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    // Set the global tracer provider and propagator
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{}, // W3C Trace-Context standard
        propagation.Baggage{},
    ))

    return tp.Shutdown, nil
}
\`\`\`

**Usage in \`main.go\`:**

\`\`\`go
func main() {
    ctx := context.Background()

    shutdown, err := telemetry.InitTracer(ctx, "identity-service", "jaeger:4317")
    if err != nil {
        log.Fatalf("failed to init tracer: %v", err)
    }
    defer shutdown(ctx)

    // ... start gRPC server
}
\`\`\`

---

## Automatic vs. Manual Instrumentation

OTel separates instrumentation into two tiers:

### Automatic (Zero-Code) Instrumentation

For gRPC calls, the \`otelgrpc\` package instruments every RPC automatically. Install it once on the server and client:

\`\`\`go
// Server side — intercepts all incoming RPCs
grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()),
)

// Client side — propagates trace context on all outgoing RPCs
conn, err := grpc.Dial(address,
    grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
)
\`\`\`

With this in place, every gRPC call between the gateway and the Identity Service automatically creates a child span without any changes to handler code.

### Manual (Custom Span) Instrumentation

For business-level operations — like measuring how long Argon2id hashing takes — we create spans explicitly:

\`\`\`go
package identity

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "golang.org/x/crypto/argon2"
)

var tracer = otel.Tracer("identity-service")

// VerifyPassword verifies an Argon2id hash and records a span for the operation.
// This lets us observe exactly how much latency the hash verification adds per request.
func VerifyPassword(ctx context.Context, hash, password string) (bool, error) {
    ctx, span := tracer.Start(ctx, "argon2id.verify")
    defer span.End()

    span.SetAttributes(
        attribute.String("hash.algorithm", "argon2id"),
        attribute.Int("hash.memory_kb", 64*1024),
        attribute.Int("hash.iterations", 3),
    )

    // Derive the key using the same Argon2id parameters as registration
    key := argon2.IDKey([]byte(password), extractSalt(hash), 3, 64*1024, 4, 32)

    match := string(key) == extractKey(hash)
    if !match {
        span.SetStatus(codes.Error, "password verification failed")
    }

    return match, nil
}
\`\`\`

The result in Jaeger: a child span called \`argon2id.verify\` that shows exactly 85–115ms of CPU time, clearly isolated from the surrounding database I/O latency.

---

## Trace Context Propagation Across Kafka

gRPC propagates context automatically, but Kafka message headers require explicit injection:

\`\`\`go
package events

import (
    "context"
    "encoding/json"

    "github.com/segmentio/kafka-go"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

var propagator = otel.GetTextMapPropagator()

// Publish sends a Kafka message with OTel trace context injected into headers.
// This connects the publisher's trace to the consumer's trace, creating a single
// end-to-end trace spanning both services.
func Publish(ctx context.Context, writer *kafka.Writer, topic string, payload any) error {
    data, err := json.Marshal(payload)
    if err != nil {
        return err
    }

    // Carrier adapts kafka.Message.Headers to the OTel TextMapCarrier interface
    headers := make(kafkaHeaderCarrier)
    propagator.Inject(ctx, headers)

    return writer.WriteMessages(ctx, kafka.Message{
        Topic:   topic,
        Value:   data,
        Headers: headers.ToKafkaHeaders(),
    })
}

// Extract recovers the trace context from an incoming Kafka message.
func Extract(ctx context.Context, msg kafka.Message) context.Context {
    headers := kafkaHeadersToCarrier(msg.Headers)
    return propagator.Extract(ctx, headers)
}
\`\`\`

With \`Extract\` called at the start of every Kafka consumer loop, the Audit Service's spans appear as children of the Identity Service's publish span — giving us a single trace that spans the entire auth event lifecycle.

---

## Sampling Strategies

Sampling 100% of traces is fine in development but unsustainable at production scale. Here is how we configure sampling per environment:

\`\`\`go
func getSampler(env string) sdktrace.Sampler {
    switch env {
    case "production":
        // Sample 5% of traces, but always sample when parent is sampled.
        // This ensures complete traces for sampled requests even across services.
        return sdktrace.ParentBased(
            sdktrace.TraceIDRatioBased(0.05),
        )
    case "staging":
        return sdktrace.ParentBased(
            sdktrace.TraceIDRatioBased(0.50),
        )
    default:
        return sdktrace.AlwaysSample()
    }
}
\`\`\`

> **Critical rule:** Always use \`ParentBased\` in production. If the gateway samples a trace (5% chance), all downstream services must also sample it — otherwise the trace is incomplete. \`ParentBased\` ensures child services respect the parent's sampling decision.

---

## Reading a Jaeger Flamegraph

Once traces flow into Jaeger, a login request produces something like:

\`\`\`
[Total: 210ms]
├── GraphQL: resolve Login mutation           [210ms]
│    ├── gRPC: IdentityService.Login          [195ms]
│    │    ├── DB: SELECT user by email        [8ms]
│    │    ├── argon2id.verify                 [105ms]  ← CPU bottleneck
│    │    ├── JWT: sign access token          [2ms]
│    │    └── Kafka: publish login.succeeded  [12ms]
│    └── middleware: auth interceptor         [2ms]
\`\`\`

Key patterns to watch for:

| Observation | Diagnosis |
|:---|:---|
| Long gap between parent span start and first child span | Network latency or connection pool wait |
| Multiple identical DB query spans | N+1 query — batch the reads |
| \`argon2id.verify\` > 200ms | Argon2id parameters too aggressive; reduce iterations |
| Kafka publish span > 100ms | Broker lag or producer batch timeout |
| Missing child spans for a service | Context propagation broken — check header injection |

---

## Key Takeaways

1. **Initialize before accepting traffic.** The OTel \`TracerProvider\` must be set globally before the gRPC or HTTP server binds — otherwise early requests produce unconnected traces.
2. **Use \`ParentBased\` sampling in production.** Child services must respect the parent's sampling decision, or traces will be incomplete fragments.
3. **Inject context into Kafka headers explicitly.** Unlike gRPC, Kafka has no automatic propagation — you must implement the \`TextMapCarrier\` adapter for message headers.
4. **Manual spans are the most valuable.** Auto-instrumentation gives you RPC latencies; manual spans reveal *why* something is slow inside a handler (hash verification, cache miss logic, etc.).
`;export{e as default};
