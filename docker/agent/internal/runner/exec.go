package runner

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"time"

	"platform-agent/internal/config"
	"platform-agent/internal/state"
	"platform-agent/internal/types"
)

// RunExecPerJob runs a job using the exec_per_job interface
// It spawns a new worker process for each job, passing the job_input as a base64-encoded
// final argument to the worker command.
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

	cmd.Stdout = stdoutFile
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
		fmt.Fprintf(os.Stderr, "[platform-agent] warning: failed to write final job state: %v\n", err)
	}

	// Output result to stdout for the platform to capture
	result := map[string]interface{}{
		"success":   exitCode == 0,
		"exit_code": exitCode,
		"job_id":    payload.JobID,
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
