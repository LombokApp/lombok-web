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

	// Verify worker output was written to the job log
	jobLogPath := config.JobLogPath(payload.JobID)
	jobLogContent, err := os.ReadFile(jobLogPath)
	if err != nil {
		t.Fatalf("Failed to read job log: %v", err)
	}

	jobLogStr := string(jobLogContent)
	// Verify the worker's actual output is in the log (the base64 encoded input)
	if !strings.Contains(jobLogStr, jobInputB64) {
		t.Error("Job log should contain worker output")
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

	// Verify worker output was written to the job log
	jobLogPath := config.JobLogPath(payload.JobID)
	jobLogContent, err := os.ReadFile(jobLogPath)
	if err != nil {
		t.Fatalf("Failed to read job log: %v", err)
	}

	jobLogStr := string(jobLogContent)
	// Verify the worker's actual output is in the log (the base64 encoded input)
	if !strings.Contains(jobLogStr, jobInputB64) {
		t.Error("Job log should contain worker output")
	}
}

func TestRunExecPerJob_EmptyWorkerCommand(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobInput := json.RawMessage(`{"test": "data"}`)

	payload := &types.JobPayload{
		JobID:         "test-job-empty-cmd",
		JobClass:      "test_class",
		WorkerCommand: []string{}, // Empty command
		Interface: types.InterfaceConfig{
			Kind: "exec_per_job",
		},
		JobInput: jobInput,
	}

	jobStartTime := time.Now()
	err := RunExecPerJob(payload, jobStartTime)
	if err == nil {
		t.Error("RunExecPerJob should fail with empty worker_command")
	}
	if !strings.Contains(err.Error(), "worker_command is empty") {
		t.Errorf("Expected error about empty worker_command, got: %v", err)
	}
}

func TestRunExecPerJob_WorkerExitNonZero(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobInput := json.RawMessage(`{"test": "data"}`)
	jobInputB64 := base64.StdEncoding.EncodeToString(jobInput)

	// Use a command that exits with non-zero code
	var cmd string
	if _, err := exec.LookPath("sh"); err == nil {
		cmd = "sh"
	} else if _, err := exec.LookPath("bash"); err == nil {
		cmd = "bash"
	} else {
		t.Skip("No shell available for test")
	}

	payload := &types.JobPayload{
		JobID:         "test-job-exit-1",
		JobClass:      "test_class",
		WorkerCommand: []string{cmd, "-c", "echo " + jobInputB64 + " && exit 42"},
		Interface: types.InterfaceConfig{
			Kind: "exec_per_job",
		},
		JobInput: jobInput,
	}

	jobStartTime := time.Now()
	_ = RunExecPerJob(payload, jobStartTime)
	// Note: RunExecPerJob calls os.Exit(exitCode) on non-zero exit, so this test
	// would need to be run in a subprocess to properly test. For now, we verify
	// the job state and result files are created correctly.

	// Verify job state shows failure
	jobStatePath := config.JobStatePath(payload.JobID)
	jobStateContent, err := os.ReadFile(jobStatePath)
	if err != nil {
		t.Fatalf("Failed to read job state: %v", err)
	}

	var jobState types.JobState
	if err := json.Unmarshal(jobStateContent, &jobState); err != nil {
		t.Fatalf("Failed to parse job state: %v", err)
	}

	if jobState.Status != "failed" {
		t.Errorf("Expected job status 'failed', got '%s'", jobState.Status)
	}
	if jobState.Error == "" {
		t.Error("Job state should contain error message")
	}
	if jobState.CompletedAt == "" {
		t.Error("Job state should have CompletedAt set")
	}
}

