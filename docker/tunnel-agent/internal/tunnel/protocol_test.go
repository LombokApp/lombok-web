package tunnel_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"docker-bridge-tunnel-agent/internal/tunnel"
)

func TestProtocol(t *testing.T) {
	t.Run("HTTPRequestMsg marshals to JSON with correct type", func(t *testing.T) {
		msg := tunnel.HTTPRequestMsg{
			Envelope: tunnel.Envelope{
				Type:     tunnel.MsgHTTPRequest,
				StreamID: "stream-001",
			},
			Method:  "GET",
			Path:    "/api/data",
			Headers: map[string]string{"Authorization": "Bearer token"},
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("marshal failed: %v", err)
		}

		var result map[string]interface{}
		if err := json.Unmarshal(data, &result); err != nil {
			t.Fatalf("unmarshal to map failed: %v", err)
		}

		if result["type"] != "http_request" {
			t.Errorf("expected type=http_request, got %v", result["type"])
		}
		if result["stream_id"] != "stream-001" {
			t.Errorf("expected stream_id=stream-001, got %v", result["stream_id"])
		}
		if result["method"] != "GET" {
			t.Errorf("expected method=GET, got %v", result["method"])
		}
	})

	t.Run("HTTPResponseMsg with body_follows=true marshals correctly", func(t *testing.T) {
		msg := tunnel.HTTPResponseMsg{
			Envelope: tunnel.Envelope{
				Type:     tunnel.MsgHTTPResponse,
				StreamID: "stream-002",
			},
			StatusCode:  200,
			Headers:     map[string]string{"Content-Type": "application/json"},
			BodyLen:     1024,
			BodyFollows: true,
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("marshal failed: %v", err)
		}

		var result map[string]interface{}
		if err := json.Unmarshal(data, &result); err != nil {
			t.Fatalf("unmarshal to map failed: %v", err)
		}

		if result["type"] != "http_response" {
			t.Errorf("expected type=http_response, got %v", result["type"])
		}
		if result["body_follows"] != true {
			t.Errorf("expected body_follows=true, got %v", result["body_follows"])
		}
		if result["status_code"] != float64(200) {
			t.Errorf("expected status_code=200, got %v", result["status_code"])
		}
	})

	t.Run("ReadyMsg marshals correctly", func(t *testing.T) {
		msg := tunnel.ReadyMsg{
			Envelope: tunnel.Envelope{
				Type: tunnel.MsgReady,
			},
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("marshal failed: %v", err)
		}

		var result map[string]interface{}
		if err := json.Unmarshal(data, &result); err != nil {
			t.Fatalf("unmarshal to map failed: %v", err)
		}

		if result["type"] != "ready" {
			t.Errorf("expected type=ready, got %v", result["type"])
		}
	})

	t.Run("HeartbeatMsg marshals correctly", func(t *testing.T) {
		msg := tunnel.HeartbeatMsg{
			Envelope: tunnel.Envelope{
				Type: tunnel.MsgHeartbeat,
			},
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("marshal failed: %v", err)
		}

		var result map[string]interface{}
		if err := json.Unmarshal(data, &result); err != nil {
			t.Fatalf("unmarshal to map failed: %v", err)
		}

		if result["type"] != "heartbeat" {
			t.Errorf("expected type=heartbeat, got %v", result["type"])
		}
	})

	t.Run("JSON unmarshal of http_request envelope populates StreamID correctly", func(t *testing.T) {
		input := `{"type":"http_request","stream_id":"abc-123","method":"POST","path":"/submit","headers":{}}`

		var msg tunnel.HTTPRequestMsg
		if err := json.Unmarshal([]byte(input), &msg); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}

		if msg.Type != tunnel.MsgHTTPRequest {
			t.Errorf("expected Type=MsgHTTPRequest, got %v", msg.Type)
		}
		if msg.StreamID != "abc-123" {
			t.Errorf("expected StreamID=abc-123, got %v", msg.StreamID)
		}
		if msg.Method != "POST" {
			t.Errorf("expected Method=POST, got %v", msg.Method)
		}
	})

	t.Run("WSUpgradeMsg and WSUpgradeAckMsg round-trip", func(t *testing.T) {
		upgrade := tunnel.WSUpgradeMsg{
			Envelope: tunnel.Envelope{
				Type:     tunnel.MsgWSUpgrade,
				StreamID: "ws-stream-001",
			},
			Path:    "/ws/echo",
			Headers: map[string]string{"Upgrade": "websocket"},
		}

		data, err := json.Marshal(upgrade)
		if err != nil {
			t.Fatalf("marshal WSUpgradeMsg failed: %v", err)
		}

		var decoded tunnel.WSUpgradeMsg
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("unmarshal WSUpgradeMsg failed: %v", err)
		}

		if decoded.Type != tunnel.MsgWSUpgrade {
			t.Errorf("expected Type=MsgWSUpgrade, got %v", decoded.Type)
		}
		if decoded.StreamID != "ws-stream-001" {
			t.Errorf("expected StreamID=ws-stream-001, got %v", decoded.StreamID)
		}
		if decoded.Path != "/ws/echo" {
			t.Errorf("expected Path=/ws/echo, got %v", decoded.Path)
		}

		ack := tunnel.WSUpgradeAckMsg{
			Envelope: tunnel.Envelope{
				Type:     tunnel.MsgWSUpgradeAck,
				StreamID: "ws-stream-001",
			},
			Success: true,
		}

		ackData, err := json.Marshal(ack)
		if err != nil {
			t.Fatalf("marshal WSUpgradeAckMsg failed: %v", err)
		}

		var decodedAck tunnel.WSUpgradeAckMsg
		if err := json.Unmarshal(ackData, &decodedAck); err != nil {
			t.Fatalf("unmarshal WSUpgradeAckMsg failed: %v", err)
		}

		if decodedAck.Type != tunnel.MsgWSUpgradeAck {
			t.Errorf("expected Type=MsgWSUpgradeAck, got %v", decodedAck.Type)
		}
		if !decodedAck.Success {
			t.Error("expected Success=true")
		}
	})
}

