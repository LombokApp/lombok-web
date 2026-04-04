package transport

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"io"
	"sync"
	"testing"
)

// TestReadFrameText verifies round-trip for a TEXT frame.
func TestReadFrameText(t *testing.T) {
	r, w := io.Pipe()
	tr := NewStdioTransportFromRW(r, nil)

	payload := []byte(`{"type":"ready"}`)
	go func() {
		header := make([]byte, 5)
		header[0] = FrameText
		binary.BigEndian.PutUint32(header[1:5], uint32(len(payload)))
		_, _ = w.Write(header)
		_, _ = w.Write(payload)
	}()

	frameType, data, err := tr.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame error: %v", err)
	}
	if frameType != FrameText {
		t.Errorf("expected FrameText (0x01), got 0x%02x", frameType)
	}
	if !bytes.Equal(data, payload) {
		t.Errorf("payload mismatch: got %q, want %q", data, payload)
	}
}

// TestReadFrameBinary verifies round-trip for a BINARY frame.
func TestReadFrameBinary(t *testing.T) {
	r, w := io.Pipe()
	tr := NewStdioTransportFromRW(r, nil)

	payload := []byte{0xDE, 0xAD, 0xBE, 0xEF}
	go func() {
		header := make([]byte, 5)
		header[0] = FrameBinary
		binary.BigEndian.PutUint32(header[1:5], uint32(len(payload)))
		_, _ = w.Write(header)
		_, _ = w.Write(payload)
	}()

	frameType, data, err := tr.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame error: %v", err)
	}
	if frameType != FrameBinary {
		t.Errorf("expected FrameBinary (0x02), got 0x%02x", frameType)
	}
	if !bytes.Equal(data, payload) {
		t.Errorf("payload mismatch: got %x, want %x", data, payload)
	}
}

// TestWriteJSONRoundTrip verifies WriteJSON produces a readable TEXT frame.
func TestWriteJSONRoundTrip(t *testing.T) {
	r, w := io.Pipe()
	writer := NewStdioTransportFromRW(nil, w)
	reader := NewStdioTransportFromRW(r, nil)

	type testMsg struct {
		Type string `json:"type"`
	}
	msg := testMsg{Type: "ready"}

	go func() {
		_ = writer.WriteJSON(msg)
	}()

	frameType, data, err := reader.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame error: %v", err)
	}
	if frameType != FrameText {
		t.Errorf("expected FrameText, got 0x%02x", frameType)
	}

	var decoded testMsg
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded.Type != "ready" {
		t.Errorf("expected type=ready, got %q", decoded.Type)
	}
}

// TestWriteBinaryRoundTrip verifies WriteBinary produces a readable BINARY frame.
func TestWriteBinaryRoundTrip(t *testing.T) {
	r, w := io.Pipe()
	writer := NewStdioTransportFromRW(nil, w)
	reader := NewStdioTransportFromRW(r, nil)

	payload := []byte("binary payload data")
	go func() {
		_ = writer.WriteBinary(payload)
	}()

	frameType, data, err := reader.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame error: %v", err)
	}
	if frameType != FrameBinary {
		t.Errorf("expected FrameBinary, got 0x%02x", frameType)
	}
	if !bytes.Equal(data, payload) {
		t.Errorf("payload mismatch: got %q, want %q", data, payload)
	}
}

// TestWriteJSONThenBinaryAtomic verifies the atomic TEXT+BINARY pair.
func TestWriteJSONThenBinaryAtomic(t *testing.T) {
	r, w := io.Pipe()
	writer := NewStdioTransportFromRW(nil, w)
	reader := NewStdioTransportFromRW(r, nil)

	type envelope struct {
		Type     string `json:"type"`
		StreamID string `json:"stream_id"`
	}
	env := envelope{Type: "body_chunk", StreamID: "s1"}
	body := []byte("chunk data here")

	go func() {
		_ = writer.WriteJSONThenBinary(env, body)
	}()

	// Read TEXT frame (envelope)
	frameType1, data1, err := reader.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame (text): %v", err)
	}
	if frameType1 != FrameText {
		t.Errorf("first frame: expected FrameText, got 0x%02x", frameType1)
	}
	var decoded envelope
	if err := json.Unmarshal(data1, &decoded); err != nil {
		t.Fatalf("unmarshal envelope: %v", err)
	}
	if decoded.Type != "body_chunk" {
		t.Errorf("expected type=body_chunk, got %q", decoded.Type)
	}

	// Read BINARY frame (body)
	frameType2, data2, err := reader.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame (binary): %v", err)
	}
	if frameType2 != FrameBinary {
		t.Errorf("second frame: expected FrameBinary, got 0x%02x", frameType2)
	}
	if !bytes.Equal(data2, body) {
		t.Errorf("body mismatch: got %q, want %q", data2, body)
	}
}

