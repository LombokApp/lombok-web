package tunnel

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"docker-bridge-tunnel-agent/internal/config"
)

// hopByHopHeaders is the list of headers that must be stripped per RFC 7230.
// These headers are only meaningful for a single transport-level connection
// and must not be forwarded by proxies.
var hopByHopHeaders = []string{
	"Connection",
	"Keep-Alive",
	"Proxy-Authenticate",
	"Proxy-Authorization",
	"Proxy-Connection",
	"Te",
	"Trailers",
	"Transfer-Encoding",
	"Upgrade",
}

// stripHopByHop removes hop-by-hop headers from an http.Header.
// It first removes any headers named in the Connection header value,
// then removes all standard hop-by-hop headers.
func stripHopByHop(h http.Header) {
	// Strip headers listed in Connection header value first.
	if conn := h.Get("Connection"); conn != "" {
		for _, name := range splitCommaSeparated(conn) {
			h.Del(name)
		}
	}
	// Strip standard hop-by-hop headers.
	for _, name := range hopByHopHeaders {
		h.Del(name)
	}
}

// splitCommaSeparated splits a comma-separated header value into trimmed tokens.
func splitCommaSeparated(s string) []string {
	var parts []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			part := s[start:i]
			// Trim whitespace
			for len(part) > 0 && (part[0] == ' ' || part[0] == '\t') {
				part = part[1:]
			}
			for len(part) > 0 && (part[len(part)-1] == ' ' || part[len(part)-1] == '\t') {
				part = part[:len(part)-1]
			}
			if part != "" {
				parts = append(parts, part)
			}
			start = i + 1
		}
	}
	return parts
}

// addForwardedHeaders injects X-Forwarded-* headers for the proxied request.
func addForwardedHeaders(h http.Header, host string) {
	h.Set("X-Forwarded-For", "tunnel-agent")
	h.Set("X-Forwarded-Proto", "https")
	h.Set("X-Forwarded-Host", host)
}

// HTTPProxy is a per-port HTTP reverse proxy with a connection pool per target port.
// It forwards HTTPRequestMsg frames to local services and returns the response
// as a slice of protocol messages (HTTPResponseMsg + optional BodyChunkMsg + BodyEndMsg).
type HTTPProxy struct {
	clients      sync.Map // key: int (port) -> value: *http.Client
	timeout      time.Duration
	maxChunkSize int64
	port         int
}

// NewHTTPProxy creates an HTTPProxy configured from the given Config.
func NewHTTPProxy(cfg *config.Config) *HTTPProxy {
	return &HTTPProxy{
		timeout:      cfg.ProxyTimeout,
		maxChunkSize: cfg.MaxBodyChunkSize,
		port:         cfg.Ports[0],
	}
}

// clientFor returns the *http.Client for the given port, creating one on first use.
// Clients are cached per port in a sync.Map for connection pool reuse.
func (p *HTTPProxy) clientFor(port int) *http.Client {
	if v, ok := p.clients.Load(port); ok {
		return v.(*http.Client)
	}

	transport := &http.Transport{
		MaxIdleConns:        20,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
		DialContext: (&net.Dialer{
			Timeout: 5 * time.Second,
		}).DialContext,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   p.timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Do not follow redirects — proxy them as-is.
			return http.ErrUseLastResponse
		},
	}

	// Use LoadOrStore to avoid creating duplicate clients under concurrent access.
	actual, _ := p.clients.LoadOrStore(port, client)
	return actual.(*http.Client)
}

// ResponseWriter is the interface for writing protocol messages back to the bridge.
// Used by ExecuteStreaming to incrementally send response data.
type ResponseWriter interface {
	WriteJSON(v any) error
	WriteJSONThenBinary(envelope any, body []byte) error
}

// isStreamingResponse returns true if the response should be streamed
// incrementally rather than buffered in full. This avoids blocking on
// long-lived streams like SSE (text/event-stream) or chunked transfers.
func isStreamingResponse(resp *http.Response) bool {
	ct := resp.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "text/event-stream") {
		return true
	}
	// Chunked with unknown content length — stream it.
	if resp.ContentLength < 0 && resp.TransferEncoding != nil {
		for _, te := range resp.TransferEncoding {
			if strings.EqualFold(te, "chunked") {
				return true
			}
		}
	}
	return false
}

// buildResponseHeaders extracts and strips hop-by-hop headers from the response.
func buildResponseHeaders(resp *http.Response) map[string]string {
	respHTTPHeaders := make(http.Header)
	for k, vals := range resp.Header {
		for _, v := range vals {
			respHTTPHeaders.Add(k, v)
		}
	}
	stripHopByHop(respHTTPHeaders)
	strippedHeaders := make(map[string]string, len(respHTTPHeaders))
	for k, vals := range respHTTPHeaders {
		if len(vals) > 0 {
			strippedHeaders[k] = vals[0]
		}
	}
	return strippedHeaders
}

