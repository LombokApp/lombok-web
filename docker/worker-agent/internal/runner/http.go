package runner

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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

const (
	// Readiness polling settings
	readinessTimeout  = 180 * time.Second
	readinessPollWait = 500 * time.Millisecond

	// Job submission timeout (short - just for the POST)
	jobSubmitTimeout = 10 * time.Second

	// Job status polling settings
	jobPollInterval  = 1 * time.Second
	jobPollTimeout   = 30 * time.Minute // Max time to wait for a job to complete
	jobStatusTimeout = 5 * time.Second  // Timeout for each status poll request
)

// RunPersistentHTTP runs a job using the persistent_http interface
// It ensures a persistent worker is running, submits the job, then polls for completion.
func RunPersistentHTTP(payload *types.JobPayload, jobStartTime time.Time) error {

	port := payload.Interface.Port
	if port == nil {
		return fmt.Errorf("port is required")
	}

	// Ensure directories exist
	if err := config.EnsureAllDirs(); err != nil {
		return fmt.Errorf("failed to ensure directories: %w", err)
	}

	waitForCompletion := payload.WaitForCompletion != nil && *payload.WaitForCompletion

	// Prepare log/output locations up front so the worker can write immediately.
	httpReq, err := prepareHTTPJobRequest(payload)
	if err != nil {
		return err
	}

	// Create initial job state
	jobState := &types.JobState{
		JobID:      payload.JobID,
		JobClass:   payload.JobClass,
		Status:     "pending",
		WorkerKind: "persistent_http",
	}
	if err := state.WriteJobState(jobState); err != nil {
		return fmt.Errorf("failed to write initial job state: %w", err)
	}

	// Fast path: fire-and-forget when caller does not need completion.
	if !waitForCompletion {
		return startAsyncDispatch(payload, jobState, jobStartTime)
	}

	var platformClient *platform.Client
	if payload.PlatformURL != "" && payload.JobToken != "" {
		platformClient = platform.NewClient(payload.PlatformURL, payload.JobToken)
	}

	// Track worker startup time
	workerStartupStartTime := time.Now()

	// Ensure worker is running and ready
	workerState, workerStartupDuration, err := ensureWorkerReady(payload)
	if err != nil {
		jobState.Status = "failed"
		jobState.Error = err.Error()
		state.WriteJobState(jobState)

		// Calculate timing even on error
		workerStartupDurationActual := time.Since(workerStartupStartTime)
		totalJobDuration := time.Since(jobStartTime)

		// Signal completion to platform if available
		if platformClient != nil {
			ctx := context.Background()
			completionReq := &types.CompletionRequest{
				Success: false,
				Error: &types.JobError{
					Code:    "WORKER_NOT_READY",
					Message: err.Error(),
				},
			}
			if err := platformClient.SignalCompletion(ctx, payload.JobID, completionReq); err != nil {
				HandleCompletionSignalFailure(payload, jobState, err)
			}
		}

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "WORKER_NOT_READY",
				"message": err.Error(),
			},
			"timing": map[string]interface{}{
				"total_time_seconds":          totalJobDuration.Seconds(),
				"worker_startup_time_seconds": workerStartupDurationActual.Seconds(),
			},
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		return err
	}

	jobState.WorkerStatePID = workerState.PID
	state.WriteJobState(jobState)

	// Log worker startup time
	workerStartupDurationActual := time.Since(workerStartupStartTime)
	logs.WriteAgentLog("job_id=%s worker_startup_time=%.3fs (to_ready=%.3fs)",
		payload.JobID, workerStartupDurationActual.Seconds(), workerStartupDuration.Seconds())

	// Build the HTTP client for job submission (short timeout)
	client := &http.Client{Timeout: jobSubmitTimeout}

	reqBody, err := json.Marshal(httpReq)
	if err != nil {
		return fmt.Errorf("failed to marshal job request: %w", err)
	}

	// Build the endpoint URL
	baseURL := buildBaseURL(*payload.Interface.Port)

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
				WorkerStartTime: workerStartupStartTime,
				PlatformClient:  platformClient,
				WorkerPID:       workerState.PID,
			}, "PLATFORM_START_SIGNAL_ERROR", fmt.Sprintf("failed to signal start to platform: %v", err))

			os.Exit(1)
			return cancelErr
		}
	}

	// Step 1: Submit the job
	submitURL := baseURL + "/job"
	ctx, cancel := context.WithTimeout(context.Background(), jobSubmitTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", submitURL, bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Track job execution time (from job submission to completion)
	// Set this right before submitting the job, after worker is ready
	jobExecutionStartTime := time.Now()

	resp, err := client.Do(req)
	if err != nil {
		jobState.Status = "failed"
		jobState.Error = fmt.Sprintf("job submission failed: %s", err.Error())
		state.WriteJobState(jobState)

		// Calculate timing even on error
		workerStartupDurationActual := time.Since(workerStartupStartTime)
		totalJobDuration := time.Since(jobStartTime)

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "JOB_SUBMIT_FAILED",
				"message": err.Error(),
			},
			"timing": map[string]interface{}{
				"total_time_seconds":          totalJobDuration.Seconds(),
				"worker_startup_time_seconds": workerStartupDurationActual.Seconds(),
			},
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		return err
	}
	defer resp.Body.Close()

	// Read and parse submission response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read submission response: %w", err)
	}

	var submitResp types.HTTPJobSubmitResponse
	if err := json.Unmarshal(respBody, &submitResp); err != nil {
		return fmt.Errorf("failed to parse submission response: %w (body: %s)", err, string(respBody))
	}

	if !submitResp.Accepted {
		errMsg := "job not accepted"
		if submitResp.Error != nil {
			errMsg = submitResp.Error.Message
		}
		jobState.Status = "failed"
		jobState.Error = errMsg
		state.WriteJobState(jobState)

		// Calculate timing even on error
		workerStartupDurationActual := time.Since(workerStartupStartTime)
		totalJobDuration := time.Since(jobStartTime)

		// Signal completion to platform if available
		if platformClient != nil {
			ctx := context.Background()
			completionReq := &types.CompletionRequest{
				Success: false,
				Error: &types.JobError{
					Code:    "JOB_NOT_ACCEPTED",
					Message: errMsg,
				},
			}
			if err := platformClient.SignalCompletion(ctx, payload.JobID, completionReq); err != nil {
				HandleCompletionSignalFailure(payload, jobState, err)
			}
		}

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "JOB_NOT_ACCEPTED",
				"message": errMsg,
			},
			"timing": map[string]interface{}{
				"total_time_seconds":          totalJobDuration.Seconds(),
				"worker_startup_time_seconds": workerStartupDurationActual.Seconds(),
			},
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		return fmt.Errorf("job not accepted: %s", errMsg)
	}

	// Job submitted successfully, update state to running
	jobState.Status = "running"
	jobState.StartedAt = time.Now().UTC().Format(time.RFC3339)
	state.WriteJobState(jobState)

	// Step 2: Poll for job completion
	statusURL := fmt.Sprintf("%s/job/%s", baseURL, payload.JobID)
	pollClient := &http.Client{Timeout: jobStatusTimeout}

	deadline := time.Now().Add(jobPollTimeout)
	var finalStatus *types.HTTPJobStatusResponse

	for time.Now().Before(deadline) {
		status, err := pollJobStatus(pollClient, statusURL)
		if err != nil {
			// Log the error but keep polling
			logs.WriteAgentLog("poll error: %v", err)
			time.Sleep(jobPollInterval)
			continue
		}

		// Check if job is complete
		if status.Status == "success" || status.Status == "failed" {
			finalStatus = status
			break
		}

		time.Sleep(jobPollInterval)
	}

	// Handle timeout
	if finalStatus == nil {
		jobState.Status = "failed"
		jobState.Error = fmt.Sprintf("job polling timed out after %s", jobPollTimeout)
		jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteJobState(jobState)

		// Calculate timing even on timeout
		jobExecutionDuration := time.Since(jobExecutionStartTime)
		workerStartupDurationActual := time.Since(workerStartupStartTime)
		totalJobDuration := time.Since(jobStartTime)

		// Signal completion to platform if available
		if platformClient != nil {
			ctx := context.Background()
			completionReq := &types.CompletionRequest{
				Success: false,
				Error: &types.JobError{
					Code:    "JOB_POLL_TIMEOUT",
					Message: jobState.Error,
				},
			}
			if err := platformClient.SignalCompletion(ctx, payload.JobID, completionReq); err != nil {
				HandleCompletionSignalFailure(payload, jobState, err)
			}
		}

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "JOB_POLL_TIMEOUT",
				"message": jobState.Error,
			},
			"timing": map[string]interface{}{
				"job_execution_time_seconds":  jobExecutionDuration.Seconds(),
				"total_time_seconds":          totalJobDuration.Seconds(),
				"worker_startup_time_seconds": workerStartupDurationActual.Seconds(),
			},
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		os.Exit(1)
		return fmt.Errorf("job polling timed out")
	}

	// Calculate job execution time
	jobExecutionDuration := time.Since(jobExecutionStartTime)
	totalJobDuration := time.Since(jobStartTime)

	logs.WriteAgentLog("Job finished: job_id=%s job_execution_time=%.3fs total_time=%.3fs status=%s",
		payload.JobID, jobExecutionDuration.Seconds(), totalJobDuration.Seconds(), finalStatus.Status)

	// Update job state with final status
	jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)

	jobState.Status = finalStatus.Status
	success := finalStatus.Status == "success"

	if !success {
		if finalStatus.Error != nil {
			jobState.Error = finalStatus.Error.Message
		}
	}

	// Handle file uploads and platform completion if configured
	var outputFiles []types.OutputFileRef
	var completionSignalFailed bool
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
			Success:     success,
			Result:      finalStatus.Result,
			OutputFiles: outputFiles,
		}
		if finalStatus.Error != nil {
			completionReq.Error = finalStatus.Error
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
		"worker_startup_time_seconds": workerStartupDurationActual.Seconds(),
		"worker_ready_time_seconds":   workerStartupDuration.Seconds(),
	}

	// Output the final resultLog to stdout for the platform
	resultLog := map[string]interface{}{
		"success":   success,
		"job_id":    payload.JobID,
		"job_class": payload.JobClass,
		"timing":    timing,
	}

	resultLogJSON, _ := json.Marshal(resultLog)
	fmt.Println(string(resultLogJSON))

	// Save result to file
	jobResult := &types.JobResult{
		Success:     success,
		JobID:       payload.JobID,
		JobClass:    payload.JobClass,
		Timing:      timing,
		OutputFiles: outputFiles,
	}
	if finalStatus.Result != nil {
		var parsedResult any
		if err := json.Unmarshal(finalStatus.Result, &parsedResult); err == nil {
			jobResult.Result = parsedResult
		}
	}

	if finalStatus.Error != nil {
		jobResult.Error = finalStatus.Error
	}

	if len(outputFiles) > 0 {
		jobResult.OutputFiles = outputFiles
	}

	if err := state.WriteJobResult(jobResult); err != nil {
		logs.WriteAgentLog("warning: failed to write job result: %v", err)
	}

	state.WriteJobState(jobState)

	// Exit with error code if completion signal failed or job failed
	if completionSignalFailed {
		os.Exit(1)
	}
	if jobState.Status == "failed" {
		os.Exit(1)
	}

	return nil
}

