// Go harness for the websockets-vs-sse benchmark lab (/labs/websockets-vs-sse).
//
// One binary, two roles, so the transport is the only variable — both WebSocket and SSE are
// implemented in the same language and process model, isolating the transport's own connection
// and fan-out overhead from any confound a language/runtime difference (like go-vs-ts-concurrency
// deliberately measures) would introduce.
//
//   -role=server  runs an HTTP server exposing /ws (WebSocket) and /sse (Server-Sent Events),
//                 broadcasting a timestamped tick to every connected client every broadcastInterval,
//                 plus /stats reporting the server's own peak RSS, and /healthz.
//   -role=client  opens N concurrent long-lived connections to one transport, waits for them to
//                 stabilize, queries the server's /stats, and prints one JSON result line.
//
// Usage:
//   go run . -role=server -addr=:8090
//   go run . -role=client -mode=ws   -conns=1000 -host=localhost:8090 -holdSeconds=3
//   go run . -role=client -mode=sse  -conns=1000 -host=localhost:8090 -holdSeconds=3
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const broadcastInterval = 200 * time.Millisecond

// --- shared: peak RSS, same technique go-vs-ts-concurrency/go/main.go uses ---

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

// --- server role ---

// broadcaster fans a periodic tick out to every currently-registered client. Registration is a
// plain mutex-protected map rather than anything fancier — at the connection counts this harness
// tests (up to a few thousand), a mutex held for the fraction of a millisecond it takes to range
// over the map and send is not the bottleneck being measured; the point is the transport, not a
// pub-sub implementation contest.
type broadcaster struct {
	mu      sync.Mutex
	clients map[int]chan []byte
	nextID  int
}

func newBroadcaster() *broadcaster {
	return &broadcaster{clients: make(map[int]chan []byte)}
}

func (b *broadcaster) register() (int, chan []byte) {
	b.mu.Lock()
	defer b.mu.Unlock()
	id := b.nextID
	b.nextID++
	ch := make(chan []byte, 4)
	b.clients[id] = ch
	return id, ch
}

func (b *broadcaster) unregister(id int) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if ch, ok := b.clients[id]; ok {
		close(ch)
		delete(b.clients, id)
	}
}

func (b *broadcaster) run(ctx context.Context) {
	ticker := time.NewTicker(broadcastInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			msg := []byte(fmt.Sprintf(`{"tick":%d}`, t.UnixMilli()))
			b.mu.Lock()
			for _, ch := range b.clients {
				select {
				case ch <- msg:
				default:
					// A slow client's buffer is full — drop the tick for it rather than blocking
					// the broadcast loop for every other client. This is the standard trade-off
					// for a fan-out broadcaster; it does not affect what this harness measures
					// (connection-holding memory cost), only delivery under backpressure.
				}
			}
			b.mu.Unlock()
		}
	}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func runServer(addr string) {
	b := newBroadcaster()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go b.run(ctx)

	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mux.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) {
		peakKB, err := peakRssKB()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		b.mu.Lock()
		connCount := len(b.clients)
		b.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"peakMemoryMB": float64(peakKB) / 1024.0,
			"connections":  connCount,
		})
	})

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		id, ch := b.register()
		defer b.unregister(id)

		// A minimal read pump: WebSocket requires draining incoming frames (including the
		// client's close handshake) even though this benchmark's clients never send data after
		// connecting — without it, the connection would look alive to this server long after the
		// client actually closed it.
		go func() {
			for {
				if _, _, err := conn.ReadMessage(); err != nil {
					b.unregister(id)
					return
				}
			}
		}()

		for msg := range ch {
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		}
	})

	mux.HandleFunc("/sse", func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming unsupported", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.WriteHeader(http.StatusOK)
		flusher.Flush()

		id, ch := b.register()
		defer b.unregister(id)

		for {
			select {
			case <-r.Context().Done():
				return
			case msg, open := <-ch:
				if !open {
					return
				}
				fmt.Fprintf(w, "data: %s\n\n", msg)
				flusher.Flush()
			}
		}
	})

	fmt.Fprintf(os.Stderr, "[server] listening on %s (ws: /ws, sse: /sse, stats: /stats)\n", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		fmt.Fprintln(os.Stderr, "server error:", err)
		os.Exit(1)
	}
}

// --- client role ---

type clientResult struct {
	Transport    string  `json:"transport"`
	Connections  int     `json:"connections"`
	ConnectMs    float64 `json:"connectMs"`
	PeakMemoryMB float64 `json:"peakMemoryMB"`
}

func connectWS(host string) (*websocket.Conn, error) {
	dialer := websocket.Dialer{HandshakeTimeout: 5 * time.Second}
	conn, _, err := dialer.Dial(fmt.Sprintf("ws://%s/ws", host), nil)
	return conn, err
}

// sseConn wraps a raw net.Conn so subsequent reads go through the same bufio.Reader that was used
// to parse the response headers, not the raw socket directly. Without this, any body bytes the
// reader already pulled from the socket in the same read syscall past the header boundary (quite
// plausible once the server starts streaming ticks within the connect window) would be silently
// lost — trapped in the discarded bufio.Reader's internal buffer, never reaching the caller's drain
// loop. Every other net.Conn method is unaffected and delegates to the embedded connection.
type sseConn struct {
	net.Conn
	reader *bufio.Reader
}

func (c *sseConn) Read(p []byte) (int, error) {
	return c.reader.Read(p)
}

