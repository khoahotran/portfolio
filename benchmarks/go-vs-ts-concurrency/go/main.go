// Go harness for the go-vs-ts-concurrency benchmark lab (/labs/go-vs-ts-concurrency).
//
// Matches the methodology already stated in content/experiments/go-vs-ts-concurrency.md: spawn N
// concurrent workers, each performing a mock 50ms network request (a sleep, not a real network
// call — isolates the concurrency model's own overhead from actual I/O variance), using a
// sync.WaitGroup and one goroutine per task. Measures peak resident set size and total wall-clock
// time; the Node harness (../node/harness.js) mirrors this exactly so the two are comparable.
//
// Usage: go run . -tasks 10000
// Prints one line of JSON to stdout; diagnostic output goes to stderr.
package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type result struct {
	Language     string  `json:"language"`
	Tasks        int     `json:"tasks"`
	PeakMemoryMB float64 `json:"peakMemoryMB"`
	DurationMs   float64 `json:"durationMs"`
}

// peakRssKB reads VmHWM ("high water mark" — peak resident set size) from /proc/self/status.
// This is the OS's own accounting of the process's peak physical memory use, which is more
// reliable than sampling runtime.MemStats at intervals and risking missing the actual peak between
// samples — precisely the risk that made the original run's figures unreproducible in the first
// place (no methodology note on how memory was sampled survived either).
func peakRssKB() (int64, error) {
	f, err := os.Open("/proc/self/status")
	if err != nil {
		return 0, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "VmHWM:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				return strconv.ParseInt(fields[1], 10, 64)
			}
		}
	}
	return 0, fmt.Errorf("VmHWM not found in /proc/self/status")
}

func main() {
	tasks := flag.Int("tasks", 10000, "number of concurrent workers to spawn")
	flag.Parse()

	fmt.Fprintf(os.Stderr, "[go] spawning %d goroutines, each sleeping 50ms...\n", *tasks)

	start := time.Now()
	var wg sync.WaitGroup
	wg.Add(*tasks)
	for i := 0; i < *tasks; i++ {
		go func() {
			defer wg.Done()
			time.Sleep(50 * time.Millisecond)
		}()
	}
	wg.Wait()
	duration := time.Since(start)

	peakKB, err := peakRssKB()
	if err != nil {
		fmt.Fprintf(os.Stderr, "could not read peak RSS: %v\n", err)
		os.Exit(1)
	}

	res := result{
		Language:     "go",
		Tasks:        *tasks,
		PeakMemoryMB: float64(peakKB) / 1024.0,
		DurationMs:   float64(duration.Microseconds()) / 1000.0,
	}
	out, _ := json.Marshal(res)
	fmt.Println(string(out))
}
