package logs

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestWriteWorkerLog(t *testing.T) {
	// Create a test log file in temp directory
	testDir := t.TempDir()
	logPath := filepath.Join(testDir, "test.log")
	logFile, err := os.Create(logPath)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}
	defer logFile.Close()

	// Write a test message
	testMessage := "test message with %s"
	testArg := "formatting"
	WriteWorkerLog(logFile, testMessage, testArg)

	// Read the log file
	content, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("Failed to read log file: %v", err)
	}

	contentStr := string(content)

	// Verify the log contains the formatted message
	expectedMessage := "test message with formatting"
	if !strings.Contains(contentStr, expectedMessage) {
		t.Errorf("Log should contain '%s', got: %s", expectedMessage, contentStr)
	}

	// Verify the log contains a timestamp
	if !strings.Contains(contentStr, "[") || !strings.Contains(contentStr, "]") {
		t.Error("Log should contain timestamp brackets")
	}

	// Verify the log contains the agent identifier
	if !strings.Contains(contentStr, "lombok-worker-agent") {
		t.Error("Log should contain agent identifier")
	}
}

func TestWriteWorkerLog_NilFile(t *testing.T) {
	// Should not panic when file is nil
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("WriteWorkerLog panicked with nil file: %v", r)
		}
	}()

	WriteWorkerLog(nil, "test message")
	// If we get here, no panic occurred
}

func TestWriteWorkerLog_TimingFormat(t *testing.T) {
	// Create a test log file in temp directory
	testDir := t.TempDir()
	logPath := filepath.Join(testDir, "timing.log")
	logFile, err := os.Create(logPath)
	if err != nil {
		t.Fatalf("Failed to create test log file: %v", err)
	}
	defer logFile.Close()

	// Write a timing message (similar to what we do in the runner)
	duration := time.Duration(1234) * time.Millisecond // 1.234 seconds
	WriteWorkerLog(logFile, "job_id=test-123 job_execution_time=%.3fs", duration.Seconds())

	// Read the log file
	content, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("Failed to read log file: %v", err)
	}

	contentStr := string(content)

	// Verify the timing format is correct
	if !strings.Contains(contentStr, "job_execution_time=1.234") {
		t.Errorf("Log should contain formatted timing, got: %s", contentStr)
	}

	// Verify job_id is present
	if !strings.Contains(contentStr, "job_id=test-123") {
		t.Error("Log should contain job_id")
	}
}
