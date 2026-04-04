package tunnel

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"docker-bridge-tunnel-agent/internal/transport"

	"nhooyr.io/websocket"
)

// ---- Helpers ----

// parseWSTestURL parses ws://host:port/path into (port, path).
func parseWSTestURL(t *testing.T, wsURL string) (port int, path string) {
	t.Helper()
	rest := wsURL[len("ws://"):]
	slashIdx := -1
	for i, c := range rest {
		if c == '/' {
			slashIdx = i
			break
		}
	}
	if slashIdx < 0 {
		path = "/"
	} else {
		path = rest[slashIdx:]
		rest = rest[:slashIdx]
	}
	if path == "" {
		path = "/"
	}
	colonIdx := -1
	for i := len(rest) - 1; i >= 0; i-- {
		if rest[i] == ':' {
			colonIdx = i
			break
		}
	}
	if colonIdx < 0 {
		t.Fatalf("no port in URL %q", wsURL)
	}
	portStr := rest[colonIdx+1:]
	p := 0
	for _, c := range portStr {
		p = p*10 + int(c-'0')
	}
	return p, path
}

// echoWSServer starts a WebSocket echo server and returns its ws:// URL and cleanup.
func echoWSServer(t *testing.T) (serverURL string, received *[][]byte, mu *sync.Mutex, cleanup func()) {
	t.Helper()
	var msgs [][]byte
	var m sync.Mutex

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			return
		}
		defer conn.CloseNow()
		for {
			msgType, data, readErr := conn.Read(r.Context())
			if readErr != nil {
				return
			}
			m.Lock()
			msgs = append(msgs, data)
			m.Unlock()
			_ = conn.Write(r.Context(), msgType, data)
		}
	}))

	wsURL := "ws" + srv.URL[len("http"):]
	return wsURL, &msgs, &m, srv.Close
}

// testTransportPair holds a connected pair of StdioTransports for testing.
// It includes a drain function that must be called after the test is done
// to prevent blocking pipe writes from deadlocking.
type testTransportPair struct {
	agentTr  *transport.StdioTransport
	bridgeR  *transport.StdioTransport
	agentToR *io.PipeReader
}

// newTestTransportPair creates a pair of StdioTransports connected via pipes.
func newTestTransportPair() *testTransportPair {
	// agent writes -> bridge reads
	agentToR, agentToW := io.Pipe()
	// bridge writes -> agent reads
	bridgeToR, bridgeToW := io.Pipe()

	return &testTransportPair{
		agentTr:  transport.NewStdioTransportFromRW(bridgeToR, agentToW),
		bridgeR:  transport.NewStdioTransportFromRW(agentToR, bridgeToW),
		agentToR: agentToR,
	}
}

// drain starts a goroutine that reads and discards all frames from the agent side.
// This prevents Handle()'s deferred stream_close writes from blocking on pipe.
func (p *testTransportPair) drain() {
	go func() {
		for {
			_, _, err := p.bridgeR.ReadFrame()
			if err != nil {
				return
			}
		}
	}()
}

// close closes the pipe reader to unblock any pending writes.
func (p *testTransportPair) close() {
	p.agentToR.Close()
}

// ---- Tests ----

// TestWSProxyDialSuccess verifies Handle() sends WSUpgradeAckMsg{Success: true}
// when the local WebSocket server is reachable.
func TestWSProxyDialSuccess(t *testing.T) {
	wsURL, _, _, cleanup := echoWSServer(t)
	defer cleanup()

	port, path := parseWSTestURL(t, wsURL)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tp := newTestTransportPair()
	msg := WSUpgradeMsg{
		Envelope:   Envelope{Type: MsgWSUpgrade, StreamID: "s1"},
		Path:       path,
		Headers:    map[string]string{},

	}
	inbound := make(chan []byte, 10)
	registry := &StreamRegistry{}
	proxy := NewWSProxy(port)

	done := make(chan struct{})
	go func() {
		defer close(done)
		proxy.Handle(ctx, msg, inbound, tp.agentTr, registry)
	}()

	// Read ack from bridge side
	var ack WSUpgradeAckMsg
	frameType, data, err := tp.bridgeR.ReadFrame()
	if err != nil {
		t.Fatalf("read ack: %v", err)
	}
	if frameType != transport.FrameText {
		t.Fatalf("expected TEXT frame, got 0x%02x", frameType)
	}
	if err := json.Unmarshal(data, &ack); err != nil {
		t.Fatalf("unmarshal ack: %v", err)
	}

	if !ack.Success {
		t.Errorf("expected Success=true, got false, error=%q", ack.Error)
	}
	if ack.Type != MsgWSUpgradeAck {
		t.Errorf("expected type %q, got %q", MsgWSUpgradeAck, ack.Type)
	}

	// Drain remaining frames (stream_close on exit) before cancel
	tp.drain()
	cancel()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Handle() did not exit after context cancel")
	}
}

