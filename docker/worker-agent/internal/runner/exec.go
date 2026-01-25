package runner

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
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
// The worker should write its result as JSON to the file specified by the JOB_RESULT_FILE
// environment variable. This will be read and included in the agent's output.
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

	// Create job log file (structured log for job output)
	jobLogPath := config.JobLogPath(payload.JobID)
	jobLogFile, err := os.OpenFile(jobLogPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return fmt.Errorf("failed to create job log file: %w", err)
	}
	defer jobLogFile.Close()

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
		fmt.Sprintf("JOB_RESULT_FILE=%s", resultFilePath),
	)

	// Create line-intercepting writers for stdout and stderr
	// These parse structured log lines and write to the job log
	stdoutInterceptor := newJobLogInterceptor(payload.JobID, jobLogFile, logs.LogLevelInfo)
	stderrInterceptor := newJobLogInterceptor(payload.JobID, jobLogFile, logs.LogLevelError)

	// Capture stdout to interceptor for logging
	cmd.Stdout = stdoutInterceptor
	cmd.Stderr = stderrInterceptor

	// Track worker startup time
	workerStartTime := time.Now()

	// Start the worker process
	if err := cmd.Start(); err != nil {
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
			logs.WriteAgentLog(logs.LogLevelWarn, "Failed to write job result", map[string]any{
				"error": err.Error(),
			})
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
			logs.WriteAgentLog(logs.LogLevelError, "Failed to signal start", map[string]any{
				"error": err.Error(),
			})

			cancelErr := CancelJob(CancelJobConfig{
				Payload:         payload,
				JobState:        jobState,
				JobStartTime:    jobStartTime,
				WorkerStartTime: workerStartTime,
				ExecCmd:         cmd,
			}, "PLATFORM_START_SIGNAL_ERROR", fmt.Sprintf("failed to signal start to platform: %v", err))

			os.Exit(1)
			return cancelErr
		}
	}

	// Log worker startup time (should be very fast, but log it anyway)
	workerStartupDuration := time.Since(workerStartTime)
	logs.WriteAgentLog(logs.LogLevelInfo, "Worker startup completed", map[string]any{
		"job_id":              payload.JobID,
		"worker_startup_time": workerStartupDuration.Seconds(),
	})

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

	// Log timing information
	logs.WriteAgentLog(logs.LogLevelInfo, "Job execution completed", map[string]any{
		"job_id":             payload.JobID,
		"job_execution_time": jobExecutionDuration.Seconds(),
		"total_time":         totalJobDuration.Seconds(),
	})

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
			logs.WriteAgentLog(logs.LogLevelWarn, "Failed to read manifest", map[string]any{
				"error": err.Error(),
			})
		} else if manifest != nil && len(manifest.Files) > 0 {
			if payload.OutputLocation == nil {
				logs.WriteAgentLog(logs.LogLevelWarn, "Output location not provided; skipping uploads", nil)
			} else {
				uploader := upload.NewUploader(platformClient)
				ctx := context.Background()

				uploaded, err := uploader.UploadFiles(ctx, payload.JobID, manifest, payload.OutputLocation)
				if err != nil {
					uploadFailed = true
					uploadError = err
					logs.WriteAgentLog(logs.LogLevelError, "Failed to upload files", map[string]any{
						"error": err.Error(),
					})
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
		logs.WriteAgentLog(logs.LogLevelWarn, "Failed to write job result", map[string]any{
			"error": err.Error(),
		})
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
		logs.WriteAgentLog(logs.LogLevelWarn, "Failed to write final job state", map[string]any{
			"error": err.Error(),
		})
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

	logs.WriteAgentLog(logs.LogLevelInfo, "Scheduled async completion", map[string]any{
		"job_id": payload.JobID,
		"pid":    cmd.Process.Pid,
	})
	return nil
}

// jobLogInterceptor intercepts output lines, parses structured logs, and writes to job logs.
type jobLogInterceptor struct {
	jobID        string
	jobLogFile   *os.File
	defaultLevel logs.LogLevel
	buffer       []byte
	mu           sync.Mutex
}

func newJobLogInterceptor(jobID string, jobLogFile *os.File, defaultLevel logs.LogLevel) *jobLogInterceptor {
	return &jobLogInterceptor{
		jobID:        jobID,
		jobLogFile:   jobLogFile,
		defaultLevel: defaultLevel,
		buffer:       make([]byte, 0, 4096),
	}
}

func (w *jobLogInterceptor) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	// Append to buffer
	w.buffer = append(w.buffer, p...)

	// Process complete lines
	for {
		newlineIdx := bytes.IndexByte(w.buffer, '\n')
		if newlineIdx == -1 {
			// No complete line yet
			break
		}

		// Extract line (including newline)
		line := w.buffer[:newlineIdx+1]
		w.buffer = w.buffer[newlineIdx+1:]

		// Process the line
		w.processLine(strings.TrimSuffix(string(line), "\n"))
	}

	return len(p), nil
}

func (w *jobLogInterceptor) processLine(line string) {
	// Try to parse as structured log
	level, message, data, ok := logs.ParseStructuredWorkerLogLine(line)
	if ok {
		// Successfully parsed as structured log - write to job log with parsed level
		_ = logs.WriteJobLog(w.jobLogFile, w.jobID, level, message, data)
	} else {
		// Not structured - write as default level with entire line as message
		_ = logs.WriteJobLog(w.jobLogFile, w.jobID, w.defaultLevel, line, nil)
	}
}
