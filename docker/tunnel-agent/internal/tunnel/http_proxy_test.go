package tunnel

import (
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"docker-bridge-tunnel-agent/internal/config"
)

func newTestProxyConfig(port int, maxChunk int64) *config.Config {
	return &config.Config{
		Ports:            []int{port},
		MaxBodyChunkSize: maxChunk,
		ProxyTimeout:     5_000_000_000, // 5s in nanoseconds
	}
}

// TestHTTPProxyForwardGet tests that Execute() forwards a GET request and returns 200.
func TestHTTPProxyForwardGet(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("hello"))
	}))
	defer ts.Close()

	port := ts.Listener.Addr().(*net.TCPAddr).Port
	proxy := NewHTTPProxy(newTestProxyConfig(port, 1048576))

	msg := HTTPRequestMsg{
		Envelope: Envelope{Type: MsgHTTPRequest, StreamID: "stream-1"},
		Method:   "GET",
		Path:     "/",
		Headers:  map[string]string{"host": "localhost"},
	}

	responses, err := proxy.Execute(t.Context(), msg, nil)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}
	if len(responses) == 0 {
		t.Fatal("Expected at least one response, got 0")
	}

	resp, ok := responses[0].(HTTPResponseMsg)
	if !ok {
		t.Fatalf("Expected HTTPResponseMsg, got %T", responses[0])
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

// TestHTTPProxyStripsHopByHopFromRequest verifies hop-by-hop headers are removed from forwarded requests.
func TestHTTPProxyStripsHopByHopFromRequest(t *testing.T) {
	var receivedHeaders http.Header

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedHeaders = r.Header.Clone()
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	port := ts.Listener.Addr().(*net.TCPAddr).Port
	proxy := NewHTTPProxy(newTestProxyConfig(port, 1048576))

	msg := HTTPRequestMsg{
		Envelope: Envelope{Type: MsgHTTPRequest, StreamID: "stream-2"},
		Method:   "GET",
		Path:     "/",
		Headers: map[string]string{
			"host":              "localhost",
			"connection":        "Keep-Alive",
			"keep-alive":        "timeout=5",
			"transfer-encoding": "chunked",
		},
	}

	_, err := proxy.Execute(t.Context(), msg, nil)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	hopByHop := []string{"Connection", "Keep-Alive", "Transfer-Encoding"}
	for _, h := range hopByHop {
		if v := receivedHeaders.Get(h); v != "" {
			t.Errorf("Expected hop-by-hop header %q to be stripped, but got %q", h, v)
		}
	}
}

// TestHTTPProxySetsXForwardedProto verifies X-Forwarded-Proto: https is set.
func TestHTTPProxySetsXForwardedProto(t *testing.T) {
	var receivedHeaders http.Header

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedHeaders = r.Header.Clone()
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	port := ts.Listener.Addr().(*net.TCPAddr).Port
	proxy := NewHTTPProxy(newTestProxyConfig(port, 1048576))

	msg := HTTPRequestMsg{
		Envelope: Envelope{Type: MsgHTTPRequest, StreamID: "stream-3"},
		Method:   "GET",
		Path:     "/",
		Headers:  map[string]string{"host": "example.com"},
	}

	_, err := proxy.Execute(t.Context(), msg, nil)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	if got := receivedHeaders.Get("X-Forwarded-Proto"); got != "https" {
		t.Errorf("Expected X-Forwarded-Proto=https, got %q", got)
	}
}

// TestHTTPProxySetsXForwardedHost verifies X-Forwarded-Host is set from incoming host header.
func TestHTTPProxySetsXForwardedHost(t *testing.T) {
	var receivedHeaders http.Header

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedHeaders = r.Header.Clone()
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	port := ts.Listener.Addr().(*net.TCPAddr).Port
	proxy := NewHTTPProxy(newTestProxyConfig(port, 1048576))

	msg := HTTPRequestMsg{
		Envelope: Envelope{Type: MsgHTTPRequest, StreamID: "stream-4"},
		Method:   "GET",
		Path:     "/",
		Headers:  map[string]string{"host": "myapp.example.com"},
	}

	_, err := proxy.Execute(t.Context(), msg, nil)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	if got := receivedHeaders.Get("X-Forwarded-Host"); got != "myapp.example.com" {
		t.Errorf("Expected X-Forwarded-Host=myapp.example.com, got %q", got)
	}
}

// TestHTTPProxy502OnUnreachablePort verifies 502 response with JSON body when port is unreachable.
func TestHTTPProxy502OnUnreachablePort(t *testing.T) {
	// Grab a free port then close it so nothing is listening there.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to get free port: %v", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()

	cfg := &config.Config{
		Ports:            []int{port},
		MaxBodyChunkSize: 1048576,
		ProxyTimeout:     5_000_000_000,
	}
	proxy := NewHTTPProxy(cfg)

	msg := HTTPRequestMsg{
		Envelope: Envelope{Type: MsgHTTPRequest, StreamID: "stream-5"},
		Method:   "GET",
		Path:     "/",
		Headers:  map[string]string{"host": "localhost"},
	}

	responses, err := proxy.Execute(t.Context(), msg, nil)
	if err != nil {
		t.Fatalf("Execute returned unexpected error: %v", err)
	}
	if len(responses) == 0 {
		t.Fatal("Expected at least one response for 502")
	}

	resp, ok := responses[0].(HTTPResponseMsg)
	if !ok {
		t.Fatalf("Expected HTTPResponseMsg for 502, got %T", responses[0])
	}
	if resp.StatusCode != http.StatusBadGateway {
		t.Errorf("Expected status 502, got %d", resp.StatusCode)
	}

	// Check there's a BodyChunk with {"error":"port_unreachable","port":N}
	if len(responses) < 2 {
		t.Fatal("Expected body frames after 502 HTTPResponseMsg")
	}

	var bodyData []byte
	for _, r := range responses[1:] {
		switch v := r.(type) {
		case BodyChunkMsg:
			bodyData = append(bodyData, v.Data...)
		case BodyEndMsg:
			// end marker
		}
	}

	var bodyObj map[string]any
	if err := json.Unmarshal(bodyData, &bodyObj); err != nil {
		t.Fatalf("502 body is not valid JSON: %v (body=%q)", err, string(bodyData))
	}
	if bodyObj["error"] != "port_unreachable" {
		t.Errorf("Expected error=port_unreachable, got %v", bodyObj["error"])
	}
	portVal, _ := bodyObj["port"].(float64)
	if int(portVal) != port {
		t.Errorf("Expected port=%d in 502 body, got %v", port, bodyObj["port"])
	}
}

// TestHTTPProxyStripsHopByHopFromResponse verifies hop-by-hop headers from upstream response are stripped.
func TestHTTPProxyStripsHopByHopFromResponse(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Transfer-Encoding", "chunked")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Custom", "kept")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("body"))
	}))
	defer ts.Close()

	port := ts.Listener.Addr().(*net.TCPAddr).Port
	proxy := NewHTTPProxy(newTestProxyConfig(port, 1048576))

	msg := HTTPRequestMsg{
		Envelope: Envelope{Type: MsgHTTPRequest, StreamID: "stream-6"},
		Method:   "GET",
		Path:     "/",
		Headers:  map[string]string{"host": "localhost"},
	}

	responses, err := proxy.Execute(t.Context(), msg, nil)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	resp, ok := responses[0].(HTTPResponseMsg)
	if !ok {
		t.Fatalf("Expected HTTPResponseMsg, got %T", responses[0])
	}

	hopByHop := []string{"Transfer-Encoding", "Connection", "Keep-Alive"}
	for _, h := range hopByHop {
		lower := strings.ToLower(h)
		if _, found := resp.Headers[lower]; found {
			t.Errorf("Hop-by-hop header %q should be stripped from response headers", h)
		}
		if _, found := resp.Headers[h]; found {
			t.Errorf("Hop-by-hop header %q should be stripped from response headers", h)
		}
	}

	if _, found := resp.Headers["X-Custom"]; !found {
		if _, found2 := resp.Headers["x-custom"]; !found2 {
			t.Error("Expected X-Custom header to be kept in response")
		}
	}
}