// pollJobStatus makes a single request to get job status
func pollJobStatus(client *http.Client, statusURL string) (*types.HTTPJobStatusResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), jobStatusTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", statusURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create status request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("status request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("job not found")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read status response: %w", err)
	}

	var status types.HTTPJobStatusResponse
	if err := json.Unmarshal(body, &status); err != nil {
		return nil, fmt.Errorf("failed to parse status response: %w", err)
	}

	return &status, nil
}

// ensureWorkerReady makes sure a worker is running and ready to accept jobs
// Returns the worker state, the time taken for the worker to become ready, and any error
func ensureWorkerReady(payload *types.JobPayload) (*types.WorkerState, time.Duration, error) {

	// Check if worker is already running
	alive, workerState, err := state.IsWorkerAlive(payload.WorkerCommand, payload.Interface)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to check worker state: %w", err)
	}

	if alive {
		// Verify the worker is actually responding
		if checkWorkerReady(*payload.Interface.Port) {
			// Worker was already ready, so ready time is 0
			return workerState, 0, nil
		}
		// Worker is running but not yet ready; wait for it to become ready
		waitStart := time.Now()
		if err := waitForWorkerReady(*payload.Interface.Port, readinessTimeout); err != nil {
			workerState.State = "unhealthy"
			state.WriteWorkerState(workerState)
			return nil, 0, err
		}

		readyDuration := time.Since(waitStart)

		// Log worker startup timing
		logs.WriteAgentLog("job_class=%s worker_became_ready_time=%.3fs",
			payload.JobClass, readyDuration.Seconds())

		// Mark as ready
		workerState.State = "ready"
		workerState.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteWorkerState(workerState)
		return workerState, readyDuration, nil
	}

	// Need to start (or restart) the worker
	workerStartTime := time.Now()
	workerState, err = startWorker(payload)
	if err != nil {
		return nil, 0, err
	}

	// Poll for readiness
	if err := waitForWorkerReady(*payload.Interface.Port, readinessTimeout); err != nil {
		workerState.State = "unhealthy"
		state.WriteWorkerState(workerState)
		return nil, 0, err
	}

	// Calculate time taken for worker to become ready
	readyDuration := time.Since(workerStartTime)

	// Log worker startup timing
	logs.WriteAgentLog("job_class=%s worker_became_ready_time=%.3fs",
		payload.JobClass, readyDuration.Seconds())

	// Mark as ready
	workerState.State = "ready"
	workerState.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
	state.WriteWorkerState(workerState)

	return workerState, readyDuration, nil
}

