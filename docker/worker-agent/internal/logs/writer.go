package logs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"

	"lombok-worker-agent/internal/config"
)

var (
	agentLogFile   *os.File
	unifiedLogFile *os.File
	logMutex       sync.Mutex
	initialized    bool
	rotationCtx    context.Context
	rotationCancel context.CancelFunc
)

func rotationTargets() []rotationTarget {
	return []rotationTarget{
		{
			name: "agent log",
			path: config.AgentLogPath(),
			getFile: func() *os.File {
				return agentLogFile
			},
			setFile: func(f *os.File) {
				agentLogFile = f
			},
		},
		{
			name: "unified log",
			path: config.UnifiedLogPath(),
			getFile: func() *os.File {
				return unifiedLogFile
			},
			setFile: func(f *os.File) {
				unifiedLogFile = f
			},
		},
	}
}

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

	// Open agent log file in append mode (create if doesn't exist)
	logPath := config.AgentLogPath()
	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open agent log file: %w", err)
	}

	agentLogFile = file

	// Open unified log file in append mode (create if doesn't exist)
	unifiedLogPath := config.UnifiedLogPath()
	unifiedFile, err := os.OpenFile(unifiedLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		// Close agent log file if unified log fails
		file.Close()
		return fmt.Errorf("failed to open unified log file: %w", err)
	}

	unifiedLogFile = unifiedFile
	initialized = true

	rotationCfg := config.LoadLogRotationConfig()
	rotationCtx, rotationCancel = context.WithCancel(context.Background())
	startRotationChecker(rotationCtx, rotationCfg, &logMutex, rotationTargets())

	return nil
}

// CloseAgentLog closes the agent log file and unified log file.
// Should be called during shutdown.
func CloseAgentLog() error {
	if rotationCancel != nil {
		rotationCancel()
		rotationCancel = nil
	}
	logMutex.Lock()
	defer logMutex.Unlock()

	var firstErr error

	if agentLogFile != nil {
		if err := agentLogFile.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
		agentLogFile = nil
	}

	if unifiedLogFile != nil {
		if err := unifiedLogFile.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
		unifiedLogFile = nil
	}

	initialized = false
	rotationCtx = nil
	return firstErr
}

// LogLevel represents the severity level of a log entry
type LogLevel string

const (
	LogLevelTrace LogLevel = "TRACE"
	LogLevelDebug LogLevel = "DEBUG"
	LogLevelInfo  LogLevel = "INFO"
	LogLevelWarn  LogLevel = "WARN"
	LogLevelError LogLevel = "ERROR"
	LogLevelFatal LogLevel = "FATAL"
)

// writeAgentLogInternal is the internal implementation that writes a structured log entry.
// Format: timestamp|LEVEL|["message",{optional_data_object}]
const logTimestampFormat = "2006-01-02T15:04:05.000Z07:00"

func formatLogTimestamp() string {
	return time.Now().UTC().Format(logTimestampFormat)
}

func writeAgentLogInternal(level LogLevel, message string, data any) {
	logMutex.Lock()
	defer logMutex.Unlock()

	// Get timestamp
	timestamp := formatLogTimestamp()

	// Build the log entry array: ["message", {optional_data}]
	logEntry := []any{message}
	if data != nil {
		logEntry = append(logEntry, data)
	}

	// Serialize the log entry array to JSON
	logEntryJSON, err := json.Marshal(logEntry)
	if err != nil {
		// Fallback to plain message if JSON marshaling fails
		logEntryJSON = []byte(fmt.Sprintf(`["%s"]`, message))
	}

	// Format: timestamp|LEVEL|["message",{data}]
	logLine := fmt.Sprintf("%s|%s|%s\n", timestamp, level, string(logEntryJSON))

	// Write to agent log file (if initialized)
	if agentLogFile != nil {
		// Write to file (ignore errors to avoid breaking execution)
		_, _ = io.WriteString(agentLogFile, logLine)
		// Flush to ensure data is written immediately
		_ = agentLogFile.Sync()
	}

	// Also write to unified log file with timestamp|AGENT| prefix
	if unifiedLogFile != nil {
		// Format: timestamp|AGENT|LEVEL|["message",{data}]
		unifiedLine := fmt.Sprintf("%s|AGENT|%s|%s\n", timestamp, level, string(logEntryJSON))
		_, _ = io.WriteString(unifiedLogFile, unifiedLine)
		_ = unifiedLogFile.Sync()
	}
}

