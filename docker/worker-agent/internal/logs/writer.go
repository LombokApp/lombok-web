package logs

import (
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	"lombok-worker-agent/internal/config"
)

var (
	agentLogFile *os.File
	logMutex     sync.Mutex
	initialized  bool
)

// InitAgentLog initializes the agent log file for writing.
// It ensures the log directory exists and opens the log file in append mode.
// This should be called once at startup.
func InitAgentLog() error {
	logMutex.Lock()
	defer logMutex.Unlock()

	if initialized {
		return nil // Already initialized
	}

	// Ensure log directories exist
	if err := config.EnsureLogDirs(); err != nil {
		return fmt.Errorf("failed to ensure log directories: %w", err)
	}

	// Open log file in append mode (create if doesn't exist)
	logPath := config.AgentLogPath()
	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open agent log file: %w", err)
	}

	agentLogFile = file
	initialized = true

	return nil
}

// CloseAgentLog closes the agent log file.
// Should be called during shutdown.
func CloseAgentLog() error {
	logMutex.Lock()
	defer logMutex.Unlock()

	if agentLogFile != nil {
		err := agentLogFile.Close()
		agentLogFile = nil
		initialized = false
		return err
	}

	return nil
}

// WriteAgentLog writes a message to both stderr and the agent log file.
// The message is prefixed with a timestamp and the agent identifier.
func WriteAgentLog(format string, args ...any) {
	logMutex.Lock()
	defer logMutex.Unlock()

	// Format the message
	message := fmt.Sprintf(format, args...)

	// Add timestamp prefix
	timestamp := time.Now().UTC().Format(time.RFC3339)
	logLine := fmt.Sprintf("[%s] [lombok-worker-agent] %s\n", timestamp, message)

	// Write to log file (if initialized)
	if agentLogFile != nil {
		// Write to file (ignore errors to avoid breaking execution)
		_, _ = io.WriteString(agentLogFile, logLine)
		// Flush to ensure data is written immediately
		_ = agentLogFile.Sync()
	}
}

// WriteWorkerLog writes a timing message to a worker log file (stdout or stderr).
// The message is prefixed with a timestamp and the agent identifier.
func WriteWorkerLog(logFile *os.File, format string, args ...any) {
	if logFile == nil {
		return
	}

	// Format the message
	message := fmt.Sprintf(format, args...)

	// Add timestamp prefix
	timestamp := time.Now().UTC().Format(time.RFC3339)
	logLine := fmt.Sprintf("[%s] [lombok-worker-agent] %s\n", timestamp, message)

	// Write to log file (ignore errors to avoid breaking execution)
	_, _ = io.WriteString(logFile, logLine)
	_ = logFile.Sync()
}
