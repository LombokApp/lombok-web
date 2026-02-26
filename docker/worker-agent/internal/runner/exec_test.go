package runner

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"os/exec"
	"strings"
	"sync"
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

func TestJobLogInterceptor_PlatformUpdateMagicLine(t *testing.T) {
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

	// Track updates received by the callback
	var receivedUpdates []json.RawMessage
	var mu sync.Mutex

	// Create a job log file
	jobLogPath := config.JobLogPath("test-job-magic-line")
	jobLogFile, err := os.OpenFile(jobLogPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		t.Fatalf("Failed to create job log file: %v", err)
	}
	defer jobLogFile.Close()

	interceptor := newJobLogInterceptor("test-job-magic-line", jobLogFile, logs.LogLevelInfo)
	interceptor.onPlatformUpdate = func(update json.RawMessage) {
		mu.Lock()
		defer mu.Unlock()
		receivedUpdates = append(receivedUpdates, update)
	}

	// Write lines to the interceptor: normal line, magic line, normal line
	updateJSON := `{"progress":{"percent":50},"message":{"level":"info","text":"halfway","audience":"user"}}`
	lines := "before magic line\n" +
		"__PLATFORM_UPDATE__|" + updateJSON + "\n" +
		"after magic line\n"

	_, err = interceptor.Write([]byte(lines))
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Wait for the async goroutine to complete
	interceptor.updateWg.Wait()

	// Verify the callback was invoked with correct JSON
	mu.Lock()
	defer mu.Unlock()
	if len(receivedUpdates) != 1 {
		t.Fatalf("Expected 1 update, got %d", len(receivedUpdates))
	}
	if string(receivedUpdates[0]) != updateJSON {
		t.Errorf("Expected update JSON %q, got %q", updateJSON, string(receivedUpdates[0]))
	}

	// Close the log file so we can read it
	jobLogFile.Close()

	// Verify the magic line does NOT appear in the job log
	jobLogContent, err := os.ReadFile(jobLogPath)
	if err != nil {
		t.Fatalf("Failed to read job log: %v", err)
	}
	jobLogStr := string(jobLogContent)

	if strings.Contains(jobLogStr, "__PLATFORM_UPDATE__") {
		t.Error("Magic line should NOT appear in job log")
	}
	if strings.Contains(jobLogStr, updateJSON) {
		t.Error("Update JSON should NOT appear in job log")
	}

	// Verify normal log lines around it ARE logged
	if !strings.Contains(jobLogStr, "before magic line") {
		t.Error("Normal line before magic line should be in job log")
	}
	if !strings.Contains(jobLogStr, "after magic line") {
		t.Error("Normal line after magic line should be in job log")
	}
}

func TestJobLogInterceptor_InvalidPlatformUpdateJSON(t *testing.T) {
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobLogPath := config.JobLogPath("test-job-invalid-update")
	jobLogFile, err := os.OpenFile(jobLogPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		t.Fatalf("Failed to create job log file: %v", err)
	}
	defer jobLogFile.Close()

	var receivedUpdates []json.RawMessage
	var mu sync.Mutex

	interceptor := newJobLogInterceptor("test-job-invalid-update", jobLogFile, logs.LogLevelInfo)
	interceptor.onPlatformUpdate = func(update json.RawMessage) {
		mu.Lock()
		defer mu.Unlock()
		receivedUpdates = append(receivedUpdates, update)
	}

	// Write an invalid JSON magic line
	_, err = interceptor.Write([]byte("__PLATFORM_UPDATE__|not valid json\n"))
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	interceptor.updateWg.Wait()

	// Callback should NOT have been invoked
	mu.Lock()
	defer mu.Unlock()
	if len(receivedUpdates) != 0 {
		t.Errorf("Expected 0 updates for invalid JSON, got %d", len(receivedUpdates))
	}

	// Invalid magic line should also not appear in the job log
	jobLogFile.Close()
	jobLogContent, err := os.ReadFile(jobLogPath)
	if err != nil {
		t.Fatalf("Failed to read job log: %v", err)
	}
	if strings.Contains(string(jobLogContent), "__PLATFORM_UPDATE__") {
		t.Error("Invalid magic line should NOT appear in job log")
	}
}

func TestJobLogInterceptor_NoCallbackSetIgnoresMagicLine(t *testing.T) {
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobLogPath := config.JobLogPath("test-job-no-callback")
	jobLogFile, err := os.OpenFile(jobLogPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		t.Fatalf("Failed to create job log file: %v", err)
	}
	defer jobLogFile.Close()

	// No onPlatformUpdate callback set (simulates no platform client)
	interceptor := newJobLogInterceptor("test-job-no-callback", jobLogFile, logs.LogLevelInfo)

	// Magic line should be treated as a normal log line when no callback is set
	_, err = interceptor.Write([]byte(`__PLATFORM_UPDATE__|{"progress":{"percent":50}}` + "\n"))
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	jobLogFile.Close()
	jobLogContent, err := os.ReadFile(jobLogPath)
	if err != nil {
		t.Fatalf("Failed to read job log: %v", err)
	}

	// When no callback is set, the magic line falls through to normal logging
	if !strings.Contains(string(jobLogContent), "__PLATFORM_UPDATE__") {
		t.Error("Without callback, magic line should be logged as normal output")
	}
}

func TestRunExecPerJob_PlatformUpdateIntegration(t *testing.T) {
	if os.Getuid() != 0 {
		if err := config.EnsureAllDirs(); err != nil {
			t.Skipf("Skipping test - cannot create directories: %v", err)
		}
	}

	if err := logs.InitAgentLog(); err != nil {
		t.Fatalf("Failed to initialize agent log: %v", err)
	}
	defer logs.CloseAgentLog()

	jobInput := json.RawMessage(`{"test": "update-integration"}`)
	jobInputB64 := base64.StdEncoding.EncodeToString(jobInput)

	var cmd string
	if _, err := exec.LookPath("sh"); err == nil {
		cmd = "sh"
	} else if _, err := exec.LookPath("bash"); err == nil {
		cmd = "bash"
	} else {
		t.Skip("No shell available for test")
	}

	// Worker prints a normal line, a magic update line, and another normal line
	workerScript := `echo "starting work"
echo '__PLATFORM_UPDATE__|{"progress":{"percent":50}}'
echo "finishing work"
echo ` + jobInputB64

	payload := &types.JobPayload{
		JobID:         "test-job-update-integration",
		JobClass:      "test_class",
		WorkerCommand: []string{cmd, "-c", workerScript},
		Interface: types.InterfaceConfig{
			Kind: "exec_per_job",
		},
		JobInput: jobInput,
		// No PlatformURL/JobToken — so no platformClient, magic lines logged normally
	}

	jobStartTime := time.Now()
	err := RunExecPerJob(payload, jobStartTime)
	if err != nil {
		t.Fatalf("RunExecPerJob failed: %v", err)
	}

	// Without a platform client, magic lines should be logged as normal output
	jobLogPath := config.JobLogPath(payload.JobID)
	jobLogContent, err := os.ReadFile(jobLogPath)
	if err != nil {
		t.Fatalf("Failed to read job log: %v", err)
	}
	jobLogStr := string(jobLogContent)

	if !strings.Contains(jobLogStr, "starting work") {
		t.Error("Job log should contain 'starting work'")
	}
	if !strings.Contains(jobLogStr, "finishing work") {
		t.Error("Job log should contain 'finishing work'")
	}
	// Without platform client, magic line is logged as normal output
	if !strings.Contains(jobLogStr, "__PLATFORM_UPDATE__") {
		t.Error("Without platform client, magic line should appear in log")
	}
}
