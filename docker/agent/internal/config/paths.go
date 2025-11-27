package config

import (
	"fmt"
	"os"
	"path/filepath"
)

const (
	// Base directories
	LogBaseDir   = "/var/log/platform-agent"
	StateBaseDir = "/var/lib/platform-agent"

	// Agent version for state files
	AgentVersion = "1.0.0"
)

// Log file paths

// AgentLogPath returns the path to the agent's own log file
func AgentLogPath() string {
	return filepath.Join(LogBaseDir, "agent.log")
}

// AgentErrLogPath returns the path to the agent's error log file
func AgentErrLogPath() string {
	return filepath.Join(LogBaseDir, "agent.err.log")
}

// JobOutLogPath returns the stdout log path for a specific job
func JobOutLogPath(jobID string) string {
	return filepath.Join(LogBaseDir, "jobs", fmt.Sprintf("%s.out.log", jobID))
}

// JobErrLogPath returns the stderr log path for a specific job
func JobErrLogPath(jobID string) string {
	return filepath.Join(LogBaseDir, "jobs", fmt.Sprintf("%s.err.log", jobID))
}

// WorkerOutLogPath returns the stdout log path for a worker by job class
func WorkerOutLogPath(jobClass string) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.out.log", jobClass))
}

// WorkerErrLogPath returns the stderr log path for a worker by job class
func WorkerErrLogPath(jobClass string) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.err.log", jobClass))
}

// State file paths

// WorkerStatePath returns the state file path for a worker by job class
func WorkerStatePath(jobClass string) string {
	return filepath.Join(StateBaseDir, "workers", fmt.Sprintf("%s.json", jobClass))
}

// JobStatePath returns the state file path for a specific job
func JobStatePath(jobID string) string {
	return filepath.Join(StateBaseDir, "jobs", fmt.Sprintf("%s.json", jobID))
}

// Directory helpers

// EnsureLogDirs creates all necessary log directories
func EnsureLogDirs() error {
	dirs := []string{
		LogBaseDir,
		filepath.Join(LogBaseDir, "jobs"),
		filepath.Join(LogBaseDir, "workers"),
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create log directory %s: %w", dir, err)
		}
	}
	return nil
}

// EnsureStateDirs creates all necessary state directories
func EnsureStateDirs() error {
	dirs := []string{
		StateBaseDir,
		filepath.Join(StateBaseDir, "jobs"),
		filepath.Join(StateBaseDir, "workers"),
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create state directory %s: %w", dir, err)
		}
	}
	return nil
}

// EnsureAllDirs creates all necessary directories for the agent
func EnsureAllDirs() error {
	if err := EnsureLogDirs(); err != nil {
		return err
	}
	return EnsureStateDirs()
}
