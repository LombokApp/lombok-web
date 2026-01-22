package config

import (
	"fmt"
	"os"
	"path/filepath"
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

// UnifiedLogPath returns the path to the unified log file containing all logs
func UnifiedLogPath() string {
	return filepath.Join(LogBaseDir, "lombok-worker-agent.log")
}

// JobLogPath returns the structured log path for a specific job
func JobLogPath(jobID string) string {
	return filepath.Join(LogBaseDir, "jobs", fmt.Sprintf("%s.log", jobID))
}

// JobOutLogPath returns the stdout log path for a specific job (deprecated, use JobLogPath)
func JobOutLogPath(jobID string) string {
	return filepath.Join(LogBaseDir, "jobs", fmt.Sprintf("%s.out.log", jobID))
}

// JobErrLogPath returns the stderr log path for a specific job (deprecated, use JobLogPath)
func JobErrLogPath(jobID string) string {
	return filepath.Join(LogBaseDir, "jobs", fmt.Sprintf("%s.err.log", jobID))
}

// WorkerLogPath returns the structured log path for a worker identified by port.
func WorkerLogPath(port int) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.log", WorkerIdentifier(port)))
}

// WorkerOutLogPath returns the stdout log path for a worker identified by port (deprecated).
func WorkerOutLogPath(port int) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.out.log", WorkerIdentifier(port)))
}

// WorkerErrLogPath returns the stderr log path for a worker identified by port (deprecated).
func WorkerErrLogPath(port int) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.err.log", WorkerIdentifier(port)))
}

// WorkerIdentifier returns a stable identifier for a worker port.
func WorkerIdentifier(port int) string {
	return fmt.Sprintf("http_%d", port)
}

// State file paths

// WorkerStatePath returns the state file path for a worker.
func WorkerStatePath(port int) string {
	workerIdentifier := WorkerIdentifier(port)
	return filepath.Join(StateBaseDir, "workers", fmt.Sprintf("%s.json", workerIdentifier))
}

// WorkerStartLockPath returns the lock file path used to guard worker startup.
func WorkerStartLockPath(port int) string {
	workerIdentifier := WorkerIdentifier(port)
	return filepath.Join(StateBaseDir, "workers", fmt.Sprintf("%s.start.lock", workerIdentifier))
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
