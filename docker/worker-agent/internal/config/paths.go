package config

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"lombok-worker-agent/internal/types"
)

const (
	// Base directories
	LogBaseDir   = "/var/log/lombok-worker-agent"
	StateBaseDir = "/var/lib/lombok-worker-agent"

	// Agent version for state files
	AgentVersion = "1.0.0"
)

// Log file paths

// AgentLogPath returns the path to the agent's own log file
func AgentLogPath() string {
	return filepath.Join(LogBaseDir, "agent.log")
}

// JobOutLogPath returns the stdout log path for a specific job
func JobOutLogPath(jobID string) string {
	return filepath.Join(LogBaseDir, "jobs", fmt.Sprintf("%s.out.log", jobID))
}

// JobErrLogPath returns the stderr log path for a specific job
func JobErrLogPath(jobID string) string {
	return filepath.Join(LogBaseDir, "jobs", fmt.Sprintf("%s.err.log", jobID))
}

// WorkerOutLogPath returns the stdout log path for a worker identified by a unique key
func WorkerOutLogPath(identifier string) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.out.log", identifier))
}

// WorkerErrLogPath returns the stderr log path for a worker identified by a unique key
func WorkerErrLogPath(identifier string) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.err.log", identifier))
}

// WorkerLogIdentifier returns a stable hash for a worker based on its command and interface configuration.
// This keeps persistent HTTP worker logs unique per listener/command combination.
func WorkerLogIdentifier(workerCommand []string, iface *types.InterfaceConfig) string {
	identity := struct {
		WorkerCommand []string               `json:"worker_command"`
		Interface     *types.InterfaceConfig `json:"interface"`
	}{
		WorkerCommand: workerCommand,
		Interface:     iface,
	}

	data, _ := json.Marshal(identity)
	sum := sha256.Sum256(data)
	return fmt.Sprintf("%x", sum[:])
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

// JobResultPath returns the result file path for a specific job
func JobResultPath(jobID string) string {
	return filepath.Join(StateBaseDir, "jobs", fmt.Sprintf("%s.result.json", jobID))
}

// JobOutputDir returns the output directory for a specific job
func JobOutputDir(jobID string) string {
	return filepath.Join(StateBaseDir, "jobs", jobID, "output")
}

// JobManifestPath returns the path to the output manifest for a specific job
func JobManifestPath(jobID string) string {
	return filepath.Join(JobOutputDir(jobID), "__manifest__.json")
}

// EnsureJobOutputDir creates the output directory for a specific job
func EnsureJobOutputDir(jobID string) error {
	dir := JobOutputDir(jobID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create job output directory %s: %w", dir, err)
	}
	return nil
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