// TestWSProxyDialFailure verifies Handle() sends WSUpgradeAckMsg{Success: false}
// and StreamCloseMsg when the target port is unreachable.
func TestWSProxyDialFailure(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tp := newTestTransportPair()
	msg := WSUpgradeMsg{
		Envelope: Envelope{Type: MsgWSUpgrade, StreamID: "s-fail"},
		Path:     "/",
		Headers:  map[string]string{},
	}
	inbound := make(chan []byte, 10)
	registry := &StreamRegistry{}
	proxy := NewWSProxy(19987)

	// Run Handle() in goroutine since it writes to pipe synchronously
	done := make(chan struct{})
	go func() {
		defer close(done)
		proxy.Handle(ctx, msg, inbound, tp.agentTr, registry)
	}()

	// First message: ack with failure
	_, data, err := tp.bridgeR.ReadFrame()
	if err != nil {
		t.Fatalf("read ack: %v", err)
	}
	var ack WSUpgradeAckMsg
	if err := json.Unmarshal(data, &ack); err != nil {
		t.Fatalf("unmarshal ack: %v", err)
	}
	if ack.Success {
		t.Error("expected Success=false for unreachable port")
	}
	if ack.Error == "" {
		t.Error("expected non-empty Error field")
	}

	// Second message: stream_close
	_, data2, err := tp.bridgeR.ReadFrame()
	if err != nil {
		t.Fatalf("read stream_close: %v", err)
	}
	var closeMsg StreamCloseMsg
	if err := json.Unmarshal(data2, &closeMsg); err != nil {
		t.Fatalf("unmarshal stream_close: %v", err)
	}
	if closeMsg.Type != MsgStreamClose {
		t.Errorf("expected %q, got %q", MsgStreamClose, closeMsg.Type)
	}

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Handle() did not exit")
	}
}

// TestWSProxyPlatformToLocal verifies that bytes sent via the inbound channel
// are forwarded to the local WebSocket server.
func TestWSProxyPlatformToLocal(t *testing.T) {
	wsURL, received, mu, cleanup := echoWSServer(t)
	defer cleanup()

	port, path := parseWSTestURL(t, wsURL)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tp := newTestTransportPair()
	msg := WSUpgradeMsg{
		Envelope:   Envelope{Type: MsgWSUpgrade, StreamID: "s-p2l"},
		Path:       path,
		Headers:    map[string]string{},

	}
	inbound := make(chan []byte, 10)
	registry := &StreamRegistry{}
	proxy := NewWSProxy(port)

	done := make(chan struct{})
	go func() {
		defer close(done)
		proxy.Handle(ctx, msg, inbound, tp.agentTr, registry)
	}()

	// Wait for ack
	_, _, err := tp.bridgeR.ReadFrame()
	if err != nil {
		t.Fatalf("read ack: %v", err)
	}

	// Send frame via inbound channel (bridge -> local)
	testPayload := []byte("hello from bridge")
	inbound <- testPayload

	// Wait for local server to receive it
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		n := len(*received)
		mu.Unlock()
		if n > 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	mu.Lock()
	rcvd := *received
	mu.Unlock()

	if len(rcvd) == 0 {
		t.Fatal("local server did not receive any frame from bridge")
	}
	if string(rcvd[0]) != string(testPayload) {
		t.Errorf("local server received %q, want %q", rcvd[0], testPayload)
	}

	// Drain remaining frames before cancel to prevent blocking
	tp.drain()
	cancel()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Handle() did not exit after context cancel")
	}
}

