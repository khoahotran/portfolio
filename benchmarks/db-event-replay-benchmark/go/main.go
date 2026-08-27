// Harness for the db-event-replay-benchmark lab (/labs/db-event-replay-benchmark).
//
// Measures the time to fetch and fold N immutable events for a single Aggregate ID into a final
// projection — PostgreSQL via a single range-scanned SELECT, Firestore via reading every document
// in an /aggregates/{id}/events/ subcollection. Both databases are seeded first (unmeasured); only
// the fetch-and-fold phase is timed.
//
// Usage:
//   go run . -mode=seed     -db=postgres  -events=100000
//   go run . -mode=seed     -db=firestore -events=100000
//   go run . -mode=measure  -db=postgres  -events=100000
//   go run . -mode=measure  -db=firestore -events=100000
// Prints one line of JSON to stdout for -mode=measure; seeding logs progress to stderr only.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/jackc/pgx/v5"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

type result struct {
	Database        string  `json:"database"`
	Events          int     `json:"events"`
	FetchFoldMs     float64 `json:"fetchFoldMs"`
	FinalBalance    float64 `json:"finalBalance"`
	EventsProcessed int     `json:"eventsProcessed"`
}

const aggregateID = "bench-aggregate-1"

func main() {
	mode := flag.String("mode", "measure", "seed | measure")
	db := flag.String("db", "postgres", "postgres | firestore")
	events := flag.Int("events", 10000, "number of events for the single benchmark aggregate")
	pgURL := flag.String("pg-url", "postgres://bench:bench@postgres:5432/bench?sslmode=disable", "Postgres connection string")
	firestoreProject := flag.String("firestore-project", "bench-project", "Firestore emulator project id")
	flag.Parse()

	ctx := context.Background()

	switch *db {
	case "postgres":
		if *mode == "seed" {
			seedPostgres(ctx, *pgURL, *events)
		} else {
			measurePostgres(ctx, *pgURL, *events)
		}
	case "firestore":
		if *mode == "seed" {
			seedFirestore(ctx, *firestoreProject, *events)
		} else {
			measureFirestore(ctx, *firestoreProject, *events)
		}
	default:
		fmt.Fprintf(os.Stderr, "unknown -db %q\n", *db)
		os.Exit(1)
	}
}

// ── PostgreSQL ──────────────────────────────────────────────────────────────

func pgConnect(ctx context.Context, url string) *pgx.Conn {
	conn, err := pgx.Connect(ctx, url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "postgres connect failed: %v\n", err)
		os.Exit(1)
	}
	return conn
}

