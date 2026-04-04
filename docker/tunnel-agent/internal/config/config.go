package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Config holds all configuration for the tunnel agent, parsed from CLI flags.
type Config struct {
	Ports            []int
	HealthPort       int
	LogLevel         string
	MaxBodyChunkSize int64
	ProxyTimeout     time.Duration
}

// ParsePorts parses a string slice of port numbers (from cobra StringSlice flag).
func ParsePorts(parts []string) ([]int, error) {
	ports := make([]int, 0, len(parts))

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		port, err := strconv.Atoi(part)
		if err != nil {
			return nil, fmt.Errorf("invalid port %q: %w", part, err)
		}
		if port <= 0 || port > 65535 {
			return nil, fmt.Errorf("port %d out of valid range (1-65535)", port)
		}
		ports = append(ports, port)
	}

	if len(ports) == 0 {
		return nil, fmt.Errorf("at least one port required")
	}

	return ports, nil
}

