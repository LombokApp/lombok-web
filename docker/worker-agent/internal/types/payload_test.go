package types

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestJobError_UnmarshalJSON_PlainString(t *testing.T) {
	var got JobError
	if err := json.Unmarshal([]byte(`"boom"`), &got); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.Code != "UNKNOWN" {
		t.Errorf("Code = %q, want %q", got.Code, "UNKNOWN")
	}
	if got.Message != "boom" {
		t.Errorf("Message = %q, want %q", got.Message, "boom")
	}
	if got.Origin != ErrorOriginApp {
		t.Errorf("Origin = %q, want %q", got.Origin, ErrorOriginApp)
	}
	if got.Details != nil {
		t.Errorf("Details = %v, want nil", got.Details)
	}
}

func TestJobError_UnmarshalJSON_StructuredWithoutDetails(t *testing.T) {
	var got JobError
	if err := json.Unmarshal([]byte(`{"code":"X","message":"Y"}`), &got); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.Code != "X" {
		t.Errorf("Code = %q, want %q", got.Code, "X")
	}
	if got.Message != "Y" {
		t.Errorf("Message = %q, want %q", got.Message, "Y")
	}
	if got.Origin != ErrorOriginApp {
		t.Errorf("Origin = %q, want %q (default when omitted)", got.Origin, ErrorOriginApp)
	}
	if got.Details != nil {
		t.Errorf("Details = %v, want nil", got.Details)
	}
}

func TestJobError_UnmarshalJSON_StructuredWithExplicitOrigin(t *testing.T) {
	var got JobError
	if err := json.Unmarshal([]byte(`{"code":"X","message":"Y","origin":"platform"}`), &got); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Origin != ErrorOriginPlatform {
		t.Errorf("Origin = %q, want %q", got.Origin, ErrorOriginPlatform)
	}
}

func TestJobError_UnmarshalJSON_StructuredWithDetails(t *testing.T) {
	var got JobError
	raw := `{"code":"X","message":"Y","details":{"foo":"bar","n":42,"nested":{"k":"v"}}}`
	if err := json.Unmarshal([]byte(raw), &got); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.Code != "X" {
		t.Errorf("Code = %q, want %q", got.Code, "X")
	}
	if got.Message != "Y" {
		t.Errorf("Message = %q, want %q", got.Message, "Y")
	}
	wantDetails := map[string]any{
		"foo":    "bar",
		"n":      float64(42), // json.Unmarshal decodes numbers as float64 into any
		"nested": map[string]any{"k": "v"},
	}
	if !reflect.DeepEqual(map[string]any(got.Details), wantDetails) {
		t.Errorf("Details = %#v, want %#v", got.Details, wantDetails)
	}
}

func TestJobError_MarshalJSON_RoundTrip(t *testing.T) {
	original := JobError{
		Code:    "X",
		Message: "Y",
		Origin:  ErrorOriginPlatform,
		Details: map[string]any{"foo": "bar"},
	}

	encoded, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var decoded JobError
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if decoded.Code != original.Code || decoded.Message != original.Message || decoded.Origin != original.Origin {
		t.Errorf("round-trip mismatch: got %+v, want %+v", decoded, original)
	}
	if !reflect.DeepEqual(map[string]any(decoded.Details), original.Details) {
		t.Errorf("round-trip Details mismatch: got %#v, want %#v", decoded.Details, original.Details)
	}
}

func TestJobError_MarshalJSON_OmitsEmptyDetails(t *testing.T) {
	original := JobError{Code: "X", Message: "Y", Origin: ErrorOriginApp}

	encoded, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	// `details` should be omitted when nil/empty thanks to the `omitempty` tag.
	// `origin` is required, never omitted.
	wantJSON := `{"code":"X","message":"Y","origin":"app"}`
	if string(encoded) != wantJSON {
		t.Errorf("encoded = %s, want %s", string(encoded), wantJSON)
	}
}
