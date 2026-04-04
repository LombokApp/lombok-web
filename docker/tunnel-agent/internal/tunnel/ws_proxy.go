package tunnel

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"docker-bridge-tunnel-agent/internal/transport"

	"nhooyr.io/websocket"
)

// WSProxy handles bidirectional WebSocket proxying between the bridge
// and a local WebSocket server.
type WSProxy struct {
	port int
}

// NewWSProxy creates a new WSProxy with the given target port.
func NewWSProxy(port int) *WSProxy {
	return &WSProxy{port: port}
}

// Handle proxies a WebSocket connection described by msg.
//
// It dials the local WebSocket server at ws://127.0.0.1:{p.port}{msg.Path},
// sends a WSUpgradeAckMsg via the transport, then forwards frames bidirectionally:
//
//   - bridge->local: frames arrive via the inbound channel and are written to localConn
//   - local->bridge: frames from localConn are sent as WSDataMsg + binary body via transport
//
// The connection terminates when either side closes or the context is cancelled.
// On exit, StreamCloseMsg is sent and the stream is removed from registry.
func (p *WSProxy) Handle(
	ctx context.Context,
	msg WSUpgradeMsg,
	inbound <-chan []byte,
	tr *transport.StdioTransport,
	registry *StreamRegistry,
) {
	dialURL := fmt.Sprintf("ws://127.0.0.1:%d%s", p.port, msg.Path)

	// Build dial options: forward relevant headers, strip hop-by-hop.
	dialOpts := &websocket.DialOptions{
		HTTPHeader: buildWSDialHeaders(msg.Headers),
	}

	dialCtx, dialCancel := context.WithTimeout(ctx, 10*time.Second)
	localConn, _, dialErr := websocket.Dial(dialCtx, dialURL, dialOpts)
	dialCancel()

	if dialErr != nil {
		slog.Warn("ws_proxy: dial failed",
			"stream_id", msg.StreamID,
			"url", dialURL,
			"error", dialErr,
		)
		// Send failure ack
		ack := WSUpgradeAckMsg{
			Envelope: Envelope{Type: MsgWSUpgradeAck, StreamID: msg.StreamID},
			Success:  false,
			Error:    dialErr.Error(),
		}
		_ = tr.WriteJSON(ack)
		// Send stream_close
		closeMsg := StreamCloseMsg{
			Envelope: Envelope{Type: MsgStreamClose, StreamID: msg.StreamID},
			Reason:   "dial_failed",
		}
		_ = tr.WriteJSON(closeMsg)
		return
	}
	defer localConn.CloseNow()

	// Register stream for cancellation support.
	proxyCtx, cancel := context.WithCancel(ctx)
	stream := NewStream(msg.StreamID, cancel)
	registry.Register(msg.StreamID, stream)
	defer func() {
		cancel()
		registry.Remove(msg.StreamID)
		// Always send stream_close when Handle() exits.
		closeMsg := StreamCloseMsg{
			Envelope: Envelope{Type: MsgStreamClose, StreamID: msg.StreamID},
			Reason:   "stream_ended",
		}
		_ = tr.WriteJSON(closeMsg)
	}()

	// Send success ack.
	ack := WSUpgradeAckMsg{
		Envelope: Envelope{Type: MsgWSUpgradeAck, StreamID: msg.StreamID},
		Success:  true,
	}
	if err := tr.WriteJSON(ack); err != nil {
		slog.Warn("ws_proxy: failed to send ack", "stream_id", msg.StreamID, "error", err)
		return
	}

	// Use an errgroup-style done channel: either goroutine finishing cancels the other.
	done := make(chan struct{}, 2)

	// Goroutine 1: bridge -> local (drain inbound channel, write to localConn).
	go func() {
		defer func() { done <- struct{}{} }()
		for {
			select {
			case <-proxyCtx.Done():
				return
			case frame, ok := <-inbound:
				if !ok {
					// Inbound channel closed.
					return
				}
				writeCtx, writeCancel := context.WithTimeout(proxyCtx, 10*time.Second)
				err := localConn.Write(writeCtx, websocket.MessageBinary, frame)
				writeCancel()
				if err != nil {
					slog.Debug("ws_proxy: write to local failed",
						"stream_id", msg.StreamID,
						"error", err,
					)
					return
				}
			}
		}
	}()

	// Goroutine 2: local -> bridge (read from localConn, send WSDataMsg + binary).
	go func() {
		defer func() { done <- struct{}{} }()
		for {
			_, frameData, err := localConn.Read(proxyCtx)
			if err != nil {
				if proxyCtx.Err() == nil {
					slog.Debug("ws_proxy: read from local closed",
						"stream_id", msg.StreamID,
						"error", err,
					)
				}
				return
			}

			dataMsg := WSDataMsg{
				Envelope:    Envelope{Type: MsgWSData, StreamID: msg.StreamID},
				BodyFollows: true,
			}
			if err := tr.WriteJSONThenBinary(dataMsg, frameData); err != nil {
				slog.Debug("ws_proxy: write to bridge failed",
					"stream_id", msg.StreamID,
					"error", err,
				)
				return
			}
		}
	}()

	// Wait for either goroutine to finish, then cancel the other.
	select {
	case <-done:
		cancel()
	case <-proxyCtx.Done():
	}

	// Wait for the other goroutine to exit.
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		slog.Warn("ws_proxy: goroutine did not exit in time", "stream_id", msg.StreamID)
	}
}

// buildWSDialHeaders converts the message headers map into http.Header,
// stripping hop-by-hop headers that must not be forwarded.
func buildWSDialHeaders(msgHeaders map[string]string) http.Header {
	h := make(http.Header, len(msgHeaders))
	for k, v := range msgHeaders {
		h.Set(k, v)
	}
	stripHopByHop(h)
	return h
}
