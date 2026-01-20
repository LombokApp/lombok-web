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

	// Create job output directory (worker can write files here)
	if err := config.EnsureJobOutputDir(payload.JobID); err != nil {
		return fmt.Errorf("failed to create job output directory: %w", err)
	}

	// Create initial job state
	jobState := &types.JobState{
		JobID:      payload.JobID,
		JobClass:   payload.JobClass,
		Status:     "pending",
		WorkerKind: "exec_per_job",
	}
	if err := state.WriteJobState(jobState); err != nil {
		return fmt.Errorf("failed to write initial job state: %w", err)
	}

	// Create job log files (for job-specific output that workers write explicitly)
	jobOutPath := config.JobOutLogPath(payload.JobID)
	jobErrPath := config.JobErrLogPath(payload.JobID)
	if err := touchFile(jobOutPath); err != nil {
		return fmt.Errorf("failed to create job stdout log: %w", err)
	}
	if err := touchFile(jobErrPath); err != nil {
		return fmt.Errorf("failed to create job stderr log: %w", err)
	}

	// In async mode, spawn background process and return immediately (same as persistent_http)
	if !waitForCompletion {
		return launchExecAsyncCompletion(payload, jobState, jobStartTime)
	}

	var platformClient *platform.Client
	if payload.PlatformURL != "" && payload.JobToken != "" {
		platformClient = platform.NewClient(payload.PlatformURL, payload.JobToken)
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
	resultFilePath := config.JobResultPath(payload.JobID)
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("JOB_OUTPUT_DIR=%s", config.JobOutputDir(payload.JobID)),
		fmt.Sprintf("JOB_ID=%s", payload.JobID),
		fmt.Sprintf("JOB_LOG_OUT=%s", jobOutPath),
		fmt.Sprintf("JOB_LOG_ERR=%s", jobErrPath),
		fmt.Sprintf("JOB_RESULT_FILE=%s", resultFilePath),
	)

	// Open worker log files for stdout and stderr (same as persistent_http)
	// Worker stdout/stderr goes here, not to job logs
	// This allows worker-logs to tail all worker output, regardless of interface type
	stdoutPath := config.WorkerOutLogPath(payload.WorkerCommand, payload.Interface)
	stderrPath := config.WorkerErrLogPath(payload.WorkerCommand, payload.Interface)

	stdoutFile, err := os.OpenFile(stdoutPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open worker stdout log: %w", err)
	}
	defer stdoutFile.Close()

	stderrFile, err := os.OpenFile(stderrPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open worker stderr log: %w", err)
	}
	defer stderrFile.Close()

	// Capture stdout to both file and buffer (for extracting result)
	var stdoutBuf bytes.Buffer
	cmd.Stdout = io.MultiWriter(stdoutFile, &stdoutBuf)
	cmd.Stderr = stderrFile

	// Create a worker state file so worker-log --job-class works for exec_per_job
	// This allows the agent to resolve the worker log identifier from job class
	// We create this BEFORE starting the command so it exists even if startup fails
	now := time.Now().UTC().Format(time.RFC3339)
	workerState := &types.WorkerState{
		JobClass:      payload.JobClass,
		Kind:          "exec_per_job",
		WorkerCommand: payload.WorkerCommand,
		PID:           0, // Will be updated if command starts successfully
		State:         "starting",
		Port:          payload.Interface.Port,
		StartedAt:     now,
		LastCheckedAt: now,
		AgentVersion:  config.AgentVersion,
	}
	if err := state.WriteWorkerState(workerState); err != nil {
		logs.WriteAgentLog("warning: failed to write worker state: %v", err)
	}

	// Track worker startup time
	workerStartTime := time.Now()

	// Start the worker process
	if err := cmd.Start(); err != nil {
		// Write error to worker log files so they're not empty
		fmt.Fprintf(stderrFile, "Failed to start worker: %s\n", err.Error())

		// Update worker state to reflect failure
		workerState.State = "stopped"
		workerState.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteWorkerState(workerState)

		completedAt := time.Now().UTC().Format(time.RFC3339)
		jobState.Status = "failed"
		jobState.Error = fmt.Sprintf("failed to start worker: %s", err.Error())
		jobState.CompletedAt = completedAt
		state.WriteJobState(jobState)

		// Calculate timing (worker never started, so execution time is 0)
		workerStartupDuration := time.Since(workerStartTime)
		totalJobDuration := time.Since(jobStartTime)
		timing := map[string]interface{}{
			"job_execution_time_seconds":  0.0,
			"total_time_seconds":          totalJobDuration.Seconds(),
			"worker_startup_time_seconds": workerStartupDuration.Seconds(),
		}

		// Signal completion to platform if available
		if platformClient != nil {
			ctx := context.Background()
			completionReq := &types.CompletionRequest{
				Success: false,
				Error: &types.JobError{
					Code:    "WORKER_START_ERROR",
					Message: fmt.Sprintf("failed to start worker: %s", err.Error()),
				},
			}
			if err := platformClient.SignalCompletion(ctx, payload.JobID, completionReq); err != nil {
				HandleCompletionSignalFailure(payload, jobState, err)
			}
		}

		// Output result to stdout
		result := map[string]interface{}{
			"success":   false,
			"exit_code": 1,
			"job_id":    payload.JobID,
			"job_class": payload.JobClass,
			"timing":    timing,
			"error": map[string]interface{}{
				"code":    "WORKER_START_ERROR",
				"message": fmt.Sprintf("failed to start worker: %s", err.Error()),
			},
		}

		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))

		// Save result to file (even though command failed to start)
		jobResult := &types.JobResult{
			Success:  false,
			JobID:    payload.JobID,
			JobClass: payload.JobClass,
			Timing:   timing,
			ExitCode: func() *int { v := 1; return &v }(),
			Error: &types.JobError{
				Code:    "WORKER_START_ERROR",
				Message: fmt.Sprintf("failed to start worker: %s", err.Error()),
			},
		}
		if err := state.WriteJobResult(jobResult); err != nil {
			logs.WriteAgentLog("warning: failed to write job result: %v", err)
		}

		os.Exit(1)
		return fmt.Errorf("failed to start worker: %w", err)
	}

	// Record the PID & updated state
	jobState.WorkerPID = cmd.Process.Pid
	jobState.Status = "running"
	jobState.StartedAt = time.Now().UTC().Format(time.RFC3339)
	state.WriteJobState(jobState)

	if platformClient != nil {
		ctx := context.Background()
		if err := platformClient.SignalStart(ctx, payload.JobID); err != nil {
			// Failed to signal start - this is a critical error
			// Kill the worker process and record job failure
			logs.WriteAgentLog("error: failed to signal start: %v", err)

			cancelErr := CancelJob(CancelJobConfig{
				Payload:         payload,
				JobState:        jobState,
				JobStartTime:    jobStartTime,
				WorkerStartTime: workerStartTime,
				PlatformClient:  platformClient,
				ExecCmd:         cmd,
			}, "PLATFORM_START_SIGNAL_ERROR", fmt.Sprintf("failed to signal start to platform: %v", err))

			os.Exit(1)
			return cancelErr
		}
	}

	// Update worker state with PID and running status
	workerState.PID = cmd.Process.Pid
	workerState.State = "running"
	workerState.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
	if err := state.WriteWorkerState(workerState); err != nil {
		logs.WriteAgentLog("warning: failed to update worker state: %v", err)
	}

	// Log worker startup time (should be very fast, but log it anyway)
	workerStartupDuration := time.Since(workerStartTime)
	logs.WriteAgentLog("job_id=%s worker_startup_time=%.3fs", payload.JobID, workerStartupDuration.Seconds())

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

	// Update worker state to reflect completion (for exec_per_job, worker is done)
	completedWorkerState, readErr := state.ReadWorkerState(payload.WorkerCommand, payload.Interface)
	if readErr == nil && completedWorkerState != nil && completedWorkerState.Kind == "exec_per_job" {
		completedWorkerState.State = "stopped"
		completedWorkerState.LastCheckedAt = completedAt
		if err := state.WriteWorkerState(completedWorkerState); err != nil {
			logs.WriteAgentLog("warning: failed to update worker state: %v", err)
		}
	}

	// Log timing information
	logs.WriteAgentLog("job_id=%s job_execution_time=%.3fs total_time=%.3fs",
		payload.JobID, jobExecutionDuration.Seconds(), totalJobDuration.Seconds())

	var workerResult interface{}
	var workerResultRaw json.RawMessage
	// Read worker result from result file written by worker to JOB_RESULT_FILE
	if resultData, err := os.ReadFile(resultFilePath); err == nil {
		var parsedResult interface{}
		if err := json.Unmarshal(resultData, &parsedResult); err == nil {
			workerResult = parsedResult
			workerResultRaw = resultData
		}
	}

	// Handle file uploads and platform completion if configured
	var outputFiles []types.OutputFileRef
	var completionSignalFailed bool
	var uploadFailed bool
	var uploadError error
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
					uploadFailed = true
					uploadError = err
					logs.WriteAgentLog("error: failed to upload files: %v", err)
				} else {
					outputFiles = uploaded
				}
			}
		}

		// Signal completion to platform
		ctx := context.Background()
		completionSuccess := exitCode == 0 && !uploadFailed
		completionReq := &types.CompletionRequest{
			Success:     completionSuccess,
			Result:      workerResultRaw,
			OutputFiles: outputFiles,
		}
		if exitCode != 0 {
			completionReq.Error = &types.JobError{
				Code:    "WORKER_EXIT_ERROR",
				Message: fmt.Sprintf("worker exited with code %d", exitCode),
			}
		} else if uploadFailed {
			completionReq.Error = &types.JobError{
				Code:    "FILE_UPLOAD_ERROR",
				Message: fmt.Sprintf("failed to upload output files: %v", uploadError),
			}
		}

		if err := platformClient.SignalCompletion(ctx, payload.JobID, completionReq); err != nil {
			HandleCompletionSignalFailure(payload, jobState, err)
			completionSignalFailed = true
		}
	}

	// Build timing information
	timing := map[string]interface{}{
		"job_execution_time_seconds":  jobExecutionDuration.Seconds(),
		"total_time_seconds":          totalJobDuration.Seconds(),
		"worker_startup_time_seconds": workerStartupDuration.Seconds(),
	}

	// Determine final success status (job fails if worker failed OR upload failed)
	finalSuccess := exitCode == 0 && !uploadFailed

	result := map[string]interface{}{
		"success":   finalSuccess,
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
	} else if uploadFailed {
		result["error"] = map[string]interface{}{
			"code":    "FILE_UPLOAD_ERROR",
			"message": fmt.Sprintf("failed to upload output files: %v", uploadError),
		}
	}

	resultJSON, _ := json.Marshal(result)
	fmt.Println(string(resultJSON))

	// Save result to file
	jobResult := &types.JobResult{
		Success:     finalSuccess,
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
	} else if uploadFailed {
		jobResult.Error = &types.JobError{
			Code:    "FILE_UPLOAD_ERROR",
			Message: fmt.Sprintf("failed to upload output files: %v", uploadError),
		}
	}
	if err := state.WriteJobResult(jobResult); err != nil {
		logs.WriteAgentLog("warning: failed to write job result: %v", err)
	}

	// Update job state after result is persisted so that a successful status
	// implies the result file is already available.
	jobState.CompletedAt = completedAt
	jobState.Meta = &types.JobMeta{ExitCode: exitCode}

	if finalSuccess {
		jobState.Status = "success"
	} else {
		jobState.Status = "failed"
		if exitCode != 0 {
			jobState.Error = fmt.Sprintf("worker exited with code %d", exitCode)
		} else if uploadFailed {
			jobState.Error = fmt.Sprintf("failed to upload output files: %v", uploadError)
		}
	}

	if err := state.WriteJobState(jobState); err != nil {
		logs.WriteAgentLog("warning: failed to write final job state: %v", err)
	}

	// Exit with the worker's exit code, or error code if upload/completion signal failed
	if completionSignalFailed || uploadFailed {
		os.Exit(1)
	}
	if exitCode != 0 {
		os.Exit(exitCode)
	}

	return nil
}

