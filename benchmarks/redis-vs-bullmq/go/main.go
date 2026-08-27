// Redis Streams harness for the redis-vs-bullmq benchmark lab (/labs/redis-vs-bullmq).
//
// Methodology: enqueue `jobs` messages onto a Redis Stream (XADD), each carrying a payload of
// exactly `payload` bytes and an enqueue timestamp. Only once every message is enqueued do the
// consumer workers start reading (XREADGROUP) — this measures steady-state drain throughput from a
// full backlog, not production-and-consumption overlap, which is the more interesting number for
// "how fast can N workers drain a queue" and keeps the methodology identical to the BullMQ harness
// (node/harness.js), which does the same enqueue-then-drain split.
//
// Each worker is a real goroutine reading with its own consumer name inside a shared consumer
// group, XACKing on receipt — there is no artificial processing delay, so this measures pure
// queueing/dispatch overhead, matching what the lab's copy claims ("raw queueing performance").
//
// Usage: go run . -payload 1024 -workers 5 -jobs 3000 -redis-addr redis:6379
// Prints one line of JSON to stdout; all diagnostic output goes to stderr.
package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

type result struct {
	Engine           string  `json:"engine"`
	PayloadBytes     int     `json:"payloadBytes"`
	Workers          int     `json:"workers"`
	Jobs             int     `json:"jobs"`
	ThroughputPerSec float64 `json:"throughputPerSec"`
	AvgLatencyMs     float64 `json:"avgLatencyMs"`
	P50LatencyMs     float64 `json:"p50LatencyMs"`
	P95LatencyMs     float64 `json:"p95LatencyMs"`
	DurationSeconds  float64 `json:"durationSeconds"`
	EnqueueSeconds   float64 `json:"enqueueSeconds"`
}

func randomPayload(n int) string {
	// base64 inflates by ~4/3, so request 3/4 of the raw bytes to land close to the target size.
	raw := make([]byte, (n*3)/4+1)
	if _, err := rand.Read(raw); err != nil {
		panic(err)
	}
	s := base64.StdEncoding.EncodeToString(raw)
	if len(s) > n {
		s = s[:n]
	}
	return s
}

func main() {
	redisAddr := flag.String("redis-addr", "redis:6379", "Redis address")
	payload := flag.Int("payload", 1024, "payload size in bytes")
	workers := flag.Int("workers", 1, "number of concurrent consumer workers")
	jobs := flag.Int("jobs", 3000, "total number of jobs to enqueue and drain")
	streamKey := flag.String("stream", "bench:stream", "Redis Stream key")
	group := flag.String("group", "bench:group", "consumer group name")
	flag.Parse()

	ctx := context.Background()
	rdb := redis.NewClient(&redis.Options{Addr: *redisAddr})
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		fmt.Fprintf(os.Stderr, "redis ping failed: %v\n", err)
		os.Exit(1)
	}

	// Clean slate: a stale stream/group from a previous run would corrupt the job count.
	rdb.Del(ctx, *streamKey)
	if err := rdb.XGroupCreateMkStream(ctx, *streamKey, *group, "0").Err(); err != nil {
		fmt.Fprintf(os.Stderr, "create group failed: %v\n", err)
		os.Exit(1)
	}

	body := randomPayload(*payload)

	fmt.Fprintf(os.Stderr, "[redis-streams] enqueueing %d jobs (%d bytes each)...\n", *jobs, *payload)
	enqueueStart := time.Now()
	for i := 0; i < *jobs; i++ {
		ts := time.Now().UnixMilli()
		err := rdb.XAdd(ctx, &redis.XAddArgs{
			Stream: *streamKey,
			Values: map[string]interface{}{
				"ts":      ts,
				"payload": body,
			},
		}).Err()
		if err != nil {
			fmt.Fprintf(os.Stderr, "xadd failed at job %d: %v\n", i, err)
			os.Exit(1)
		}
	}
	enqueueSeconds := time.Since(enqueueStart).Seconds()
	fmt.Fprintf(os.Stderr, "[redis-streams] enqueue done in %.2fs, starting %d worker(s)...\n", enqueueSeconds, *workers)

	var completed int64
	latencies := make([]float64, 0, *jobs)
	var latMu sync.Mutex
	var wg sync.WaitGroup

	drainStart := time.Now()
	done := make(chan struct{})

	for w := 0; w < *workers; w++ {
		wg.Add(1)
		consumerName := fmt.Sprintf("worker-%d", w)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-done:
					return
				default:
				}

				streams, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
					Group:    *group,
					Consumer: consumerName,
					Streams:  []string{*streamKey, ">"},
					Count:    10,
					Block:    200 * time.Millisecond,
				}).Result()
				if err != nil {
					if err == redis.Nil {
						continue
					}
					continue
				}

				for _, s := range streams {
					for _, msg := range s.Messages {
						tsRaw, _ := msg.Values["ts"].(string)
						var tsMillis int64
						fmt.Sscanf(tsRaw, "%d", &tsMillis)
						latencyMs := float64(time.Now().UnixMilli()-tsMillis)

						rdb.XAck(ctx, *streamKey, *group, msg.ID)

						latMu.Lock()
						latencies = append(latencies, latencyMs)
						latMu.Unlock()

						n := atomic.AddInt64(&completed, 1)
						if n >= int64(*jobs) {
							close(done)
							return
						}
					}
				}
			}
		}()
	}

	wg.Wait()
	durationSeconds := time.Since(drainStart).Seconds()

	sort.Float64s(latencies)
	sum := 0.0
	for _, l := range latencies {
		sum += l
	}
	avg := sum / float64(len(latencies))
	p50 := latencies[len(latencies)*50/100]
	p95 := latencies[min(len(latencies)*95/100, len(latencies)-1)]

	res := result{
		Engine:           "redis-streams",
		PayloadBytes:     *payload,
		Workers:          *workers,
		Jobs:             *jobs,
		ThroughputPerSec: float64(*jobs) / durationSeconds,
		AvgLatencyMs:     avg,
		P50LatencyMs:     p50,
		P95LatencyMs:     p95,
		DurationSeconds:  durationSeconds,
		EnqueueSeconds:   enqueueSeconds,
	}

	out, _ := json.Marshal(res)
	fmt.Println(string(out))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