// makeRequest creates and executes the proxied HTTP request. Returns the
// upstream response, or a 502 response message slice on connection error.
func (p *HTTPProxy) makeRequest(ctx context.Context, msg HTTPRequestMsg, bodyData []byte) (*http.Response, []any, error) {
	targetURL := fmt.Sprintf("http://127.0.0.1:%d%s", p.port, msg.Path)

	var reqBody io.Reader
	if len(bodyData) > 0 {
		reqBody = bytes.NewReader(bodyData)
	}

	req, err := http.NewRequestWithContext(ctx, msg.Method, targetURL, reqBody)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create request: %w", err)
	}

	for k, v := range msg.Headers {
		req.Header.Set(k, v)
	}

	stripHopByHop(req.Header)
	addForwardedHeaders(req.Header, msg.Headers["host"])

	client := p.clientFor(p.port)
	resp, err := client.Do(req)
	if err != nil {
		var opErr *net.OpError
		if isNetOpError(err, &opErr) {
			return nil, p.build502Response(msg), nil
		}
		return nil, nil, fmt.Errorf("proxy request failed: %w", err)
	}

	return resp, nil, nil
}

// Execute proxies the HTTP request described by msg (with optional body in bodyData)
// to the local service at the configured port and returns the sequence of protocol messages
// that should be sent back to the bridge.
//
// On success: [HTTPResponseMsg, (optional) BodyChunkMsg..., BodyEndMsg]
// On connection refused: [HTTPResponseMsg{502}, BodyChunkMsg{errorJSON}, BodyEndMsg]
// Any other error is returned directly.
func (p *HTTPProxy) Execute(ctx context.Context, msg HTTPRequestMsg, bodyData []byte) ([]any, error) {
	resp, errResp, err := p.makeRequest(ctx, msg, bodyData)
	if err != nil {
		return nil, err
	}
	if errResp != nil {
		return errResp, nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	headers := buildResponseHeaders(resp)
	return p.buildResponses(msg, resp.StatusCode, headers, body), nil
}

// ExecuteStreaming proxies an HTTP request and streams the response body
// incrementally via the ResponseWriter. This avoids buffering the entire
// response for long-lived streams (SSE, chunked transfers).
//
// If the upstream response is not a streaming type, falls back to buffered
// behaviour (reads full body, writes in one shot).
//
// Returns true if the response was handled (streamed or buffered), false if
// makeRequest returned a 502 error response (already written to writer).
func (p *HTTPProxy) ExecuteStreaming(ctx context.Context, msg HTTPRequestMsg, bodyData []byte, writer ResponseWriter) (bool, error) {
	resp, errResp, err := p.makeRequest(ctx, msg, bodyData)
	if err != nil {
		return false, err
	}
	if errResp != nil {
		// Write the 502 error responses directly
		for _, r := range errResp {
			switch v := r.(type) {
			case HTTPResponseMsg:
				if writeErr := writer.WriteJSON(v); writeErr != nil {
					return false, writeErr
				}
			case BodyChunkMsg:
				if writeErr := writer.WriteJSONThenBinary(v, v.Data); writeErr != nil {
					return false, writeErr
				}
			case BodyEndMsg:
				if writeErr := writer.WriteJSON(v); writeErr != nil {
					return false, writeErr
				}
			}
		}
		return true, nil
	}
	defer resp.Body.Close()

	headers := buildResponseHeaders(resp)

	if !isStreamingResponse(resp) {
		// Not a streaming response — fall back to buffered behaviour
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return false, fmt.Errorf("failed to read response body: %w", readErr)
		}
		responses := p.buildResponses(msg, resp.StatusCode, headers, body)
		for _, r := range responses {
			switch v := r.(type) {
			case HTTPResponseMsg:
				if writeErr := writer.WriteJSON(v); writeErr != nil {
					return false, writeErr
				}
			case BodyChunkMsg:
				if writeErr := writer.WriteJSONThenBinary(v, v.Data); writeErr != nil {
					return false, writeErr
				}
			case BodyEndMsg:
				if writeErr := writer.WriteJSON(v); writeErr != nil {
					return false, writeErr
				}
			}
		}
		return true, nil
	}

	// Streaming response — send headers immediately, then stream body chunks.
	responseMsg := HTTPResponseMsg{
		Envelope:    Envelope{Type: MsgHTTPResponse, StreamID: msg.StreamID},
		StatusCode:  resp.StatusCode,
		Headers:     headers,
		BodyFollows: true,
		// BodyLen unknown for streams — leave at 0
	}
	if err := writer.WriteJSON(responseMsg); err != nil {
		return false, fmt.Errorf("failed to write streaming response header: %w", err)
	}

	// Read and forward body chunks as they arrive.
	buf := make([]byte, 32*1024) // 32KB read buffer
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			chunk := make([]byte, n)
			copy(chunk, buf[:n])
			chunkMsg := BodyChunkMsg{
				Envelope: Envelope{Type: MsgBodyChunk, StreamID: msg.StreamID},
				Data:     chunk,
			}
			if writeErr := writer.WriteJSONThenBinary(chunkMsg, chunk); writeErr != nil {
				return false, fmt.Errorf("failed to write body chunk: %w", writeErr)
			}
		}
		if readErr != nil {
			if readErr != io.EOF {
				slog.Warn("streaming body read error",
					"stream_id", msg.StreamID,
					"error", readErr,
				)
			}
			break
		}
	}

	// Signal end of body
	endMsg := BodyEndMsg{
		Envelope: Envelope{Type: MsgBodyEnd, StreamID: msg.StreamID},
	}
	if err := writer.WriteJSON(endMsg); err != nil {
		return false, fmt.Errorf("failed to write body_end: %w", err)
	}

	return true, nil
}

