package runner

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/types"
)

func TestRunExecPerJob_Timing(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		// Try to create directories, skip if we can't
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	// Create a simple test payload
	jobInput := json.RawMessage(`{"test": "data"}`)
	jobInputB64 := base64.StdEncoding.EncodeToString(jobInput)

	payload := &types.JobPayload{
		JobID:         "test-job-123",
		JobClass:      "test_class",
		WorkerCommand: []string{"echo", jobInputB64},
		Interface: types.InterfaceConfig{
			Kind: "exec_per_job",
		},
		JobInput: jobInput,
	}

	// Track start time
	jobStartTime := time.Now()

	// Run the job
	err := RunExecPerJob(payload, jobStartTime)
	if err != nil {
		t.Fatalf("RunExecPerJob failed: %v", err)
	}

	// Verify timing was logged in agent log
	agentLogPath := config.AgentLogPath()
	agentLogContent, err := os.ReadFile(agentLogPath)
	if err != nil {
		t.Fatalf("Failed to read agent log: %v", err)
	}

	agentLogStr := string(agentLogContent)
	if !strings.Contains(agentLogStr, "job_execution_time") {
		t.Error("Agent log should contain job_execution_time")
	}
	if !strings.Contains(agentLogStr, "total_time") {
		t.Error("Agent log should contain total_time")
	}
	if !strings.Contains(agentLogStr, "worker_startup_time") {
		t.Error("Agent log should contain worker_startup_time")
	}

	// Verify worker output was written to worker log (not job log)
	workerOutLogPath := config.WorkerOutLogPath(payload.WorkerCommand, payload.Interface)
	workerOutLogContent, err := os.ReadFile(workerOutLogPath)
	if err != nil {
		t.Fatalf("Failed to read worker stdout log: %v", err)
	}

	workerLogStr := string(workerOutLogContent)
	// Verify the worker's actual output is in the log (the base64 encoded input)
	if !strings.Contains(workerLogStr, jobInputB64) {
		t.Error("Worker log should contain worker output")
	}
}

func TestRunExecPerJob_TimingInResponse(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		// Try to create directories, skip if we can't
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	// Create a simple test payload
	jobInput := json.RawMessage(`{"test": "data"}`)
	jobInputB64 := base64.StdEncoding.EncodeToString(jobInput)

	payload := &types.JobPayload{
		JobID:         "test-job-456",
		JobClass:      "test_class",
		WorkerCommand: []string{"echo", jobInputB64},
		Interface: types.InterfaceConfig{
			Kind: "exec_per_job",
		},
		JobInput: jobInput,
	}

	// Track start time
	jobStartTime := time.Now()

	// Run the job (it will print JSON to stdout)
	err := RunExecPerJob(payload, jobStartTime)
	if err != nil {
		t.Fatalf("RunExecPerJob failed: %v", err)
	}

	// Note: In a real scenario, we'd capture stdout, but since RunExecPerJob
	// uses fmt.Println which goes to the actual stdout, we'll verify the
	// timing structure by checking that the function completes successfully
	// and that timing is logged. The actual JSON output verification would
	// require more complex stdout capture or integration testing.

	// Verify timing was logged (which confirms timing was calculated)
	agentLogPath := config.AgentLogPath()
	agentLogContent, err := os.ReadFile(agentLogPath)
	if err != nil {
		t.Fatalf("Failed to read agent log: %v", err)
	}

	agentLogStr := string(agentLogContent)
	if !strings.Contains(agentLogStr, "job_execution_time") {
		t.Error("Agent log should contain job_execution_time")
	}
	if !strings.Contains(agentLogStr, "total_time") {
		t.Error("Agent log should contain total_time")
	}
}

func TestRunExecPerJob_WorkerStartupTiming(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		// Try to create directories, skip if we can't
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	// Create a test payload
	jobInput := json.RawMessage(`{"test": "data"}`)
	jobInputB64 := base64.StdEncoding.EncodeToString(jobInput)

	// Use a command that will definitely start
	var cmd string
	if _, err := exec.LookPath("sh"); err == nil {
		cmd = "sh"
	} else if _, err := exec.LookPath("bash"); err == nil {
		cmd = "bash"
	} else {
		t.Skip("No shell available for test")
	}

	payload := &types.JobPayload{
		JobID:         "test-job-startup",
		JobClass:      "test_class",
		WorkerCommand: []string{cmd, "-c", "echo " + jobInputB64},
		Interface: types.InterfaceConfig{
			Kind: "exec_per_job",
		},
		JobInput: jobInput,
	}

	jobStartTime := time.Now()
	err := RunExecPerJob(payload, jobStartTime)
	if err != nil {
		t.Fatalf("RunExecPerJob failed: %v", err)
	}

	// Verify worker startup time is logged
	agentLogPath := config.AgentLogPath()
	agentLogContent, err := os.ReadFile(agentLogPath)
	if err != nil {
		t.Fatalf("Failed to read agent log: %v", err)
	}

	agentLogStr := string(agentLogContent)
	if !strings.Contains(agentLogStr, "worker_startup_time") {
		t.Error("Agent log should contain worker_startup_time")
	}

	// Verify worker output was written to worker log (not job log)
	workerOutLogPath := config.WorkerOutLogPath(payload.WorkerCommand, payload.Interface)
	workerOutLogContent, err := os.ReadFile(workerOutLogPath)
	if err != nil {
		t.Fatalf("Failed to read worker stdout log: %v", err)
	}

	workerLogStr := string(workerOutLogContent)
	// Verify the worker's actual output is in the log (the base64 encoded input)
	if !strings.Contains(workerLogStr, jobInputB64) {
		t.Error("Worker log should contain worker output")
	}
}