// WriteAgentLog writes a structured log entry with a simple message and optional data.
// Format: timestamp|LEVEL|["message",{optional_data_object}]
// The level must be one of: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
// The data parameter is optional and can be any JSON-serializable object (or nil).
func WriteAgentLog(level LogLevel, msg string, data any) {
	writeAgentLogInternal(level, msg, data)
}

// WriteAgentLogf writes a structured log entry with a formatted message (no data).
// Format: timestamp|LEVEL|["message",{optional_data_object}]
// The level must be one of: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
func WriteAgentLogf(level LogLevel, format string, args ...any) {
	message := fmt.Sprintf(format, args...)
	writeAgentLogInternal(level, message, nil)
}

// WriteAgentLogfWithData writes a structured log entry with a formatted message and optional data.
// Format: timestamp|LEVEL|["message",{optional_data_object}]
// The level must be one of: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
// The data parameter can be any JSON-serializable object (or nil).
func WriteAgentLogfWithData(level LogLevel, data any, format string, args ...any) {
	message := fmt.Sprintf(format, args...)
	writeAgentLogInternal(level, message, data)
}

// ParseStructuredWorkerLogLine parses a structured log line from a worker.
// Expected format: LEVEL|["message",{optional_data_object}]
// Returns the level, message, data, and a boolean indicating if parsing was successful.
func ParseStructuredWorkerLogLine(line string) (LogLevel, string, any, bool) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return "", "", nil, false
	}

	// Split by the first pipe separator: LEVEL|JSON
	parts := strings.SplitN(trimmed, "|", 2)
	if len(parts) != 2 {
		return "", "", nil, false
	}

	levelStr := strings.TrimSpace(parts[0])
	jsonPart := strings.TrimSpace(parts[1])

	// Validate level
	level := LogLevel(levelStr)
	validLevels := []LogLevel{LogLevelTrace, LogLevelDebug, LogLevelInfo, LogLevelWarn, LogLevelError, LogLevelFatal}
	valid := false
	for _, validLevel := range validLevels {
		if level == validLevel {
			valid = true
			break
		}
	}
	if !valid {
		return "", "", nil, false
	}

	// Parse the JSON array: ["message",{optional_data}]
	var logArray []any
	if err := json.Unmarshal([]byte(jsonPart), &logArray); err != nil {
		return "", "", nil, false
	}

	if len(logArray) == 0 {
		return "", "", nil, false
	}

	// Extract message (first element)
	message, ok := logArray[0].(string)
	if !ok {
		return "", "", nil, false
	}

	// Extract data (second element, if present)
	var data any
	if len(logArray) > 1 {
		data = logArray[1]
	}

	return level, message, data, true
}

// WriteJobLog writes a structured log entry to a job log file.
// Format: timestamp|LEVEL|["message",{optional_data_object}]
// This is similar to agent logs but for job-specific logs.
// Also writes to unified log file with JOB_ID_<job_id>| prefix.
func WriteJobLog(jobLogFile *os.File, jobID string, level LogLevel, message string, data any) error {
	if jobLogFile == nil {
		return nil
	}

	// Get timestamp
	timestamp := formatLogTimestamp()

	// Build the log entry array: ["message", {optional_data}]
	logEntry := []any{message}
	if data != nil {
		logEntry = append(logEntry, data)
	}

	// Serialize the log entry array to JSON
	logEntryJSON, err := json.Marshal(logEntry)
	if err != nil {
		// Fallback to plain message if JSON marshaling fails
		logEntryJSON = []byte(fmt.Sprintf(`["%s"]`, message))
	}

	// Format: timestamp|LEVEL|["message",{data}]
	logLine := fmt.Sprintf("%s|%s|%s\n", timestamp, level, string(logEntryJSON))

	// Write to job log file
	_, err = io.WriteString(jobLogFile, logLine)
	if err != nil {
		return fmt.Errorf("failed to write job log: %w", err)
	}

	// Flush to ensure data is written immediately
	if err := jobLogFile.Sync(); err != nil {
		return err
	}

	// Also write to unified log file with timestamp|JOB_ID_<job_id>| prefix
	logMutex.Lock()
	defer logMutex.Unlock()
	if unifiedLogFile != nil && jobID != "" {
		// Format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
		unifiedLine := fmt.Sprintf("%s|JOB_ID_%s|%s|%s\n", timestamp, jobID, level, string(logEntryJSON))
		_, _ = io.WriteString(unifiedLogFile, unifiedLine)
		_ = unifiedLogFile.Sync()
	}

	return nil
}

