package health

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"testing"
	"time"
)

// mockAgent satisfies AgentStatus for testing.
type mockAgent struct {
	running       bool
	uptime        time.Duration
	activeStreams int
}

func (m *mockAgent) IsRunning() bool    { return m.running }
func (m *mockAgent) Uptime() time.Duration { return m.uptime }
func (m *mockAgent) ActiveStreams() int  { return m.activeStreams }

func getFreePort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("get free port: %v", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()
	return port
}

func TestHealthEndpointRunning(t *testing.T) {
	port := getFreePort(t)
	agent := &mockAgent{running: true, uptime: 42 * time.Second, activeStreams: 3}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)
	go func() { errCh <- StartHealthServer(ctx, port, agent) }()

	// Wait for server to start
	waitForServer(t, port)

	resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/healthz", port))
	if err != nil {
		t.Fatalf("GET /healthz: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected application/json, got %q", ct)
	}

	var body healthResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Status != "running" {
		t.Errorf("expected status=running, got %q", body.Status)
	}
	if body.ActiveStreams != 3 {
		t.Errorf("expected active_streams=3, got %d", body.ActiveStreams)
	}
	if body.UptimeSeconds < 42 {
		t.Errorf("expected uptime >= 42s, got %f", body.UptimeSeconds)
	}

	cancel()
	if err := <-errCh; err != nil {
		t.Errorf("server error: %v", err)
	}
}

func TestHealthEndpointStopped(t *testing.T) {
	port := getFreePort(t)
	agent := &mockAgent{running: false, uptime: 0, activeStreams: 0}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)
	go func() { errCh <- StartHealthServer(ctx, port, agent) }()

	waitForServer(t, port)

	resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/healthz", port))
	if err != nil {
		t.Fatalf("GET /healthz: %v", err)
	}
	defer resp.Body.Close()

	var body healthResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Status != "stopped" {
		t.Errorf("expected status=stopped, got %q", body.Status)
	}

	cancel()
	<-errCh
}

func TestHealthEndpoint404(t *testing.T) {
	port := getFreePort(t)
	agent := &mockAgent{running: true}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)
	go func() { errCh <- StartHealthServer(ctx, port, agent) }()

	waitForServer(t, port)

	resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/unknown", port))
	if err != nil {
		t.Fatalf("GET /unknown: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 404 {
		t.Errorf("expected 404 for unknown path, got %d", resp.StatusCode)
	}

	cancel()
	<-errCh
}

func TestHealthGracefulShutdown(t *testing.T) {
	port := getFreePort(t)
	agent := &mockAgent{running: true}

	ctx, cancel := context.WithCancel(context.Background())

	errCh := make(chan error, 1)
	go func() { errCh <- StartHealthServer(ctx, port, agent) }()

	waitForServer(t, port)

	cancel()

	select {
	case err := <-errCh:
		if err != nil {
			t.Errorf("expected nil error on shutdown, got: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("shutdown timed out")
	}
}

func waitForServer(t *testing.T, port int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		conn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", port), 50*time.Millisecond)
		if err == nil {
			conn.Close()
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("server did not start in time")
}