// TestHTTPProxyChunksLargeBody verifies large bodies are split into BodyChunk+BodyEnd messages.
func TestHTTPProxyChunksLargeBody(t *testing.T) {
	// 3MB body
	bigBody := strings.Repeat("x", 3*1024*1024)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(bigBody))
	}))
	defer ts.Close()

	port := ts.Listener.Addr().(*net.TCPAddr).Port
	proxy := NewHTTPProxy(newTestProxyConfig(port, 1024*1024))

	msg := HTTPRequestMsg{
		Envelope: Envelope{Type: MsgHTTPRequest, StreamID: "stream-7"},
		Method:   "GET",
		Path:     "/",
		Headers:  map[string]string{"host": "localhost"},
	}

	responses, err := proxy.Execute(t.Context(), msg, nil)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	if len(responses) < 4 {
		t.Errorf("Expected at least 4 messages for 3MB body with 1MB chunks, got %d", len(responses))
	}

	resp, ok := responses[0].(HTTPResponseMsg)
	if !ok {
		t.Fatalf("First response must be HTTPResponseMsg, got %T", responses[0])
	}
	if !resp.BodyFollows {
		t.Error("Expected BodyFollows=true for large body")
	}

	last := responses[len(responses)-1]
	if _, ok := last.(BodyEndMsg); !ok {
		t.Errorf("Expected last message to be BodyEndMsg, got %T", last)
	}

	var assembled []byte
	for _, r := range responses[1 : len(responses)-1] {
		chunk, ok := r.(BodyChunkMsg)
		if !ok {
			t.Errorf("Expected BodyChunkMsg, got %T", r)
			continue
		}
		assembled = append(assembled, chunk.Data...)
	}
	if string(assembled) != bigBody {
		t.Errorf("Reassembled body length %d != expected %d", len(assembled), len(bigBody))
	}
}

// TestHTTPProxyClientReuse verifies that clientFor() returns the same *http.Client for the same port.
func TestHTTPProxyClientReuse(t *testing.T) {
	proxy := NewHTTPProxy(newTestProxyConfig(8080, 1048576))

	c1 := proxy.clientFor(8080)
	c2 := proxy.clientFor(8080)
	c3 := proxy.clientFor(9090)

	if c1 != c2 {
		t.Error("Expected same *http.Client for the same port")
	}
	if c1 == c3 {
		t.Error("Expected different *http.Client for different ports")
	}
}