// startWorker starts a new worker process
func startWorker(payload *types.JobPayload) (*types.WorkerState, error) {
	if len(payload.WorkerCommand) == 0 {
		return nil, fmt.Errorf("worker_command is empty")
	}

	// Build the command (without payload arg for persistent workers)
	var cmd *exec.Cmd
	if len(payload.WorkerCommand) > 1 {
		cmd = exec.Command(payload.WorkerCommand[0], payload.WorkerCommand[1:]...)
	} else {
		cmd = exec.Command(payload.WorkerCommand[0])
	}

	// Open log files for the worker
	stdoutPath := config.WorkerOutLogPath(payload.WorkerCommand, payload.Interface)
	stderrPath := config.WorkerErrLogPath(payload.WorkerCommand, payload.Interface)

	stdoutFile, err := os.OpenFile(stdoutPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open worker stdout log: %w", err)
	}

	stderrFile, err := os.OpenFile(stderrPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		stdoutFile.Close()
		return nil, fmt.Errorf("failed to open worker stderr log: %w", err)
	}

	cmd.Stdout = stdoutFile
	cmd.Stderr = stderrFile

	// Start the worker as a background process
	if err := cmd.Start(); err != nil {
		stdoutFile.Close()
		stderrFile.Close()
		return nil, fmt.Errorf("failed to start worker: %w", err)
	}

	// Don't wait for the worker - it runs in the background
	// The log files will be written to by the process
	go func() {
		cmd.Wait()
		stdoutFile.Close()
		stderrFile.Close()
	}()

	// Create worker state
	now := time.Now().UTC().Format(time.RFC3339)
	workerState := &types.WorkerState{
		JobClass:      payload.JobClass,
		Kind:          "persistent_http",
		WorkerCommand: payload.WorkerCommand,
		PID:           cmd.Process.Pid,
		State:         "starting",
		Port:          payload.Interface.Port,
		StartedAt:     now,
		LastCheckedAt: now,
		AgentVersion:  config.AgentVersion,
	}

	if err := state.WriteWorkerState(workerState); err != nil {
		return nil, fmt.Errorf("failed to write worker state: %w", err)
	}

	return workerState, nil
}