func TestStreamRegistry(t *testing.T) {
	t.Run("Register and Get returns the registered stream", func(t *testing.T) {
		reg := &tunnel.StreamRegistry{}
		_, cancel := context.WithCancel(context.Background())

		stream := tunnel.NewStream("stream-001", cancel)
		reg.Register("stream-001", stream)

		got, ok := reg.Get("stream-001")
		if !ok {
			t.Fatal("expected to find stream, got false")
		}
		if got.ID != "stream-001" {
			t.Errorf("expected ID=stream-001, got %s", got.ID)
		}
	})

	t.Run("Remove makes stream no longer retrievable", func(t *testing.T) {
		reg := &tunnel.StreamRegistry{}
		stream := tunnel.NewStream("stream-002", func() {})
		reg.Register("stream-002", stream)

		reg.Remove("stream-002")

		_, ok := reg.Get("stream-002")
		if ok {
			t.Fatal("expected stream to be removed, but it was still found")
		}
	})

	t.Run("CloseAll calls Cancel on all streams and empties map", func(t *testing.T) {
		reg := &tunnel.StreamRegistry{}

		cancelled := make([]bool, 3)
		for i := range 3 {
			idx := i
			stream := tunnel.NewStream(fmt.Sprintf("stream-%03d", i), func() {
				cancelled[idx] = true
			})
			reg.Register(fmt.Sprintf("stream-%03d", i), stream)
		}

		if reg.Count() != 3 {
			t.Fatalf("expected 3 streams before CloseAll, got %d", reg.Count())
		}

		reg.CloseAll()

		if reg.Count() != 0 {
			t.Errorf("expected 0 streams after CloseAll, got %d", reg.Count())
		}

		for i, c := range cancelled {
			if !c {
				t.Errorf("expected stream %d to be cancelled, but it was not", i)
			}
		}
	})

	t.Run("Count returns correct count before and after operations", func(t *testing.T) {
		reg := &tunnel.StreamRegistry{}

		if reg.Count() != 0 {
			t.Errorf("expected count=0 on empty registry, got %d", reg.Count())
		}

		reg.Register("s1", tunnel.NewStream("s1", func() {}))
		reg.Register("s2", tunnel.NewStream("s2", func() {}))

		if reg.Count() != 2 {
			t.Errorf("expected count=2, got %d", reg.Count())
		}

		reg.Remove("s1")

		if reg.Count() != 1 {
			t.Errorf("expected count=1 after remove, got %d", reg.Count())
		}
	})
}
