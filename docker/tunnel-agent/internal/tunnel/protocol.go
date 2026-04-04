package tunnel

// MessageType identifies the kind of message in the tunnel protocol.
type MessageType string

const (
	MsgHTTPRequest  MessageType = "http_request"
	MsgHTTPResponse MessageType = "http_response"
	MsgWSUpgrade    MessageType = "ws_upgrade"
	MsgWSUpgradeAck MessageType = "ws_upgrade_ack"
	MsgWSData       MessageType = "ws_data"
	MsgStreamClose  MessageType = "stream_close"
	MsgBodyChunk    MessageType = "body_chunk"
	MsgBodyEnd      MessageType = "body_end"
	MsgReady        MessageType = "ready"
	MsgHeartbeat    MessageType = "heartbeat"
)

// Envelope is the base type embedded in all protocol messages.
// It carries the message type and stream ID for multiplexing.
type Envelope struct {
	Type     MessageType `json:"type"`
	StreamID string      `json:"stream_id,omitempty"`
}

// HTTPRequestMsg is sent from the bridge to the agent to proxy an HTTP request
// to a local dev server port.
type HTTPRequestMsg struct {
	Envelope
	Method      string            `json:"method"`
	Path        string            `json:"path"`
	Headers     map[string]string `json:"headers"`
	BodyLen     int64             `json:"body_len,omitempty"`
	BodyFollows bool              `json:"body_follows,omitempty"`
}

// HTTPResponseMsg is sent from the agent to the bridge with the proxied response.
type HTTPResponseMsg struct {
	Envelope
	StatusCode  int               `json:"status_code"`
	Headers     map[string]string `json:"headers"`
	BodyLen     int64             `json:"body_len,omitempty"`
	BodyFollows bool              `json:"body_follows,omitempty"`
}

// WSUpgradeMsg is sent from the bridge to the agent to request a WebSocket upgrade
// to a local service.
type WSUpgradeMsg struct {
	Envelope
	Path    string            `json:"path"`
	Headers map[string]string `json:"headers"`
}

// WSUpgradeAckMsg is sent from the agent to the bridge to confirm or reject a
// WebSocket upgrade request.
type WSUpgradeAckMsg struct {
	Envelope
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// WSDataMsg is sent in both directions to carry WebSocket frame data.
// When BodyFollows is true, the next frame from the transport is a BINARY frame with data.
type WSDataMsg struct {
	Envelope
	BodyFollows bool `json:"body_follows"`
}

// StreamCloseMsg is sent to signal that a stream has ended.
type StreamCloseMsg struct {
	Envelope
	Reason string `json:"reason,omitempty"`
}

// BodyChunkMsg carries a chunk of a large response body.
// Used when the body exceeds MaxBodyChunkSize and must be split across
// multiple messages.
type BodyChunkMsg struct {
	Envelope
	Data []byte `json:"-"` // Sent as separate BINARY frame, excluded from JSON envelope
}

// BodyEndMsg signals the end of a chunked body sequence.
type BodyEndMsg struct {
	Envelope
}

// ReadyMsg is sent by the agent on startup to signal readiness.
type ReadyMsg struct {
	Envelope
}

// HeartbeatMsg is sent periodically by the agent to confirm liveness.
type HeartbeatMsg struct {
	Envelope
}
