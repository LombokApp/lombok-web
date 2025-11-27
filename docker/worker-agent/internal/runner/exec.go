package runner

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/state"
	"lombok-worker-agent/internal/types"
)

// RunExecPerJob runs a job using the exec_per_job interface
// It spawns a new worker process for each job, passing the job_input as a base64-encoded
// final argument to the worker command.
//
// The worker should output its result as JSON on the last line of stdout.
// This will be captured and included in the agent's output.
func RunExecPerJob(payload *types.JobPayload) error {
	// Ensure directories exist
	if err := config.EnsureAllDirs(); err != nil {
		return fmt.Errorf("failed to ensure directories: %w", err)
	}

	// Create initial job state
	now := time.Now().UTC().Format(time.RFC3339)
	jobState := &types.JobState{
		JobID:      payload.JobID,
		JobClass:   payload.JobClass,
		Status:     "running",
		StartedAt:  now,
		WorkerKind: "exec_per_job",
	}
	if err := state.WriteJobState(jobState); err != nil {
		return fmt.Errorf("failed to write initial job state: %w", err)
	}

	// Encode job_input as base64 for the worker
	jobInputB64 := base64.StdEncoding.EncodeToString(payload.JobInput)

	// Build the command: worker_command + [JOB_PAYLOAD_B64]
	args := make([]string, 0, len(payload.WorkerCommand))
	if len(payload.WorkerCommand) > 1 {
		args = append(args, payload.WorkerCommand[1:]...)
	}
	args = append(args, jobInputB64)

	var cmd *exec.Cmd
	if len(payload.WorkerCommand) > 0 {
		cmd = exec.Command(payload.WorkerCommand[0], args...)
	} else {
		return fmt.Errorf("worker_command is empty")
	}

	// Open log files for stdout and stderr
	stdoutPath := config.JobOutLogPath(payload.JobID)
	stderrPath := config.JobErrLogPath(payload.JobID)

	stdoutFile, err := os.Create(stdoutPath)
	if err != nil {
		return fmt.Errorf("failed to create stdout log: %w", err)
	}
	defer stdoutFile.Close()

	stderrFile, err := os.Create(stderrPath)
	if err != nil {
		return fmt.Errorf("failed to create stderr log: %w", err)
	}
	defer stderrFile.Close()

	// Capture stdout to both file and buffer (for extracting result)
	var stdoutBuf bytes.Buffer
	cmd.Stdout = io.MultiWriter(stdoutFile, &stdoutBuf)
	cmd.Stderr = stderrFile

	// Start the worker process
	if err := cmd.Start(); err != nil {
		jobState.Status = "failed"
		jobState.Error = fmt.Sprintf("failed to start worker: %s", err.Error())
		jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteJobState(jobState)
		return fmt.Errorf("failed to start worker: %w", err)
	}

	// Record the PID
	jobState.WorkerPID = cmd.Process.Pid
	state.WriteJobState(jobState)

	// Wait for the process to complete
	err = cmd.Wait()
	completedAt := time.Now().UTC().Format(time.RFC3339)

	// Determine exit code
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	// Update job state
	jobState.CompletedAt = completedAt
	jobState.Meta = &types.JobMeta{ExitCode: exitCode}

	if exitCode == 0 {
		jobState.Status = "success"
	} else {
		jobState.Status = "failed"
		jobState.Error = fmt.Sprintf("worker exited with code %d", exitCode)
	}

	if err := state.WriteJobState(jobState); err != nil {
		fmt.Fprintf(os.Stderr, "[lombok-worker-agent] warning: failed to write final job state: %v\n", err)
	}

	// Extract the worker's result from the last line of stdout
	// Convention: worker outputs JSON result on the last non-empty line
	workerResult := extractLastLineJSON(stdoutBuf.String())

	// Output result to stdout for the platform to capture
	result := map[string]interface{}{
		"success":   exitCode == 0,
		"exit_code": exitCode,
		"job_id":    payload.JobID,
		"job_class": payload.JobClass,
	}

	// Include the worker's result if we found valid JSON
	if workerResult != nil {
		result["result"] = workerResult
	}

	if exitCode != 0 {
		result["error"] = map[string]interface{}{
			"code":    "WORKER_EXIT_ERROR",
			"message": fmt.Sprintf("worker exited with code %d", exitCode),
		}
	}

	resultJSON, _ := json.Marshal(result)
	fmt.Println(string(resultJSON))

	// Exit with the worker's exit code
	if exitCode != 0 {
		os.Exit(exitCode)
	}

	return nil
}

// extractLastLineJSON finds the last non-empty line in the output
// and attempts to parse it as JSON. Returns nil if not valid JSON.
func extractLastLineJSON(output string) interface{} {
	lines := strings.Split(output, "\n")

	// Find the last non-empty line
	var lastLine string
	for i := len(lines) - 1; i >= 0; i-- {
		line := strings.TrimSpace(lines[i])
		if line != "" {
			lastLine = line
			break
		}
	}

	if lastLine == "" {
		return nil
	}

	// Try to parse as JSON
	var parsed interface{}
	if err := json.Unmarshal([]byte(lastLine), &parsed); err != nil {
		return nil
	}

	return parsed
}