func seedPostgres(ctx context.Context, url string, n int) {
	conn := pgConnect(ctx, url)
	defer conn.Close(ctx)

	_, err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS events (
			aggregate_id TEXT NOT NULL,
			version      INT  NOT NULL,
			event_type   TEXT NOT NULL,
			amount       NUMERIC NOT NULL,
			PRIMARY KEY (aggregate_id, version)
		);
		CREATE INDEX IF NOT EXISTS idx_events_aggregate_version ON events (aggregate_id, version);
	`)
	if err != nil {
		fmt.Fprintf(os.Stderr, "schema setup failed: %v\n", err)
		os.Exit(1)
	}

	// Clean slate for this aggregate/event-count combination.
	if _, err := conn.Exec(ctx, `DELETE FROM events WHERE aggregate_id = $1`, aggregateID); err != nil {
		fmt.Fprintf(os.Stderr, "cleanup failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "[postgres] seeding %d events via COPY...\n", n)
	start := time.Now()

	rows := make([][]interface{}, n)
	for i := 0; i < n; i++ {
		eventType := "MoneyDeposited"
		amount := 10.0
		if i%3 == 0 {
			eventType = "MoneyWithdrawn"
			amount = -5.0
		}
		rows[i] = []interface{}{aggregateID, i + 1, eventType, amount}
	}

	_, err = conn.CopyFrom(
		ctx,
		pgx.Identifier{"events"},
		[]string{"aggregate_id", "version", "event_type", "amount"},
		pgx.CopyFromRows(rows),
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "copy failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Fprintf(os.Stderr, "[postgres] seeded %d events in %.2fs\n", n, time.Since(start).Seconds())
}

func measurePostgres(ctx context.Context, url string, n int) {
	conn := pgConnect(ctx, url)
	defer conn.Close(ctx)

	start := time.Now()

	rows, err := conn.Query(ctx,
		`SELECT event_type, amount FROM events WHERE aggregate_id = $1 ORDER BY version ASC`,
		aggregateID,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "query failed: %v\n", err)
		os.Exit(1)
	}
	defer rows.Close()

	balance := 0.0
	count := 0
	for rows.Next() {
		var eventType string
		var amount float64
		if err := rows.Scan(&eventType, &amount); err != nil {
			fmt.Fprintf(os.Stderr, "scan failed: %v\n", err)
			os.Exit(1)
		}
		balance += amount
		count++
	}
	if err := rows.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "rows error: %v\n", err)
		os.Exit(1)
	}

	elapsed := time.Since(start)
	emit(result{Database: "postgres", Events: n, FetchFoldMs: msOf(elapsed), FinalBalance: balance, EventsProcessed: count})
}

// ── Firestore ────────────────────────────────────────────────────────────────

func firestoreClient(ctx context.Context, project string) *firestore.Client {
	// FIRESTORE_EMULATOR_HOST is read directly by the client library; a dummy credential option is
	// still required so it doesn't try to load real GCP application-default credentials.
	client, err := firestore.NewClient(ctx, project, option.WithoutAuthentication())
	if err != nil {
		fmt.Fprintf(os.Stderr, "firestore client failed: %v\n", err)
		os.Exit(1)
	}
	return client
}

func eventsCollection(client *firestore.Client) *firestore.CollectionRef {
	return client.Collection("aggregates").Doc(aggregateID).Collection("events")
}

func seedFirestore(ctx context.Context, project string, n int) {
	client := firestoreClient(ctx, project)
	defer client.Close()

	col := eventsCollection(client)

	// Clean slate: delete any documents left from a previous seed at a different event count.
	fmt.Fprintf(os.Stderr, "[firestore] clearing existing events for %s...\n", aggregateID)
	for {
		docs, err := col.Limit(500).Documents(ctx).GetAll()
		if err != nil || len(docs) == 0 {
			break
		}
		bulk := client.BulkWriter(ctx)
		for _, d := range docs {
			bulk.Delete(d.Ref)
		}
		bulk.End()
	}

	fmt.Fprintf(os.Stderr, "[firestore] seeding %d events via BulkWriter...\n", n)
	start := time.Now()

	bulk := client.BulkWriter(ctx)
	for i := 0; i < n; i++ {
		eventType := "MoneyDeposited"
		amount := 10.0
		if i%3 == 0 {
			eventType = "MoneyWithdrawn"
			amount = -5.0
		}
		docID := fmt.Sprintf("evt-%08d", i+1)
		_, err := bulk.Set(col.Doc(docID), map[string]interface{}{
			"version": i + 1,
			"type":    eventType,
			"amount":  amount,
		})
		if err != nil {
			fmt.Fprintf(os.Stderr, "bulk set failed at event %d: %v\n", i, err)
			os.Exit(1)
		}
	}
	bulk.End()

	fmt.Fprintf(os.Stderr, "[firestore] seeded %d events in %.2fs\n", n, time.Since(start).Seconds())
}

func measureFirestore(ctx context.Context, project string, n int) {
	client := firestoreClient(ctx, project)
	defer client.Close()

	col := eventsCollection(client)

	start := time.Now()

	it := col.OrderBy("version", firestore.Asc).Documents(ctx)
	balance := 0.0
	count := 0
	for {
		doc, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			fmt.Fprintf(os.Stderr, "iteration failed: %v\n", err)
			os.Exit(1)
		}
		amount, _ := doc.Data()["amount"].(float64)
		balance += amount
		count++
	}

	elapsed := time.Since(start)
	emit(result{Database: "firestore", Events: n, FetchFoldMs: msOf(elapsed), FinalBalance: balance, EventsProcessed: count})
}

// ── shared ───────────────────────────────────────────────────────────────────

func msOf(d time.Duration) float64 {
	return float64(d.Microseconds()) / 1000.0
}

func emit(r result) {
	out, _ := json.Marshal(r)
	fmt.Println(string(out))
}