// waitForWorkerReady polls the worker endpoint until it responds or times out
func waitForWorkerReady(port int, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		if checkWorkerReady(port) {
			return nil
		}
		time.Sleep(readinessPollWait)
	}

	return fmt.Errorf("worker did not become ready within %s", timeout)
}

// checkWorkerReady checks if the worker is responding to HTTP requests
func checkWorkerReady(port int) bool {
	client := &http.Client{Timeout: jobStatusTimeout}
	endpoint := buildBaseURL(port) + "/health/ready"

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return false
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// 200 OK means the worker is ready to accept jobs
	return resp.StatusCode == 200
}

// buildBaseURL builds the base URL based on the listener configuration
func buildBaseURL(port int) string {
	return fmt.Sprintf("http://127.0.0.1:%d", port)
}

// startAsyncDispatch persists the job and hands off submission to a background agent process.
func startAsyncDispatch(payload *types.JobPayload, jobState *types.JobState, jobStartTime time.Time) error {
	alive, workerState, err := state.IsWorkerAlive(payload.WorkerCommand, payload.Interface)
	if err != nil {
		return fmt.Errorf("failed to check worker state: %w", err)
	}
	if alive && workerState != nil {
		jobState.WorkerStatePID = workerState.PID
		state.WriteJobState(jobState)
	}

	// Always dispatch in the background so this call returns immediately.
	if alive && workerState != nil && workerState.State == "ready" {
		logs.WriteAgentLog("job_id=%s using ready worker; scheduling async dispatch", payload.JobID)
	} else {
		logs.WriteAgentLog("job_id=%s scheduling async dispatch; worker not ready yet", payload.JobID)
	}

	if err := launchAsyncDispatch(payload); err != nil {
		jobState.Status = "failed"
		jobState.Error = err.Error()
		jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteJobState(jobState)
		return err
	}

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

	if jobState.WorkerStatePID != 0 {
		result["worker_pid"] = jobState.WorkerStatePID
	}

	resultJSON, _ := json.Marshal(result)
	fmt.Println(string(resultJSON))
	return nil
}