// WriteUnifiedWorkerLog writes a worker log line to the unified log file with timestamp|WORKER_<port>| prefix.
// All lines are converted to structured format: timestamp|WORKER_<port>|LEVEL|["message",{data}]
// If the line is unstructured, defaultLevel is used.
func WriteUnifiedWorkerLog(port int, line string, defaultLevel LogLevel) {
	logMutex.Lock()
	defer logMutex.Unlock()

	if unifiedLogFile == nil {
		return
	}

	// Get timestamp
	timestamp := formatLogTimestamp()

	// Try to parse as job-specific structured log first
	// Format: JOB_ID__<job_id>|<level>|<message_and_optional_json_object>
	// Note: We don't use parsePersistentWorkerLogLine here because it's in the runner package
	// Instead, we check if it starts with JOB_ID__ and parse it manually
	trimmed := strings.TrimSpace(line)
	var level LogLevel
	var message string
	var data any

	const jobLogPrefix = "JOB_ID__"
	if strings.HasPrefix(trimmed, jobLogPrefix) {
		// This is a job-specific log line - extract the level and message
		// Format: JOB_ID__<job_id>|<level>|<json_array>
		rest := trimmed[len(jobLogPrefix):]
		parts := strings.SplitN(rest, "|", 3)
		if len(parts) == 3 {
			levelStr := strings.TrimSpace(parts[1])
			jsonPart := strings.TrimSpace(parts[2])
			level = LogLevel(levelStr)
			// Validate level
			validLevels := []LogLevel{LogLevelTrace, LogLevelDebug, LogLevelInfo, LogLevelWarn, LogLevelError, LogLevelFatal}
			valid := false
			for _, validLevel := range validLevels {
				if level == validLevel {
					valid = true
					break
				}
			}
			if valid {
				// Parse the JSON array: ["message",{optional_data}]
				var logArray []any
				if err := json.Unmarshal([]byte(jsonPart), &logArray); err == nil && len(logArray) > 0 {
					if msg, ok := logArray[0].(string); ok {
						message = msg
						if len(logArray) > 1 {
							data = logArray[1]
						}
					}
				}
			}
		}
	}

	// If we didn't parse it as job-specific, try regular structured log
	if level == "" {
		level, message, data, _ = ParseStructuredWorkerLogLine(line)
	}

	// If still not structured, treat as plain text at the default level
	if level == "" {
		level = defaultLevel
		if level == "" {
			level = LogLevelInfo
		}
		message = line
		data = nil
	}

	// Build the log entry array: ["message", {optional_data}]
	logEntry := []any{message}
	if data != nil {
		logEntry = append(logEntry, data)
	}

	// Serialize the log entry array to JSON
	logEntryJSON, err := json.Marshal(logEntry)
	if err != nil {
		// Fallback to plain message if JSON marshaling fails
		logEntryJSON = []byte(fmt.Sprintf(`["%s"]`, message))
	}

	// Format: timestamp|WORKER_<port>|LEVEL|["message",{data}]
	unifiedLine := fmt.Sprintf("%s|WORKER_%d|%s|%s\n", timestamp, port, level, string(logEntryJSON))
	_, _ = io.WriteString(unifiedLogFile, unifiedLine)
	_ = unifiedLogFile.Sync()
}
