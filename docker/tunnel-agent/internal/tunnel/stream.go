package tunnel

import (
	"context"
	"sync"
)

// Stream represents an active tunneled request or WebSocket connection.
// Each stream has a unique ID and a cancel function to terminate it.
type Stream struct {
	ID     string
	cancel context.CancelFunc
}

// NewStream creates a new Stream with the given ID and cancel function.
func NewStream(id string, cancel context.CancelFunc) *Stream {
	return &Stream{ID: id, cancel: cancel}
}

// Cancel terminates the stream by calling its cancel function.
func (s *Stream) Cancel() {
	s.cancel()
}

// StreamRegistry is a thread-safe registry of active streams indexed by stream ID.
type StreamRegistry struct {
	m sync.Map
}

// Register adds a stream to the registry under the given ID.
func (r *StreamRegistry) Register(id string, s *Stream) {
	r.m.Store(id, s)
}

// Get retrieves a stream by ID. Returns (stream, true) if found, (nil, false) otherwise.
func (r *StreamRegistry) Get(id string) (*Stream, bool) {
	v, ok := r.m.Load(id)
	if !ok {
		return nil, false
	}
	return v.(*Stream), true
}

// Remove deletes a stream from the registry by ID.
func (r *StreamRegistry) Remove(id string) {
	r.m.Delete(id)
}

// CloseAll cancels and removes all streams in the registry.
func (r *StreamRegistry) CloseAll() {
	r.m.Range(func(key, value any) bool {
		value.(*Stream).Cancel()
		r.m.Delete(key)
		return true
	})
}

// Count returns the number of active streams in the registry.
func (r *StreamRegistry) Count() int {
	count := 0
	r.m.Range(func(_, _ any) bool {
		count++
		return true
	})
	return count
}