func TestRunExecPerJob_AsyncMode(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobInput := json.RawMessage(`{"test": "async"}`)
	jobInputB64 := base64.StdEncoding.EncodeToString(jobInput)

	waitForCompletion := false
	payload := &types.JobPayload{
		JobID:             "test-job-async",
		JobClass:          "test_class",
		WorkerCommand:     []string{"echo", jobInputB64},
		WaitForCompletion: &waitForCompletion,
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

	// In async mode, job should still be running
	jobStatePath := config.JobStatePath(payload.JobID)
	jobStateContent, err := os.ReadFile(jobStatePath)
	if err != nil {
		t.Fatalf("Failed to read job state: %v", err)
	}

	var jobState types.JobState
	if err := json.Unmarshal(jobStateContent, &jobState); err != nil {
		t.Fatalf("Failed to parse job state: %v", err)
	}

	// Job should be running (not completed yet in async mode)
	if jobState.Status != "running" {
		t.Errorf("Expected job status 'running' in async mode, got '%s'", jobState.Status)
	}
	if jobState.WorkerPID == 0 {
		t.Error("Job state should have WorkerPID set")
	}

}

func TestRunExecPerJob_EnvironmentVariables(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobInput := json.RawMessage(`{"test": "env"}`)

	var cmd string
	if _, err := exec.LookPath("sh"); err == nil {
		cmd = "sh"
	} else if _, err := exec.LookPath("bash"); err == nil {
		cmd = "bash"
	} else {
		t.Skip("No shell available for test")
	}

	payload := &types.JobPayload{
		JobID:         "test-job-env",
		JobClass:      "test_class",
		WorkerCommand: []string{cmd, "-c", "echo $JOB_ID:$JOB_CLASS:$JOB_OUTPUT_DIR"},
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

	// Verify environment variables were passed to worker
	jobLogPath := config.JobLogPath(payload.JobID)
	jobLogContent, err := os.ReadFile(jobLogPath)
	if err != nil {
		t.Fatalf("Failed to read job log: %v", err)
	}

	jobLogStr := string(jobLogContent)
	expectedOutput := payload.JobID + ":" + payload.JobClass + ":"
	if !strings.Contains(jobLogStr, expectedOutput) {
		t.Errorf("Worker output should contain environment variables, got: %s", jobLogStr)
	}
}

func TestRunExecPerJob_JobResultFile(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobInput := json.RawMessage(`{"test": "result"}`)
	jobInputB64 := base64.StdEncoding.EncodeToString(jobInput)

	var cmd string
	if _, err := exec.LookPath("sh"); err == nil {
		cmd = "sh"
	} else if _, err := exec.LookPath("bash"); err == nil {
		cmd = "bash"
	} else {
		t.Skip("No shell available for test")
	}

	payload := &types.JobPayload{
		JobID:         "test-job-result",
		JobClass:      "test_class",
		WorkerCommand: []string{cmd, "-c", "echo 'some output' && echo " + jobInputB64},
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

	// Verify job result file exists and contains basic job information
	jobResultPath := config.JobResultPath(payload.JobID)
	jobResultContent, err := os.ReadFile(jobResultPath)
	if err != nil {
		t.Fatalf("Failed to read job result: %v", err)
	}

	var jobResult types.JobResult
	if err := json.Unmarshal(jobResultContent, &jobResult); err != nil {
		t.Fatalf("Failed to parse job result: %v", err)
	}

	// Verify basic result file structure
	if jobResult.JobID != payload.JobID {
		t.Errorf("Job result JobID mismatch: expected %s, got %s", payload.JobID, jobResult.JobID)
	}
	if !jobResult.Success {
		t.Error("Job result should indicate success")
	}
	if jobResult.Timing == nil {
		t.Error("Job result should contain timing information")
	}
	// Note: Result field may be nil since we're no longer extracting from stdout
}

func TestRunExecPerJob_JobStateAndResultFiles(t *testing.T) {
	// Skip if running in CI or without proper permissions
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	// Initialize agent log
	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobInput := json.RawMessage(`{"test": "files"}`)
	jobInputB64 := base64.StdEncoding.EncodeToString(jobInput)

	payload := &types.JobPayload{
		JobID:         "test-job-files",
		JobClass:      "test_class",
		WorkerCommand: []string{"echo", jobInputB64},
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

	// Verify job state file exists and is valid
	jobStatePath := config.JobStatePath(payload.JobID)
	jobStateContent, err := os.ReadFile(jobStatePath)
	if err != nil {
		t.Fatalf("Failed to read job state: %v", err)
	}

	var jobState types.JobState
	if err := json.Unmarshal(jobStateContent, &jobState); err != nil {
		t.Fatalf("Failed to parse job state: %v", err)
	}

	if jobState.JobID != payload.JobID {
		t.Errorf("Job state JobID mismatch: expected %s, got %s", payload.JobID, jobState.JobID)
	}
	if jobState.JobClass != payload.JobClass {
		t.Errorf("Job state JobClass mismatch: expected %s, got %s", payload.JobClass, jobState.JobClass)
	}
	if jobState.Status != "success" {
		t.Errorf("Expected job status 'success', got '%s'", jobState.Status)
	}
	if jobState.CompletedAt == "" {
		t.Error("Job state should have CompletedAt set")
	}

	// Verify job result file exists and is valid
	jobResultPath := config.JobResultPath(payload.JobID)
	jobResultContent, err := os.ReadFile(jobResultPath)
	if err != nil {
		t.Fatalf("Failed to read job result: %v", err)
	}

	var jobResult types.JobResult
	if err := json.Unmarshal(jobResultContent, &jobResult); err != nil {
		t.Fatalf("Failed to parse job result: %v", err)
	}

	if jobResult.JobID != payload.JobID {
		t.Errorf("Job result JobID mismatch: expected %s, got %s", payload.JobID, jobResult.JobID)
	}
	if !jobResult.Success {
		t.Error("Job result should indicate success")
	}
	if jobResult.Timing == nil {
		t.Error("Job result should contain timing information")
	}

	// Verify job log file was created
	jobLogPath := config.JobLogPath(payload.JobID)
	if _, err := os.Stat(jobLogPath); err != nil {
		t.Errorf("Job log file should exist: %v", err)
	}
}
