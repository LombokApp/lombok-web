package tunnel

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"docker-bridge-tunnel-agent/internal/config"
	"docker-bridge-tunnel-agent/internal/transport"
)

func newTestAgentConfig(ports []int) *config.Config {
	return &config.Config{
		Ports:            ports,
		MaxBodyChunkSize: 1048576,
		ProxyTimeout:     5 * time.Second,
		HealthPort:       0,
		LogLevel:         "warn",
	}
}

// newAgentTestPair creates an agent and transport pair for testing.
// Returns the agent, a transport to write to the agent's stdin, and a transport to read the agent's stdout.
func newAgentTestPair(cfg *config.Config) (*Agent, *transport.StdioTransport, *transport.StdioTransport) {
	// agent reads from stdinR, writes to stdoutW
	stdinR, stdinW := io.Pipe()
	stdoutR, stdoutW := io.Pipe()

	agentTr := transport.NewStdioTransportFromRW(stdinR, stdoutW)
	bridgeWrite := transport.NewStdioTransportFromRW(nil, stdinW)
	bridgeRead := transport.NewStdioTransportFromRW(stdoutR, nil)

	agent := NewAgent(cfg, agentTr)
	return agent, bridgeWrite, bridgeRead
}

// TestAgentReadyMessageOnStartup verifies that the first frame sent by Run() is a ready message.
func TestAgentReadyMessageOnStartup(t *testing.T) {
	cfg := newTestAgentConfig([]int{3000})
	agent, _, bridgeRead := newAgentTestPair(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	go func() {
		_ = agent.Run(ctx)
	}()

	// Read the first frame — should be ready message.
	frameType, data, err := bridgeRead.ReadFrame()
	if err != nil {
		t.Fatalf("read ready frame: %v", err)
	}
	if frameType != transport.FrameText {
		t.Fatalf("expected TEXT frame, got 0x%02x", frameType)
	}

	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if env.Type != MsgReady {
		t.Errorf("expected type=%q, got %q", MsgReady, env.Type)
	}

	cancel()
}

// TestAgentHeartbeat verifies that heartbeat messages are sent periodically.
// Uses a short wait since the default interval is 10s — we just check that at least
// one heartbeat arrives within a reasonable time.
func TestAgentHeartbeat(t *testing.T) {
	cfg := newTestAgentConfig([]int{3000})
	agent, _, bridgeRead := newAgentTestPair(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	go func() {
		_ = agent.Run(ctx)
	}()

	// Skip ready message.
	_, _, err := bridgeRead.ReadFrame()
	if err != nil {
		t.Fatalf("read ready: %v", err)
	}

	// Wait for heartbeat (10s interval + some slack).
	heartbeatCh := make(chan Envelope, 1)
	go func() {
		for {
			ft, data, err := bridgeRead.ReadFrame()
			if err != nil {
				return
			}
			if ft == transport.FrameText {
				var env Envelope
				if json.Unmarshal(data, &env) == nil && env.Type == MsgHeartbeat {
					heartbeatCh <- env
					return
				}
			}
		}
	}()

	select {
	case hb := <-heartbeatCh:
		if hb.Type != MsgHeartbeat {
			t.Errorf("expected heartbeat, got %q", hb.Type)
		}
	case <-time.After(12 * time.Second):
		t.Fatal("timed out waiting for heartbeat")
	}

	cancel()
}

// TestAgentHTTPRequestDispatch verifies that the agent dispatches http_request to the proxy.
func TestAgentHTTPRequestDispatch(t *testing.T) {
	// Start a local HTTP server.
	localServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("proxied"))
	}))
	defer localServer.Close()
	localPort := localServer.Listener.Addr().(*net.TCPAddr).Port

	cfg := newTestAgentConfig([]int{localPort})
	agent, bridgeWrite, bridgeRead := newAgentTestPair(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	go func() {
		_ = agent.Run(ctx)
	}()

	// Skip ready message.
	_, _, err := bridgeRead.ReadFrame()
	if err != nil {
		t.Fatalf("read ready: %v", err)
	}

	// Send an http_request to the agent.
	reqMsg := HTTPRequestMsg{
		Envelope: Envelope{Type: MsgHTTPRequest, StreamID: "test-stream-1"},
		Method:   "GET",
		Path:     "/",
		Headers:  map[string]string{"host": "localhost"},
	}
	if err := bridgeWrite.WriteJSON(reqMsg); err != nil {
		t.Fatalf("write http_request: %v", err)
	}

	// Read the response — should be http_response.
	var gotResponseType MessageType
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		ft, data, err := bridgeRead.ReadFrame()
		if err != nil {
			t.Fatalf("read response: %v", err)
		}
		if ft == transport.FrameText {
			var env Envelope
			if json.Unmarshal(data, &env) == nil {
				if env.Type == MsgHTTPResponse {
					gotResponseType = env.Type
					break
				}
				// Skip heartbeat messages
				if env.Type == MsgHeartbeat {
					continue
				}
			}
		}
	}

	if gotResponseType != MsgHTTPResponse {
		t.Errorf("expected %q, got %q", MsgHTTPResponse, gotResponseType)
	}

	cancel()
}

// TestAgentGracefulShutdownOnStdinClose verifies that closing stdin causes the agent to exit.
func TestAgentGracefulShutdownOnStdinClose(t *testing.T) {
	stdinR, stdinW := io.Pipe()
	stdoutR, stdoutW := io.Pipe()

	agentTr := transport.NewStdioTransportFromRW(stdinR, stdoutW)
	bridgeRead := transport.NewStdioTransportFromRW(stdoutR, nil)

	cfg := newTestAgentConfig([]int{3000})
	agent := NewAgent(cfg, agentTr)

	ctx := context.Background()

	done := make(chan error, 1)
	go func() {
		done <- agent.Run(ctx)
	}()

	// Read ready message.
	_, _, err := bridgeRead.ReadFrame()
	if err != nil {
		t.Fatalf("read ready: %v", err)
	}

	// Drain stdout so deferred writes don't block
	go func() {
		for {
			_, _, err := bridgeRead.ReadFrame()
			if err != nil {
				return
			}
		}
	}()

	// Close stdin — agent should detect EOF and shut down.
	stdinW.Close()

	select {
	case err := <-done:
		// Agent should exit without error (EOF is normal shutdown).
		if err != nil {
			t.Errorf("expected nil error on stdin close, got: %v", err)
		}
	case <-time.After(7 * time.Second):
		t.Fatal("agent did not exit after stdin close")
	}
}

// TestAgentMethods verifies IsRunning(), Uptime(), and ActiveStreams() methods.
func TestAgentMethods(t *testing.T) {
	cfg := newTestAgentConfig([]int{3000})
	stdinR, _ := io.Pipe()
	_, stdoutW := io.Pipe()
	agentTr := transport.NewStdioTransportFromRW(stdinR, stdoutW)
	agent := NewAgent(cfg, agentTr)

	if agent.IsRunning() {
		t.Error("Expected IsRunning()=false before Run()")
	}

	uptime := agent.Uptime()
	if uptime < 0 {
		t.Error("Expected non-negative Uptime()")
	}

	if agent.ActiveStreams() != 0 {
		t.Error("Expected 0 active streams before Run()")
	}
}
