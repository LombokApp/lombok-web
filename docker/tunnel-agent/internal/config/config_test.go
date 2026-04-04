package config

import (
	"testing"
)

func TestParsePorts(t *testing.T) {
	tests := []struct {
		name    string
		input   []string
		want    []int
		wantErr string
	}{
		{
			name:  "single port",
			input: []string{"3000"},
			want:  []int{3000},
		},
		{
			name:  "multiple ports",
			input: []string{"3000", "5173", "8080"},
			want:  []int{3000, 5173, 8080},
		},
		{
			name:  "trims whitespace",
			input: []string{" 3000 ", "  5173  "},
			want:  []int{3000, 5173},
		},
		{
			name:  "skips empty strings",
			input: []string{"3000", "", "5173"},
			want:  []int{3000, 5173},
		},
		{
			name:  "port 1 (minimum valid)",
			input: []string{"1"},
			want:  []int{1},
		},
		{
			name:  "port 65535 (maximum valid)",
			input: []string{"65535"},
			want:  []int{65535},
		},
		{
			name:    "port 0 is invalid",
			input:   []string{"0"},
			wantErr: "port 0 out of valid range",
		},
		{
			name:    "port 65536 is invalid",
			input:   []string{"65536"},
			wantErr: "port 65536 out of valid range",
		},
		{
			name:    "negative port is invalid",
			input:   []string{"-1"},
			wantErr: "port -1 out of valid range",
		},
		{
			name:    "non-numeric input",
			input:   []string{"abc"},
			wantErr: "invalid port",
		},
		{
			name:    "empty slice",
			input:   []string{},
			wantErr: "at least one port required",
		},
		{
			name:    "all empty strings",
			input:   []string{"", "", ""},
			wantErr: "at least one port required",
		},
		{
			name:    "mixed valid and invalid",
			input:   []string{"3000", "notaport"},
			wantErr: "invalid port",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParsePorts(tt.input)
			if tt.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantErr)
				}
				if !containsStr(err.Error(), tt.wantErr) {
					t.Fatalf("expected error containing %q, got %q", tt.wantErr, err.Error())
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("got %d ports, want %d", len(got), len(tt.want))
			}
			for i, p := range got {
				if p != tt.want[i] {
					t.Errorf("port[%d] = %d, want %d", i, p, tt.want[i])
				}
			}
		})
	}
}

func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && searchStr(s, substr)
}

func searchStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
