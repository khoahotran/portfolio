// pgbouncer-vs-direct harness for the /labs/pgbouncer-vs-direct benchmark lab.
//
// Methodology: N concurrent client goroutines each run `queries` trivial (`SELECT 1`) round trips
// against Postgres, either directly or through pgbouncer (in transaction-pooling mode), in one of
// two connection lifecycles:
//
//   - "churn": every single query opens a brand new physical connection (full TCP handshake +
//     Postgres auth) and closes it immediately after. This is the pattern a naively-written
//     serverless function or short-lived script produces — a fresh connection per unit of work —
//     and it is exactly the case a connection pooler exists to help with.
//   - "persistent": each goroutine opens ONE connection and reuses it for all `queries` round
//     trips. This is the pattern a long-lived application server with its own connection pool
//     already produces, where a pooler in front of Postgres has nothing left to amortize and only
//     adds an extra network hop.
//
// Reporting both modes against both targets is the point: a flat "pgbouncer is N% faster" claim
// would be true in one mode and false, or even backwards, in the other — the lesson this harness
// exists to make measurable rather than asserted.
//
// Usage: go run . -target direct -host postgres -port 5432 -mode churn -clients 50 -queries 30
// Prints one line of JSON to stdout; all diagnostic output goes to stderr.
package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"sync"
	"time"

	_ "github.com/lib/pq"
)

type result struct {
	Target           string  `json:"target"`
	Mode             string  `json:"mode"`
	Clients          int     `json:"clients"`
	QueriesPerClient int     `json:"queriesPerClient"`
	TotalQueries     int     `json:"totalQueries"`
	ThroughputPerSec float64 `json:"throughputPerSec"`
	AvgLatencyMs     float64 `json:"avgLatencyMs"`
	P50LatencyMs     float64 `json:"p50LatencyMs"`
	P95LatencyMs     float64 `json:"p95LatencyMs"`
	DurationSeconds  float64 `json:"durationSeconds"`
}

func dsn(host string, port int, dbname, user, password string) string {
	return fmt.Sprintf("host=%s port=%d dbname=%s user=%s password=%s sslmode=disable", host, port, dbname, user, password)
}

// runChurn opens a fresh connection for every single query, so the recorded latency for each
// query includes the full connection setup cost — that setup cost is the entire subject of this
// benchmark, not overhead to be hidden.
func runChurn(host string, port int, dbname, user, password string, queries int) []time.Duration {
	latencies := make([]time.Duration, 0, queries)
	d := dsn(host, port, dbname, user, password)
	for i := 0; i < queries; i++ {
		start := time.Now()
		db, err := sql.Open("postgres", d)
		if err != nil {
			panic(err)
		}
		// A fresh *sql.DB per query, used exactly once — SetMaxIdleConns(0) means Close() actually
		// tears the connection down instead of parking it idle for reuse, which would silently
		// turn "churn" into "persistent" for every query after the first.
		db.SetMaxIdleConns(0)
		var one int
		if err := db.QueryRow("SELECT 1").Scan(&one); err != nil {
			panic(err)
		}
		_ = db.Close()
		latencies = append(latencies, time.Since(start))
	}
	return latencies
}

// runPersistent opens exactly one connection for the whole run and reuses it for every query.
// The first query's latency is excluded from the returned slice: it necessarily includes the
// one-time connection setup this mode exists to amortize away, and folding it in with the other
// queries would bias the "steady-state persistent connection" number toward the churn scenario
// this mode is meant to be the contrast to.
func runPersistent(host string, port int, dbname, user, password string, queries int) []time.Duration {
	d := dsn(host, port, dbname, user, password)
	db, err := sql.Open("postgres", d)
	if err != nil {
		panic(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	latencies := make([]time.Duration, 0, queries-1)
	for i := 0; i < queries; i++ {
		start := time.Now()
		var one int
		if err := db.QueryRow("SELECT 1").Scan(&one); err != nil {
			panic(err)
		}
		elapsed := time.Since(start)
		if i > 0 {
			latencies = append(latencies, elapsed)
		}
	}
	return latencies
}

func percentile(sorted []time.Duration, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(float64(len(sorted)-1) * p)
	return float64(sorted[idx].Microseconds()) / 1000.0
}

func main() {
	target := flag.String("target", "direct", "label only: direct | pgbouncer")
	host := flag.String("host", "postgres", "Postgres or pgbouncer host")
	port := flag.Int("port", 5432, "Postgres or pgbouncer port")
	dbname := flag.String("dbname", "benchmark", "database name")
	user := flag.String("user", "postgres", "username")
	password := flag.String("password", "benchmark", "password")
	mode := flag.String("mode", "churn", "churn | persistent")
	clients := flag.Int("clients", 10, "number of concurrent client goroutines")
	queries := flag.Int("queries", 30, "queries per client goroutine")
	flag.Parse()

	fmt.Fprintf(os.Stderr, "target=%s mode=%s clients=%d queries=%d host=%s:%d\n", *target, *mode, *clients, *queries, *host, *port)

	var mu sync.Mutex
	var all []time.Duration
	var wg sync.WaitGroup

	start := time.Now()
	for c := 0; c < *clients; c++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var latencies []time.Duration
			if *mode == "persistent" {
				latencies = runPersistent(*host, *port, *dbname, *user, *password, *queries)
			} else {
				latencies = runChurn(*host, *port, *dbname, *user, *password, *queries)
			}
			mu.Lock()
			all = append(all, latencies...)
			mu.Unlock()
		}()
	}
	wg.Wait()
	duration := time.Since(start)

	sort.Slice(all, func(i, j int) bool { return all[i] < all[j] })

	var sumMs float64
	for _, l := range all {
		sumMs += float64(l.Microseconds()) / 1000.0
	}
	avgMs := 0.0
	if len(all) > 0 {
		avgMs = sumMs / float64(len(all))
	}

	totalQueries := *clients * *queries

	res := result{
		Target:           *target,
		Mode:             *mode,
		Clients:          *clients,
		QueriesPerClient: *queries,
		TotalQueries:     totalQueries,
		ThroughputPerSec: float64(totalQueries) / duration.Seconds(),
		AvgLatencyMs:     avgMs,
		P50LatencyMs:     percentile(all, 0.50),
		P95LatencyMs:     percentile(all, 0.95),
		DurationSeconds:  duration.Seconds(),
	}

	out, err := json.Marshal(res)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
}
