// client is the bench harness: -target selects gRPC or REST, -mode selects a single-record payload
// or a repeated list, -clients is concurrency. Both targets use one shared, reused connection (a
// single *grpc.ClientConn for gRPC's HTTP/2 multiplexing, a single *http.Client with a transport
// sized for the concurrency for REST's keep-alive pooling) — the realistic way either protocol is
// actually deployed, not a strawman that reconnects per request on one side only.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/proto"

	pb "grpc-vs-rest/pb"
)

type result struct {
	Target            string  `json:"target"`
	Mode              string  `json:"mode"`
	Clients           int     `json:"clients"`
	RequestsPerClient int     `json:"requestsPerClient"`
	TotalRequests     int     `json:"totalRequests"`
	ThroughputPerSec  float64 `json:"throughputPerSec"`
	AvgLatencyMs      float64 `json:"avgLatencyMs"`
	P50LatencyMs      float64 `json:"p50LatencyMs"`
	P95LatencyMs      float64 `json:"p95LatencyMs"`
	AvgResponseBytes  float64 `json:"avgResponseBytes"`
	DurationSeconds   float64 `json:"durationSeconds"`
}

func percentile(sorted []time.Duration, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(p * float64(len(sorted)-1))
	return float64(sorted[idx]) / float64(time.Millisecond)
}

func main() {
	target := flag.String("target", "grpc", "grpc or rest")
	mode := flag.String("mode", "single", "single or list")
	host := flag.String("host", "localhost", "server host")
	clients := flag.Int("clients", 10, "concurrent clients")
	requests := flag.Int("requests", 30, "requests per client")
	listCount := flag.Int("count", 100, "records per ListUsers/list-mode call")
	flag.Parse()

	var (
		mu        sync.Mutex
		latencies []time.Duration
		bytesSum  int64
	)

	var callOnce func(id int64) (payloadBytes int, err error)

	switch *target {
	case "grpc":
		conn, err := grpc.NewClient(fmt.Sprintf("%s:50051", *host), grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			log.Fatalf("grpc dial: %v", err)
		}
		defer conn.Close()
		client := pb.NewUserServiceClient(conn)

		callOnce = func(id int64) (int, error) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if *mode == "single" {
				resp, err := client.GetUser(ctx, &pb.GetUserRequest{Id: id})
				if err != nil {
					return 0, err
				}
				return proto.Size(resp), nil
			}
			resp, err := client.ListUsers(ctx, &pb.ListUsersRequest{Count: int32(*listCount)})
			if err != nil {
				return 0, err
			}
			return proto.Size(resp), nil
		}

	case "rest":
		httpClient := &http.Client{
			Transport: &http.Transport{
				MaxIdleConns:        *clients * 2,
				MaxIdleConnsPerHost: *clients * 2,
				IdleConnTimeout:     30 * time.Second,
			},
			Timeout: 5 * time.Second,
		}

		callOnce = func(id int64) (int, error) {
			var url string
			if *mode == "single" {
				url = fmt.Sprintf("http://%s:8080/users/%d", *host, id)
			} else {
				url = fmt.Sprintf("http://%s:8080/users?count=%d", *host, *listCount)
			}
			resp, err := httpClient.Get(url)
			if err != nil {
				return 0, err
			}
			defer resp.Body.Close()
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return 0, err
			}
			return len(body), nil
		}

	default:
		log.Fatalf("unknown target %q", *target)
	}

	start := time.Now()
	var wg sync.WaitGroup
	for c := 0; c < *clients; c++ {
		wg.Add(1)
		go func(clientID int) {
			defer wg.Done()
			for i := 0; i < *requests; i++ {
				reqStart := time.Now()
				n, err := callOnce(int64(clientID*1000 + i))
				elapsed := time.Since(reqStart)
				if err != nil {
					log.Printf("request error (target=%s mode=%s): %v", *target, *mode, err)
					continue
				}
				mu.Lock()
				latencies = append(latencies, elapsed)
				bytesSum += int64(n)
				mu.Unlock()
			}
		}(c)
	}
	wg.Wait()
	duration := time.Since(start)

	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })

	var sum time.Duration
	for _, l := range latencies {
		sum += l
	}
	avgMs := 0.0
	if len(latencies) > 0 {
		avgMs = float64(sum) / float64(len(latencies)) / float64(time.Millisecond)
	}
	avgBytes := 0.0
	if len(latencies) > 0 {
		avgBytes = float64(bytesSum) / float64(len(latencies))
	}

	res := result{
		Target:            *target,
		Mode:              *mode,
		Clients:           *clients,
		RequestsPerClient: *requests,
		TotalRequests:     len(latencies),
		ThroughputPerSec:  float64(len(latencies)) / duration.Seconds(),
		AvgLatencyMs:      avgMs,
		P50LatencyMs:      percentile(latencies, 0.50),
		P95LatencyMs:      percentile(latencies, 0.95),
		AvgResponseBytes:  avgBytes,
		DurationSeconds:   duration.Seconds(),
	}

	enc := json.NewEncoder(os.Stdout)
	if err := enc.Encode(res); err != nil {
		log.Fatalf("encode result: %v", err)
	}
}