// launchExecAsyncCompletion spawns a background agent process to handle the job.
// Similar to launchAsyncDispatch for persistent_http.
func launchExecAsyncCompletion(payload *types.JobPayload, jobState *types.JobState, jobStartTime time.Time) error {
	originalWaitForCompletion := payload.WaitForCompletion
	waitForCompletion := true
	payload.WaitForCompletion = &waitForCompletion
	payloadJSON, err := json.Marshal(payload)
	payload.WaitForCompletion = originalWaitForCompletion

	if err != nil {
		return fmt.Errorf("failed to marshal payload for async completion: %w", err)
	}

	payloadB64 := base64.StdEncoding.EncodeToString(payloadJSON)

	cmd := exec.Command(os.Args[0], "run-job", "--payload-base64", payloadB64)

	logPath := config.AgentLogPath()
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open agent log for async completion: %w", err)
	}
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		logFile.Close()
		jobState.Status = "failed"
		jobState.Error = err.Error()
		jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteJobState(jobState)
		return fmt.Errorf("failed to start async completion process: %w", err)
	}
	logFile.Close()

	totalJobDuration := time.Since(jobStartTime)
	timing := map[string]interface{}{
		"total_time_seconds": totalJobDuration.Seconds(),
	}

	result := map[string]interface{}{
		"job_id":    payload.JobID,
		"job_class": payload.JobClass,
		"status":    "pending",
		"timing":    timing,
	}

	resultJSON, _ := json.Marshal(result)
	fmt.Println(string(resultJSON))

	logs.WriteAgentLog("job_id=%s scheduled async completion pid=%d", payload.JobID, cmd.Process.Pid)
	return nil
}
