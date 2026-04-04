package tunnel

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"docker-bridge-tunnel-agent/internal/config"
	"docker-bridge-tunnel-agent/internal/transport"
)

// HeartbeatInterval is the interval between heartbeat messages.
const HeartbeatInterval = 10 * time.Second

// ShutdownDrainTimeout is the maximum time to wait for in-flight requests on shutdown.
const ShutdownDrainTimeout = 5 * time.Second

// Agent manages the stdin/stdout tunnel connection to the bridge service.
// It multiplexes HTTP requests from the bridge to local dev server ports
// and sends responses back via the StdioTransport.
type Agent struct {
	cfg       *config.Config
	transport *transport.StdioTransport
	proxy     *HTTPProxy
	wsProxy   *WSProxy
	registry  StreamRegistry
	wsChanMap sync.Map // stream_id -> chan []byte; carries inbound ws_data frames
	startTime time.Time
	running   atomic.Bool
	inFlight  sync.WaitGroup
}

// NewAgent creates an Agent with the given config and transport.
func NewAgent(cfg *config.Config, tr *transport.StdioTransport) *Agent {
	return &Agent{
		cfg:       cfg,
		transport: tr,
		proxy:     NewHTTPProxy(cfg),
		wsProxy:   NewWSProxy(cfg.Ports[0]),
		startTime: time.Now(),
	}
}

// IsRunning returns true if the agent is currently running its read loop.
func (a *Agent) IsRunning() bool {
	return a.running.Load()
}

// Uptime returns how long since the agent was created.
func (a *Agent) Uptime() time.Duration {
	return time.Since(a.startTime)
}

// ActiveStreams returns the number of currently active proxy streams.
func (a *Agent) ActiveStreams() int {
	return a.registry.Count()
}

// Run is the main agent loop. It sends a ready message, starts the heartbeat,
// and reads frames from stdin until EOF or context cancellation.
func (a *Agent) Run(ctx context.Context) error {
	a.running.Store(true)
	defer func() {
		a.running.Store(false)
		a.gracefulShutdown()
	}()

	// Send ready message immediately.
	readyMsg := ReadyMsg{Envelope: Envelope{Type: MsgReady}}
	if err := a.transport.WriteJSON(readyMsg); err != nil {
		return err
	}
	slog.Info("ready message sent")

	// Start heartbeat goroutine.
	heartbeatCtx, cancelHeartbeat := context.WithCancel(ctx)
	defer cancelHeartbeat()
	go a.heartbeatLoop(heartbeatCtx)

	// Main read loop.
	for {
		frameType, data, err := a.transport.ReadFrame()
		if err != nil {
			if errors.Is(err, io.EOF) || isClosedPipeError(err) {
				slog.Info("stdin closed, initiating shutdown")
				return nil
			}
			if ctx.Err() != nil {
				return ctx.Err()
			}
			return err
		}

		switch frameType {
		case transport.FrameText:
			var env Envelope
			if err := json.Unmarshal(data, &env); err != nil {
				slog.Warn("failed to parse envelope", "error", err)
				continue
			}
			a.dispatchText(ctx, env, data)

		case transport.FrameBinary:
			slog.Warn("unexpected binary frame outside body context")
		}
	}
}

// dispatchText routes a text frame to the appropriate handler based on message type.
func (a *Agent) dispatchText(ctx context.Context, env Envelope, data []byte) {
	switch env.Type {
	case MsgHTTPRequest:
		var msg HTTPRequestMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			slog.Warn("failed to parse http_request", "error", err)
			return
		}

		// If body follows, read the next frame and verify it's BINARY.
		var bodyData []byte
		if msg.BodyFollows {
			frameType, bodyBytes, err := a.transport.ReadFrame()
			if err != nil {
				slog.Warn("failed to read body frame", "error", err, "stream_id", msg.StreamID)
				return
			}
			if frameType == transport.FrameBinary {
				bodyData = bodyBytes
			} else {
				slog.Warn("expected binary body frame, got text", "stream_id", msg.StreamID)
			}
		}

		a.inFlight.Add(1)
		go func() {
			defer a.inFlight.Done()
			a.handleHTTPRequest(ctx, msg, bodyData)
		}()

	case MsgWSUpgrade:
		var msg WSUpgradeMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			slog.Warn("failed to parse ws_upgrade", "error", err)
			return
		}

		// Create inbound channel for this WebSocket stream.
		inbound := make(chan []byte, 32)
		a.wsChanMap.Store(msg.StreamID, inbound)

		a.inFlight.Add(1)
		go func() {
			defer a.inFlight.Done()
			a.wsProxy.Handle(ctx, msg, inbound, a.transport, &a.registry)
			// Only close channel if stream_close handler hasn't already.
			if _, loaded := a.wsChanMap.LoadAndDelete(msg.StreamID); loaded {
				close(inbound)
			}
		}()

	case MsgWSData:
		var msg WSDataMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			slog.Warn("failed to parse ws_data", "error", err)
			return
		}

		if msg.BodyFollows {
			frameType, bodyBytes, err := a.transport.ReadFrame()
			if err != nil {
				slog.Warn("failed to read ws_data body frame", "error", err, "stream_id", msg.StreamID)
				return
			}
			var frameData []byte
			if frameType == transport.FrameBinary {
				frameData = bodyBytes
			} else {
				slog.Warn("expected binary ws_data frame, got text", "stream_id", msg.StreamID)
			}
			// Deliver to the WSProxy goroutine for this stream.
			if ch, ok := a.wsChanMap.Load(msg.StreamID); ok {
				select {
				case ch.(chan []byte) <- frameData:
				default:
					slog.Warn("ws inbound channel full, dropping frame", "stream_id", msg.StreamID)
				}
			}
		}

	case MsgStreamClose:
		// Close WebSocket inbound channel if this is a WS stream.
		if ch, ok := a.wsChanMap.LoadAndDelete(env.StreamID); ok {
			close(ch.(chan []byte))
		}
		// Cancel any stream (HTTP or WS) in the registry.
		if s, ok := a.registry.Get(env.StreamID); ok {
			s.Cancel()
			a.registry.Remove(env.StreamID)
		}

	default:
		slog.Debug("unknown message type", "type", env.Type)
	}
}

