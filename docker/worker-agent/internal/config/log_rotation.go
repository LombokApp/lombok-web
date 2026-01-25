package config

import (
	"os"
	"strconv"
	"time"
)

// LogRotationConfig holds configuration for log rotation behavior.
type LogRotationConfig struct {
	MaxSizeMB     int
	MaxFiles      int
	CheckInterval time.Duration
}

// LoadLogRotationConfig reads rotation parameters from environment variables.
func LoadLogRotationConfig() LogRotationConfig {
	maxSizeMB := 50
	if value, ok := os.LookupEnv("LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_SIZE_MB"); ok {
		if parsed, err := strconv.Atoi(value); err == nil && parsed >= 0 {
			maxSizeMB = parsed
		}
	}

	maxFiles := 5
	if value, ok := os.LookupEnv("LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_FILES"); ok {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
			maxFiles = parsed
		}
	}

	checkIntervalMinutes := 10
	if value, ok := os.LookupEnv("LOMBOK_WORKER_AGENT_LOG_ROTATION_CHECK_INTERVAL_MINUTES"); ok {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 {
			checkIntervalMinutes = parsed
		}
	}

	return LogRotationConfig{
		MaxSizeMB:     maxSizeMB,
		MaxFiles:      maxFiles,
		CheckInterval: time.Duration(checkIntervalMinutes) * time.Minute,
	}
}