func connectSSE(host string) (net.Conn, error) {
	// A minimal, dependency-free SSE client: dial the TCP connection directly and issue the HTTP
	// request by hand, then leave the connection open and let the caller drain it. Using
	// net/http's client for a deliberately-never-ending response body works but ties up more
	// internal transport-pool bookkeeping than this benchmark wants to measure — a raw connection
	// keeps the client side of the harness itself lightweight, so the memory this harness reports
	// is the *server's*, not partly an artifact of the Go HTTP client's own connection pool.
	conn, err := net.DialTimeout("tcp", host, 5*time.Second)
	if err != nil {
		return nil, err
	}
	req := fmt.Sprintf("GET /sse HTTP/1.1\r\nHost: %s\r\nAccept: text/event-stream\r\nConnection: keep-alive\r\n\r\n", host)
	if _, err := conn.Write([]byte(req)); err != nil {
		conn.Close()
		return nil, err
	}

	// Bound the header read specifically: a slow or unresponsive server here (overload, a dropped
	// response) would otherwise block this goroutine — and transitively runClient's wg.Wait() —
	// forever, with no way for the harness to time out. Cleared once headers are read, since the
	// streaming body reads that follow are meant to block indefinitely.
	if err := conn.SetReadDeadline(time.Now().Add(5 * time.Second)); err != nil {
		conn.Close()
		return nil, err
	}

	// Drain the status line + headers so the connection is past the handshake and purely
	// streaming body from here on.
	reader := bufio.NewReader(conn)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			conn.Close()
			return nil, err
		}
		if line == "\r\n" {
			break
		}
	}

	if err := conn.SetReadDeadline(time.Time{}); err != nil {
		conn.Close()
		return nil, err
	}

	return &sseConn{Conn: conn, reader: reader}, nil
}

func runClient(mode, host string, conns int, holdSeconds int) {
	start := time.Now()
	var wg sync.WaitGroup
	established := 0
	var mu sync.Mutex

	// Keep every opened connection alive for the duration of the run — closing it would let the
	// server's connection count (and the memory it's holding for that connection) drop before
	// /stats is queried, understating exactly the cost this harness exists to measure.
	wsConns := make([]*websocket.Conn, 0, conns)
	sseConns := make([]net.Conn, 0, conns)
	var connsMu sync.Mutex

	wg.Add(conns)
	for i := 0; i < conns; i++ {
		go func() {
			defer wg.Done()
			switch mode {
			case "ws":
				conn, err := connectWS(host)
				if err != nil {
					fmt.Fprintf(os.Stderr, "[client] ws connect error: %v\n", err)
					return
				}
				// Drain broadcast ticks in the background so the socket's read buffer never
				// backs up, same as a real subscriber would.
				go func() {
					for {
						if _, _, err := conn.ReadMessage(); err != nil {
							return
						}
					}
				}()
				connsMu.Lock()
				wsConns = append(wsConns, conn)
				connsMu.Unlock()
			case "sse":
				conn, err := connectSSE(host)
				if err != nil {
					fmt.Fprintf(os.Stderr, "[client] sse connect error: %v\n", err)
					return
				}
				go func() {
					buf := make([]byte, 4096)
					for {
						if _, err := conn.Read(buf); err != nil {
							return
						}
					}
				}()
				connsMu.Lock()
				sseConns = append(sseConns, conn)
				connsMu.Unlock()
			default:
				// Guards against `established` overcounting to 100% with zero real connections if
				// `-mode` is ever anything but "ws"/"sse" — run.sh only ever passes one of those
				// two, but this function is reachable with an arbitrary flag value.
				fmt.Fprintf(os.Stderr, "[client] unknown mode %q — expected \"ws\" or \"sse\"\n", mode)
				return
			}
			mu.Lock()
			established++
			mu.Unlock()
		}()
	}
	wg.Wait()
	connectMs := float64(time.Since(start).Microseconds()) / 1000.0

	fmt.Fprintf(os.Stderr, "[client] %d/%d %s connections established in %.1fms, holding for %ds...\n",
		established, conns, mode, connectMs, holdSeconds)

	time.Sleep(time.Duration(holdSeconds) * time.Second)

	resp, err := http.Get(fmt.Sprintf("http://%s/stats", host))
	if err != nil {
		fmt.Fprintln(os.Stderr, "stats request failed:", err)
		os.Exit(1)
	}
	defer resp.Body.Close()
	var stats struct {
		PeakMemoryMB float64 `json:"peakMemoryMB"`
		Connections  int     `json:"connections"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&stats); err != nil {
		fmt.Fprintln(os.Stderr, "stats decode failed:", err)
		os.Exit(1)
	}

	res := clientResult{
		Transport:    mode,
		Connections:  conns,
		ConnectMs:    connectMs,
		PeakMemoryMB: stats.PeakMemoryMB,
	}
	out, _ := json.Marshal(res)
	fmt.Println(string(out))

	for _, c := range wsConns {
		c.Close()
	}
	for _, c := range sseConns {
		c.Close()
	}
}

func main() {
	role := flag.String("role", "", "server | client")
	addr := flag.String("addr", ":8090", "server: address to listen on")
	host := flag.String("host", "localhost:8090", "client: server host:port")
	mode := flag.String("mode", "ws", "client: ws | sse")
	conns := flag.Int("conns", 100, "client: number of concurrent connections")
	holdSeconds := flag.Int("holdSeconds", 3, "client: seconds to hold connections open before reading stats")
	flag.Parse()

	switch *role {
	case "server":
		runServer(*addr)
	case "client":
		runClient(*mode, *host, *conns, *holdSeconds)
	default:
		fmt.Fprintln(os.Stderr, "must pass -role=server or -role=client")
		os.Exit(1)
	}
}