// buildResponses assembles the sequence of protocol messages for a successful response.
func (p *HTTPProxy) buildResponses(msg HTTPRequestMsg, statusCode int, headers map[string]string, body []byte) []any {
	bodyLen := int64(len(body))
	bodyFollows := bodyLen > 0

	responseMsg := HTTPResponseMsg{
		Envelope:    Envelope{Type: MsgHTTPResponse, StreamID: msg.StreamID},
		StatusCode:  statusCode,
		Headers:     headers,
		BodyLen:     bodyLen,
		BodyFollows: bodyFollows,
	}

	if !bodyFollows {
		return []any{responseMsg}
	}

	// Single chunk: body fits within maxChunkSize.
	if bodyLen <= p.maxChunkSize {
		return []any{
			responseMsg,
			BodyChunkMsg{
				Envelope: Envelope{Type: MsgBodyChunk, StreamID: msg.StreamID},
				Data:     body,
			},
			BodyEndMsg{
				Envelope: Envelope{Type: MsgBodyEnd, StreamID: msg.StreamID},
			},
		}
	}

	// Large body: split into multiple BodyChunkMsg messages.
	responses := make([]any, 0, int(bodyLen/p.maxChunkSize)+3)
	responses = append(responses, responseMsg)

	offset := int64(0)
	for offset < bodyLen {
		end := offset + p.maxChunkSize
		if end > bodyLen {
			end = bodyLen
		}
		responses = append(responses, BodyChunkMsg{
			Envelope: Envelope{Type: MsgBodyChunk, StreamID: msg.StreamID},
			Data:     body[offset:end],
		})
		offset = end
	}

	responses = append(responses, BodyEndMsg{
		Envelope: Envelope{Type: MsgBodyEnd, StreamID: msg.StreamID},
	})

	return responses
}

// build502Response returns the protocol message sequence for a 502 (port unreachable) error.
func (p *HTTPProxy) build502Response(msg HTTPRequestMsg) []any {
	errBody, _ := json.Marshal(map[string]any{
		"error": "port_unreachable",
		"port":  p.port,
	})

	responseMsg := HTTPResponseMsg{
		Envelope:    Envelope{Type: MsgHTTPResponse, StreamID: msg.StreamID},
		StatusCode:  http.StatusBadGateway,
		Headers:     map[string]string{"content-type": "application/json"},
		BodyLen:     int64(len(errBody)),
		BodyFollows: true,
	}

	return []any{
		responseMsg,
		BodyChunkMsg{
			Envelope: Envelope{Type: MsgBodyChunk, StreamID: msg.StreamID},
			Data:     errBody,
		},
		BodyEndMsg{
			Envelope: Envelope{Type: MsgBodyEnd, StreamID: msg.StreamID},
		},
	}
}

// isNetOpError checks whether err (potentially wrapped) is a *net.OpError.
func isNetOpError(err error, target **net.OpError) bool {
	if err == nil {
		return false
	}
	// Walk the error chain manually since errors.As doesn't work well
	// with the URL-wrapped errors from http.Client.
	type unwrapper interface{ Unwrap() error }
	for e := err; e != nil; {
		if opErr, ok := e.(*net.OpError); ok {
			*target = opErr
			return true
		}
		if u, ok := e.(unwrapper); ok {
			e = u.Unwrap()
		} else {
			break
		}
	}
	return false
}