// handleHTTPRequest proxies an HTTP request to the local service and sends
// the response back to the bridge. It runs in its own goroutine.
func (a *Agent) handleHTTPRequest(ctx context.Context, msg HTTPRequestMsg, bodyData []byte) {
	start := time.Now()

	// Register stream for cancellation support.
	streamCtx, cancel := context.WithCancel(ctx)
	stream := NewStream(msg.StreamID, cancel)
	a.registry.Register(msg.StreamID, stream)
	defer func() {
		cancel()
		a.registry.Remove(msg.StreamID)
	}()

	// Use streaming execution — handles both regular and SSE/chunked responses.
	// For streaming responses (text/event-stream, chunked), body chunks are
	// forwarded incrementally. For normal responses, the body is buffered.
	_, err := a.proxy.ExecuteStreaming(streamCtx, msg, bodyData, a.transport)
	if err != nil {
		slog.Warn("proxy execution failed",
			"stream_id", msg.StreamID,
			"error", err,
		)
		closeMsg := StreamCloseMsg{
			Envelope: Envelope{Type: MsgStreamClose, StreamID: msg.StreamID},
			Reason:   "proxy_error",
		}
		_ = a.transport.WriteJSON(closeMsg)
		return
	}

	elapsed := time.Since(start).Milliseconds()
	slog.Debug("http_request handled",
		"stream_id", msg.StreamID,
		"method", msg.Method,
		"path", msg.Path,
		"port", a.cfg.Ports[0],
		"duration_ms", elapsed,
	)
}

// writeResponses writes a sequence of protocol response messages via the transport.
func (a *Agent) writeResponses(ctx context.Context, streamID string, responses []any) {
	for _, r := range responses {
		switch v := r.(type) {
		case HTTPResponseMsg:
			if err := a.transport.WriteJSON(v); err != nil {
				slog.Warn("failed to write http_response", "error", err, "stream_id", streamID)
				return
			}
		case BodyChunkMsg:
			if err := a.transport.WriteJSONThenBinary(v, v.Data); err != nil {
				slog.Warn("failed to write body_chunk", "error", err, "stream_id", streamID)
				return
			}
		case BodyEndMsg:
			if err := a.transport.WriteJSON(v); err != nil {
				slog.Warn("failed to write body_end", "error", err, "stream_id", streamID)
				return
			}
		}
	}
}

// heartbeatLoop sends heartbeat messages at regular intervals until ctx is cancelled.
func (a *Agent) heartbeatLoop(ctx context.Context) {
	ticker := time.NewTicker(HeartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			hb := HeartbeatMsg{Envelope: Envelope{Type: MsgHeartbeat}}
			if err := a.transport.WriteJSON(hb); err != nil {
				slog.Warn("heartbeat write failed", "error", err)
				return
			}
		}
	}
}

// gracefulShutdown sends stream_close for all active streams and waits for
// in-flight requests to complete (up to ShutdownDrainTimeout).
func (a *Agent) gracefulShutdown() {
	// Close all active streams.
	a.registry.CloseAll()

	// Wait for in-flight requests to drain.
	done := make(chan struct{})
	go func() {
		a.inFlight.Wait()
		close(done)
	}()

	select {
	case <-done:
		slog.Info("all in-flight requests drained")
	case <-time.After(ShutdownDrainTimeout):
		slog.Warn("shutdown drain timeout exceeded, forcing exit")
	}
}

// isClosedPipeError checks if an error is due to a closed pipe/reader.
func isClosedPipeError(err error) bool {
	if err == nil {
		return false
	}
	return errors.Is(err, io.ErrClosedPipe) ||
		errors.Is(err, os.ErrClosed) ||
		errors.Is(err, io.ErrUnexpectedEOF)
}