// TestWSProxyLocalToPlatform verifies that frames sent by the local server are
// forwarded to the bridge as WSDataMsg (JSON) + binary body.
func TestWSProxyLocalToPlatform(t *testing.T) {
	echoPayload := []byte("hello from local")
	serverReady := make(chan *websocket.Conn, 1)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			return
		}
		serverReady <- conn
		<-r.Context().Done()
		conn.CloseNow()
	}))
	defer srv.Close()

	wsURL := "ws" + srv.URL[len("http"):]
	port, path := parseWSTestURL(t, wsURL)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tp := newTestTransportPair()
	msg := WSUpgradeMsg{
		Envelope:   Envelope{Type: MsgWSUpgrade, StreamID: "s-l2p"},
		Path:       path,
		Headers:    map[string]string{},

	}
	inbound := make(chan []byte, 10)
	registry := &StreamRegistry{}
	proxy := NewWSProxy(port)

	done := make(chan struct{})
	go func() {
		defer close(done)
		proxy.Handle(ctx, msg, inbound, tp.agentTr, registry)
	}()

	// Wait for ack
	_, _, err := tp.bridgeR.ReadFrame()
	if err != nil {
		t.Fatalf("read ack: %v", err)
	}

	// Get server conn and send frame to client (local -> bridge)
	var sc *websocket.Conn
	select {
	case sc = <-serverReady:
	case <-time.After(3 * time.Second):
		t.Fatal("server did not get a connection")
	}

	if err := sc.Write(ctx, websocket.MessageText, echoPayload); err != nil {
		t.Fatalf("server write: %v", err)
	}

	// Bridge should receive WSDataMsg JSON
	ft, data, err := tp.bridgeR.ReadFrame()
	if err != nil {
		t.Fatalf("read WSDataMsg: %v", err)
	}
	if ft != transport.FrameText {
		t.Errorf("expected TEXT frame, got 0x%02x", ft)
	}
	var dataMsg WSDataMsg
	if err := json.Unmarshal(data, &dataMsg); err != nil {
		t.Fatalf("unmarshal WSDataMsg: %v", err)
	}
	if dataMsg.Type != MsgWSData {
		t.Errorf("expected %q, got %q", MsgWSData, dataMsg.Type)
	}
	if !dataMsg.BodyFollows {
		t.Error("expected BodyFollows=true in WSDataMsg")
	}

	// Then binary frame with actual data
	ft2, binData, err := tp.bridgeR.ReadFrame()
	if err != nil {
		t.Fatalf("read binary frame: %v", err)
	}
	if ft2 != transport.FrameBinary {
		t.Errorf("expected BINARY frame, got 0x%02x", ft2)
	}
	if string(binData) != string(echoPayload) {
		t.Errorf("binary frame = %q, want %q", binData, echoPayload)
	}

	// Drain remaining frames before cancel
	tp.drain()
	cancel()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Handle() did not exit after context cancel")
	}
}

// TestWSProxyContextCancel verifies that Handle() exits cleanly on context cancellation.
func TestWSProxyContextCancel(t *testing.T) {
	wsURL, _, _, cleanup := echoWSServer(t)
	defer cleanup()

	port, path := parseWSTestURL(t, wsURL)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tp := newTestTransportPair()
	msg := WSUpgradeMsg{
		Envelope:   Envelope{Type: MsgWSUpgrade, StreamID: "s-ctx"},
		Path:       path,
		Headers:    map[string]string{},

	}
	inbound := make(chan []byte, 10)
	registry := &StreamRegistry{}
	proxy := NewWSProxy(port)

	done := make(chan struct{})
	go func() {
		defer close(done)
		proxy.Handle(ctx, msg, inbound, tp.agentTr, registry)
	}()

	// Wait for ack
	_, _, err := tp.bridgeR.ReadFrame()
	if err != nil {
		t.Fatalf("read ack: %v", err)
	}

	// Drain remaining frames before cancel
	tp.drain()
	cancel()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Handle() did not exit after context cancel")
	}
}