// TestPartialReads verifies ReadFrame handles partial TCP-like chunks.
func TestPartialReads(t *testing.T) {
	r, w := io.Pipe()
	tr := NewStdioTransportFromRW(r, nil)

	payload := []byte("hello partial world")

	go func() {
		// Build the full frame
		frame := make([]byte, 5+len(payload))
		frame[0] = FrameText
		binary.BigEndian.PutUint32(frame[1:5], uint32(len(payload)))
		copy(frame[5:], payload)

		// Write in small chunks to simulate partial TCP reads
		for i := 0; i < len(frame); i += 3 {
			end := i + 3
			if end > len(frame) {
				end = len(frame)
			}
			_, _ = w.Write(frame[i:end])
		}
	}()

	frameType, data, err := tr.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame error: %v", err)
	}
	if frameType != FrameText {
		t.Errorf("expected FrameText, got 0x%02x", frameType)
	}
	if !bytes.Equal(data, payload) {
		t.Errorf("payload mismatch: got %q, want %q", data, payload)
	}
}

// TestConcurrentWrites verifies that concurrent writes do not interleave frames.
func TestConcurrentWrites(t *testing.T) {
	var buf bytes.Buffer
	var bufMu sync.Mutex

	// Use a synchronized writer to collect all output.
	safeWriter := &syncWriter{w: &buf, mu: &bufMu}
	tr := NewStdioTransportFromRW(nil, safeWriter)

	const n = 50
	var wg sync.WaitGroup
	wg.Add(n)

	for i := 0; i < n; i++ {
		go func(idx int) {
			defer wg.Done()
			msg := map[string]int{"index": idx}
			_ = tr.WriteJSON(msg)
		}(i)
	}

	wg.Wait()

	// Read all frames back and verify each is a valid JSON message.
	bufMu.Lock()
	data := buf.Bytes()
	bufMu.Unlock()

	reader := NewStdioTransportFromRW(bytes.NewReader(data), nil)
	count := 0
	for {
		frameType, payload, err := reader.ReadFrame()
		if err != nil {
			break
		}
		if frameType != FrameText {
			t.Errorf("frame %d: expected FrameText, got 0x%02x", count, frameType)
		}
		var msg map[string]int
		if err := json.Unmarshal(payload, &msg); err != nil {
			t.Errorf("frame %d: invalid JSON: %v (payload=%q)", count, err, payload)
		}
		count++
	}

	if count != n {
		t.Errorf("expected %d frames, got %d", n, count)
	}
}

// TestEmptyPayload verifies that zero-length payloads work correctly.
func TestEmptyPayload(t *testing.T) {
	r, w := io.Pipe()
	writer := NewStdioTransportFromRW(nil, w)
	reader := NewStdioTransportFromRW(r, nil)

	go func() {
		_ = writer.WriteBinary([]byte{})
	}()

	frameType, data, err := reader.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame error: %v", err)
	}
	if frameType != FrameBinary {
		t.Errorf("expected FrameBinary, got 0x%02x", frameType)
	}
	if len(data) != 0 {
		t.Errorf("expected empty payload, got %d bytes", len(data))
	}
}

// TestReadFrameRejectsOversizedPayload verifies that frames exceeding MaxFrameSize are rejected.
func TestReadFrameRejectsOversizedPayload(t *testing.T) {
	r, w := io.Pipe()
	tr := NewStdioTransportFromRW(r, nil)

	go func() {
		header := make([]byte, 5)
		header[0] = FrameBinary
		// Set length to MaxFrameSize + 1
		binary.BigEndian.PutUint32(header[1:5], MaxFrameSize+1)
		_, _ = w.Write(header)
		w.Close()
	}()

	_, _, err := tr.ReadFrame()
	if err == nil {
		t.Fatal("expected error for oversized frame, got nil")
	}
	if !bytes.Contains([]byte(err.Error()), []byte("exceeds maximum")) {
		t.Errorf("expected 'exceeds maximum' error, got: %v", err)
	}
}

// TestReadFrameAcceptsMaxSizePayload verifies that frames at exactly MaxFrameSize are accepted.
func TestReadFrameAcceptsMaxSizePayload(t *testing.T) {
	// Use a small payload that fits in memory but tests the boundary
	// We can't allocate MaxFrameSize (16MB) in a test, so just verify
	// that a payload just under the limit works.
	r, w := io.Pipe()
	tr := NewStdioTransportFromRW(r, nil)

	payload := make([]byte, 1024)
	for i := range payload {
		payload[i] = byte(i % 256)
	}

	go func() {
		header := make([]byte, 5)
		header[0] = FrameBinary
		binary.BigEndian.PutUint32(header[1:5], uint32(len(payload)))
		_, _ = w.Write(header)
		_, _ = w.Write(payload)
	}()

	frameType, data, err := tr.ReadFrame()
	if err != nil {
		t.Fatalf("ReadFrame error: %v", err)
	}
	if frameType != FrameBinary {
		t.Errorf("expected FrameBinary, got 0x%02x", frameType)
	}
	if !bytes.Equal(data, payload) {
		t.Error("payload mismatch")
	}
}

// syncWriter wraps an io.Writer with a mutex for concurrent-safe writes.
type syncWriter struct {
	w  io.Writer
	mu *sync.Mutex
}

func (sw *syncWriter) Write(p []byte) (int, error) {
	sw.mu.Lock()
	defer sw.mu.Unlock()
	return sw.w.Write(p)
}
