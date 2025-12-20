package runner

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/platform"
	"lombok-worker-agent/internal/state"
	"lombok-worker-agent/internal/types"
	"lombok-worker-agent/internal/upload"
)

// RunExecPerJob runs a job using the exec_per_job interface
// It spawns a new worker process for each job, passing the job_input as a base64-encoded
// final argument to the worker command.
//
// The worker should output its result as JSON on the last line of stdout.
// This will be captured and included in the agent's output.
func RunExecPerJob(payload *types.JobPayload, jobStartTime time.Time) error {
	// Ensure directories exist
	if err := config.EnsureAllDirs(); err != nil {
		return fmt.Errorf("failed to ensure directories: %w", err)
	}

	waitForCompletion := payload.WaitForCompletion != nil && *payload.WaitForCompletion

	var platformClient *platform.Client
	if payload.PlatformURL != "" && payload.JobToken != "" {
		platformClient = platform.NewClient(payload.PlatformURL, payload.JobToken)
	}

	// Create job output directory (worker can write files here)
	if err := config.EnsureJobOutputDir(payload.JobID); err != nil {
		return fmt.Errorf("failed to create job output directory: %w", err)
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

	// Set environment variables for the worker
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("JOB_OUTPUT_DIR=%s", config.JobOutputDir(payload.JobID)),
		fmt.Sprintf("JOB_ID=%s", payload.JobID),
	)

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
	if waitForCompletion {
		cmd.Stdout = io.MultiWriter(stdoutFile, &stdoutBuf)
	} else {
		cmd.Stdout = stdoutFile
	}
	cmd.Stderr = stderrFile

	// Track worker startup time
	workerStartTime := time.Now()

	if platformClient != nil {
		ctx := context.Background()
		if err := platformClient.SignalStart(ctx, payload.JobID); err != nil {
			logs.WriteAgentLog("warning: failed to signal start: %v", err)
		}
	}

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

	// Log worker startup time (should be very fast, but log it anyway)
	workerStartupDuration := time.Since(workerStartTime)
	logs.WriteAgentLog("job_id=%s worker_startup_time=%.3fs", payload.JobID, workerStartupDuration.Seconds())

	if !waitForCompletion {
		// In async mode, return as soon as the worker starts successfully.
		totalJobDuration := time.Since(jobStartTime)
		timing := map[string]interface{}{
			"total_time_seconds":          totalJobDuration.Seconds(),
			"worker_startup_time_seconds": workerStartupDuration.Seconds(),
		}

		result := map[string]interface{}{
			"success":    true,
			"job_id":     payload.JobID,
			"job_class":  payload.JobClass,
			"status":     "running",
			"timing":     timing,
			"worker_pid": cmd.Process.Pid,
		}

		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		return nil
	}

	// Track job execution time (from worker start to completion)
	jobExecutionStartTime := time.Now()

	// Wait for the process to complete
	err = cmd.Wait()
	completedAt := time.Now().UTC().Format(time.RFC3339)

	// Calculate job execution time
	jobExecutionDuration := time.Since(jobExecutionStartTime)
	totalJobDuration := time.Since(jobStartTime)

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
		logs.WriteAgentLog("warning: failed to write final job state: %v", err)
	}

	// Log timing information
	logs.WriteAgentLog("job_id=%s job_execution_time=%.3fs total_time=%.3fs",
		payload.JobID, jobExecutionDuration.Seconds(), totalJobDuration.Seconds())

	// Extract the worker's result from the last line of stdout if flag is set
	// Convention: worker outputs JSON result on the last non-empty line
	var workerResult interface{}
	var workerResultRaw json.RawMessage
	workerResult = extractLastLineJSON(stdoutBuf.String())
	if workerResult != nil {
		workerResultRaw, _ = json.Marshal(workerResult)
	}

	// Handle file uploads and platform completion if configured
	var outputFiles []types.OutputFileRef
	if platformClient != nil {
		// Check for output manifest and upload files
		manifest, err := upload.ReadManifest(payload.JobID)
		if err != nil {
			logs.WriteAgentLog("warning: failed to read manifest: %v", err)
		} else if manifest != nil && len(manifest.Files) > 0 {
			if payload.OutputLocation == nil {
				logs.WriteAgentLog("warning: output_location not provided; skipping uploads")
			} else {
				uploader := upload.NewUploader(platformClient)
				ctx := context.Background()

				uploaded, err := uploader.UploadFiles(ctx, payload.JobID, manifest, payload.OutputLocation)
				if err != nil {
					logs.WriteAgentLog("warning: failed to upload files: %v", err)
				} else {
					outputFiles = uploaded
				}
			}
		}

		// Signal completion to platform
		ctx := context.Background()
		completionReq := &types.CompletionRequest{
			Success:     exitCode == 0,
			Result:      workerResultRaw,
			OutputFiles: outputFiles,
		}
		if exitCode != 0 {
			completionReq.Error = &types.JobError{
				Code:    "WORKER_EXIT_ERROR",
				Message: fmt.Sprintf("worker exited with code %d", exitCode),
			}
		}

		if err := platformClient.SignalCompletion(ctx, payload.JobID, completionReq); err != nil {
			logs.WriteAgentLog("warning: failed to signal completion: %v", err)
		}
	}

	// Build timing information
	timing := map[string]interface{}{
		"job_execution_time_seconds":  jobExecutionDuration.Seconds(),
		"total_time_seconds":          totalJobDuration.Seconds(),
		"worker_startup_time_seconds": workerStartupDuration.Seconds(),
	}

	// Output result to stdout for the platform to capture
	result := map[string]interface{}{
		"success":   exitCode == 0,
		"exit_code": exitCode,
		"job_id":    payload.JobID,
		"job_class": payload.JobClass,
		"timing":    timing,
	}

	// Include the worker's result if we found valid JSON
	if workerResult != nil {
		result["result"] = workerResult
	}

	// Include uploaded files info
	if len(outputFiles) > 0 {
		result["output_files"] = outputFiles
	}

	if exitCode != 0 {
		result["error"] = map[string]interface{}{
			"code":    "WORKER_EXIT_ERROR",
			"message": fmt.Sprintf("worker exited with code %d", exitCode),
		}
	}

	resultJSON, _ := json.Marshal(result)
	fmt.Println(string(resultJSON))

	// Save result to file
	jobResult := &types.JobResult{
		Success:     exitCode == 0,
		JobID:       payload.JobID,
		JobClass:    payload.JobClass,
		Timing:      timing,
		OutputFiles: outputFiles,
	}
	jobResult.ExitCode = &exitCode
	if workerResult != nil {
		jobResult.Result = workerResult
	}
	if exitCode != 0 {
		jobResult.Error = &types.JobError{
			Code:    "WORKER_EXIT_ERROR",
			Message: fmt.Sprintf("worker exited with code %d", exitCode),
		}
	}
	if err := state.WriteJobResult(jobResult); err != nil {
		logs.WriteAgentLog("warning: failed to write job result: %v", err)
	}

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
