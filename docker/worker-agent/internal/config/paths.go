package config

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"

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
func WorkerOutLogPath(workerCommand []string, iface types.InterfaceConfig) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.out.log", WorkerIdentifier(workerCommand, iface)))
}

// WorkerErrLogPath returns the stderr log path for a worker identified by a unique key
func WorkerErrLogPath(workerCommand []string, iface types.InterfaceConfig) string {
	return filepath.Join(LogBaseDir, "workers", fmt.Sprintf("%s.err.log", WorkerIdentifier(workerCommand, iface)))
}

// sanitizeFilepathComponent encodes a string to make it safe for use in filepaths while preserving uniqueness.
// Safe characters (alphanumeric, dots, underscores, hyphens) are kept as-is.
// Unsafe characters are encoded as their hex representation prefixed with an underscore (e.g., '/' becomes '_2F_', space becomes '_20_').
// This ensures different inputs produce different outputs, avoiding collisions.
func sanitizeFilepathComponent(s string) string {
	if s == "" {
		return ""
	}

	var builder strings.Builder
	for _, r := range s {
		// Keep safe characters as-is
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '.' || r == '_' || r == '-' {
			builder.WriteRune(r)
		} else {
			// Encode unsafe characters as hex (e.g., '/' -> '_2F_', ' ' -> '_20_')
			encoded := hex.EncodeToString([]byte(string(r)))
			builder.WriteString("_")
			builder.WriteString(encoded)
			builder.WriteString("_")
		}
	}

	return builder.String()
}

// WorkerIdentifier returns a stable identifier for a worker based on its command and interface configuration.
// This keeps persistent HTTP worker logs unique per listener/command combination.
// For long commands, it uses a hash to avoid filesystem filename length limits.
func WorkerIdentifier(workerCommand []string, iface types.InterfaceConfig) string {
	commandPart := strings.Join(workerCommand, " ")

	// If the command is too long (after sanitization it could exceed filesystem limits),
	// use a hash instead. Most filesystems have a 255-byte limit for filenames.
	// We'll use a threshold of 200 characters to leave room for the interface part and extensions.
	const maxCommandLength = 200

	sanitizedCommand := sanitizeFilepathComponent(commandPart)
	if len(sanitizedCommand) > maxCommandLength {
		// Hash the command for uniqueness while keeping it short
		hash := sha256.Sum256([]byte(commandPart))
		commandPart = hex.EncodeToString(hash[:])[:16] // Use first 16 chars of hash (32 hex chars would be 64 bytes)
	} else {
		commandPart = sanitizedCommand
	}

	interfacePart := iface.Kind
	if iface.Port != nil {
		interfacePart = fmt.Sprintf("%s %d", iface.Kind, *iface.Port)
	}
	interfacePart = sanitizeFilepathComponent(interfacePart)

	parts := []string{"_", commandPart, interfacePart}

	return strings.Join(parts, "__")
}

// State file paths

// WorkerStatePath returns the state file path for a worker by job class
func WorkerStatePath(workerCommand []string, iface types.InterfaceConfig) string {
	workerIdentifier := WorkerIdentifier(workerCommand, iface)
	return filepath.Join(StateBaseDir, "workers", fmt.Sprintf("%s.json", workerIdentifier))
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