// prepareHTTPJobRequest creates log/output files and returns the request payload.
func prepareHTTPJobRequest(payload *types.JobPayload) (types.HTTPJobRequest, error) {
	if err := config.EnsureJobOutputDir(payload.JobID); err != nil {
		return types.HTTPJobRequest{}, fmt.Errorf("failed to create job output directory: %w", err)
	}

	jobOutPath := config.JobOutLogPath(payload.JobID)
	jobErrPath := config.JobErrLogPath(payload.JobID)
	jobOutputDir := config.JobOutputDir(payload.JobID)

	if err := touchFile(jobOutPath); err != nil {
		return types.HTTPJobRequest{}, fmt.Errorf("failed to create stdout log: %w", err)
	}
	if err := touchFile(jobErrPath); err != nil {
		return types.HTTPJobRequest{}, fmt.Errorf("failed to create stderr log: %w", err)
	}

	return types.HTTPJobRequest{
		JobID:        payload.JobID,
		JobClass:     payload.JobClass,
		JobInput:     payload.JobInput,
		JobLogOut:    jobOutPath,
		JobLogErr:    jobErrPath,
		JobOutputDir: jobOutputDir,
	}, nil
}

// touchFile truncates/creates a file and closes it immediately.
func touchFile(path string) error {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	return f.Close()
}

// launchAsyncDispatch spins up a background agent process to handle readiness and submission.
func launchAsyncDispatch(payload *types.JobPayload) error {
	waitForCompletion := true
	payload.WaitForCompletion = &waitForCompletion
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload for async dispatch: %w", err)
	}

	payloadB64 := base64.StdEncoding.EncodeToString(payloadJSON)

	cmd := exec.Command(os.Args[0], "run-job", "--payload-base64", payloadB64)

	logPath := config.AgentLogPath()
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open agent log for async dispatch: %w", err)
	}
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return fmt.Errorf("failed to start async dispatch process: %w", err)
	}
	logFile.Close()

	logs.WriteAgentLog("job_id=%s scheduled async dispatch pid=%d", payload.JobID, cmd.Process.Pid)
	return nil
}
