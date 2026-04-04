package transport

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sync"
)

const (
	// FrameText is the type byte for JSON text frames.
	FrameText byte = 0x01
	// FrameBinary is the type byte for binary data frames.
	FrameBinary byte = 0x02
	// MaxFrameSize is the maximum payload size for a single frame (16 MB).
	// Prevents OOM from malformed or malicious frame headers.
	MaxFrameSize uint32 = 16 * 1024 * 1024
)

// StdioTransport provides length-prefixed binary framing over stdin/stdout.
// Frame format: [type: 1 byte] [length: 4 bytes big-endian] [payload: length bytes]
type StdioTransport struct {
	reader io.Reader
	writer io.Writer
	mu     sync.Mutex // serialize writes
}

// NewStdioTransport creates a StdioTransport using os.Stdin and os.Stdout.
func NewStdioTransport() *StdioTransport {
	return &StdioTransport{
		reader: os.Stdin,
		writer: os.Stdout,
	}
}

// NewStdioTransportFromRW creates a StdioTransport from arbitrary reader/writer (for testing).
func NewStdioTransportFromRW(r io.Reader, w io.Writer) *StdioTransport {
	return &StdioTransport{
		reader: r,
		writer: w,
	}
}

// ReadFrame reads a single framed message from the transport.
// Returns the frame type byte, the payload, and any error.
func (t *StdioTransport) ReadFrame() (byte, []byte, error) {
	header := make([]byte, 5)
	if _, err := io.ReadFull(t.reader, header); err != nil {
		return 0, nil, fmt.Errorf("read header: %w", err)
	}
	frameType := header[0]
	length := binary.BigEndian.Uint32(header[1:5])
	if length > MaxFrameSize {
		return 0, nil, fmt.Errorf("frame size %d exceeds maximum %d", length, MaxFrameSize)
	}
	payload := make([]byte, length)
	if length > 0 {
		if _, err := io.ReadFull(t.reader, payload); err != nil {
			return 0, nil, fmt.Errorf("read payload: %w", err)
		}
	}
	return frameType, payload, nil
}

// WriteJSON marshals v as JSON and writes it as a TEXT frame.
func (t *StdioTransport) WriteJSON(v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	return t.writeFrame(FrameText, data)
}

// WriteBinary writes data as a BINARY frame.
func (t *StdioTransport) WriteBinary(data []byte) error {
	return t.writeFrame(FrameBinary, data)
}

// WriteJSONThenBinary atomically writes a TEXT frame (JSON envelope) followed by
// a BINARY frame (body data). The mutex is held across both writes to prevent
// interleaving from other goroutines.
func (t *StdioTransport) WriteJSONThenBinary(envelope any, body []byte) error {
	envData, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("marshal envelope: %w", err)
	}
	t.mu.Lock()
	defer t.mu.Unlock()

	if err := t.writeFrameUnlocked(FrameText, envData); err != nil {
		return err
	}
	return t.writeFrameUnlocked(FrameBinary, body)
}

// writeFrame writes a single framed message (mutex-protected).
func (t *StdioTransport) writeFrame(frameType byte, payload []byte) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.writeFrameUnlocked(frameType, payload)
}

// writeFrameUnlocked writes a single framed message without acquiring the mutex.
// The caller must hold t.mu.
func (t *StdioTransport) writeFrameUnlocked(frameType byte, payload []byte) error {
	header := make([]byte, 5)
	header[0] = frameType
	binary.BigEndian.PutUint32(header[1:5], uint32(len(payload)))
	if _, err := t.writer.Write(header); err != nil {
		return err
	}
	if len(payload) > 0 {
		if _, err := t.writer.Write(payload); err != nil {
			return err
		}
	}
	return nil
}
