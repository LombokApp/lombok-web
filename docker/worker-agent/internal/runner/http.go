package runner

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/platform"
	"lombok-worker-agent/internal/state"
	"lombok-worker-agent/internal/types"
	"lombok-worker-agent/internal/upload"
)

const (
	// Readiness polling settings
	readinessTimeout  = 30 * time.Second
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
func RunPersistentHTTP(payload *types.JobPayload) error {
	// Ensure directories exist
	if err := config.EnsureAllDirs(); err != nil {
		return fmt.Errorf("failed to ensure directories: %w", err)
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
		Status:     "pending",
		StartedAt:  now,
		WorkerKind: "persistent_http",
	}
	if err := state.WriteJobState(jobState); err != nil {
		return fmt.Errorf("failed to write initial job state: %w", err)
	}

	// Ensure worker is running and ready
	workerState, err := ensureWorkerReady(payload)
	if err != nil {
		jobState.Status = "failed"
		jobState.Error = err.Error()
		jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteJobState(jobState)

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "WORKER_NOT_READY",
				"message": err.Error(),
			},
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		return err
	}

	jobState.WorkerStatePID = workerState.PID
	state.WriteJobState(jobState)

	// Build the HTTP client for job submission (short timeout)
	client := &http.Client{Timeout: jobSubmitTimeout}
	if payload.Interface.Listener != nil && payload.Interface.Listener.Type == "unix" {
		client.Transport = &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, "unix", payload.Interface.Listener.Path)
			},
		}
	}

	// Build the job request payload
	jobOutPath := config.JobOutLogPath(payload.JobID)
	jobErrPath := config.JobErrLogPath(payload.JobID)
	jobOutputDir := config.JobOutputDir(payload.JobID)

	// Create job log files (empty initially, worker may write to them)
	os.Create(jobOutPath)
	os.Create(jobErrPath)

	httpReq := types.HTTPJobRequest{
		JobID:        payload.JobID,
		JobClass:     payload.JobClass,
		Input:        payload.JobInput,
		JobLogOut:    jobOutPath,
		JobLogErr:    jobErrPath,
		JobOutputDir: jobOutputDir,
	}

	reqBody, err := json.Marshal(httpReq)
	if err != nil {
		return fmt.Errorf("failed to marshal job request: %w", err)
	}

	// Build the endpoint URL
	baseURL := buildBaseURL(payload.Interface.Listener)

	// Step 1: Submit the job
	submitURL := baseURL + "/job"
	ctx, cancel := context.WithTimeout(context.Background(), jobSubmitTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", submitURL, bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		jobState.Status = "failed"
		jobState.Error = fmt.Sprintf("job submission failed: %s", err.Error())
		jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteJobState(jobState)

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "JOB_SUBMIT_FAILED",
				"message": err.Error(),
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
		jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteJobState(jobState)

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "JOB_NOT_ACCEPTED",
				"message": errMsg,
			},
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		return fmt.Errorf("job not accepted: %s", errMsg)
	}

	// Job submitted successfully, update state to running
	jobState.Status = "running"
	state.WriteJobState(jobState)

	// Step 2: Poll for job completion
	statusURL := fmt.Sprintf("%s/job/%s", baseURL, payload.JobID)
	pollClient := buildHTTPClient(payload.Interface.Listener)

	deadline := time.Now().Add(jobPollTimeout)
	var finalStatus *types.HTTPJobStatusResponse

	for time.Now().Before(deadline) {
		status, err := pollJobStatus(pollClient, statusURL)
		if err != nil {
			// Log the error but keep polling
			fmt.Fprintf(os.Stderr, "[lombok-worker-agent] poll error: %v\n", err)
			time.Sleep(jobPollInterval)
			continue
		}

		// Check if job is complete
		if status.Status == "completed" || status.Status == "failed" {
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

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "JOB_POLL_TIMEOUT",
				"message": jobState.Error,
			},
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		os.Exit(1)
		return fmt.Errorf("job polling timed out")
	}

	// Update job state with final status
	jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)

	if finalStatus.Status == "completed" {
		jobState.Status = "success"
	} else {
		jobState.Status = "failed"
		if finalStatus.Error != nil {
			jobState.Error = finalStatus.Error.Message
		}
	}

	state.WriteJobState(jobState)

	// Handle file uploads and platform completion if configured
	var uploadedFiles []types.UploadedFile
	if payload.PlatformURL != "" && payload.JobToken != "" {
		platformClient := platform.NewClient(payload.PlatformURL, payload.JobToken)

		// Check for output manifest and upload files
		manifest, err := upload.ReadManifest(payload.JobID)
		if err != nil {
			fmt.Fprintf(os.Stderr, "[lombok-worker-agent] warning: failed to read manifest: %v\n", err)
		} else if manifest != nil && len(manifest.Files) > 0 {
			uploader := upload.NewUploader(platformClient)
			ctx := context.Background()

			uploaded, err := uploader.UploadFiles(ctx, payload.JobID, manifest)
			if err != nil {
				fmt.Fprintf(os.Stderr, "[lombok-worker-agent] warning: failed to upload files: %v\n", err)
			} else {
				uploadedFiles = uploaded
			}
		}

		// Signal completion to platform
		ctx := context.Background()
		completionReq := &types.CompletionRequest{
			Success:       finalStatus.Status == "completed",
			Result:        finalStatus.Result,
			UploadedFiles: uploadedFiles,
		}
		if finalStatus.Error != nil {
			completionReq.Error = finalStatus.Error
		}

		if err := platformClient.SignalCompletion(ctx, payload.JobID, completionReq); err != nil {
			fmt.Fprintf(os.Stderr, "[lombok-worker-agent] warning: failed to signal completion: %v\n", err)
		}
	}

	// Output the final result to stdout for the platform
	result := map[string]interface{}{
		"success":   finalStatus.Status == "completed",
		"job_id":    payload.JobID,
		"job_class": payload.JobClass,
	}
	if finalStatus.Result != nil {
		result["result"] = json.RawMessage(finalStatus.Result)
	}
	if len(uploadedFiles) > 0 {
		result["uploaded_files"] = uploadedFiles
	}
	if finalStatus.Error != nil {
		result["error"] = finalStatus.Error
	}

	resultJSON, _ := json.Marshal(result)
	fmt.Println(string(resultJSON))

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
func ensureWorkerReady(payload *types.JobPayload) (*types.WorkerState, error) {
	jobClass := payload.JobClass

	// Check if worker is already running
	alive, workerState, err := state.IsWorkerAlive(jobClass)
	if err != nil {
		return nil, fmt.Errorf("failed to check worker state: %w", err)
	}

	if alive && workerState != nil && workerState.State == "ready" {
		// Verify the worker is actually responding
		if checkWorkerReady(payload.Interface.Listener) {
			return workerState, nil
		}
		// Worker is not responding, mark as unhealthy and restart
		workerState.State = "unhealthy"
		state.WriteWorkerState(workerState)
	}

	// Need to start (or restart) the worker
	workerState, err = startWorker(payload)
	if err != nil {
		return nil, err
	}

	// Poll for readiness
	if err := waitForWorkerReady(payload.Interface.Listener, readinessTimeout); err != nil {
		workerState.State = "unhealthy"
		state.WriteWorkerState(workerState)
		return nil, err
	}

	// Mark as ready
	workerState.State = "ready"
	workerState.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
	state.WriteWorkerState(workerState)

	return workerState, nil
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
	stdoutPath := config.WorkerOutLogPath(payload.JobClass)
	stderrPath := config.WorkerErrLogPath(payload.JobClass)

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
		PID:           cmd.Process.Pid,
		State:         "starting",
		Listener:      payload.Interface.Listener,
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
func waitForWorkerReady(listener *types.ListenerConfig, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		if checkWorkerReady(listener) {
			return nil
		}
		time.Sleep(readinessPollWait)
	}

	return fmt.Errorf("worker did not become ready within %s", timeout)
}

// checkWorkerReady checks if the worker is responding to HTTP requests
func checkWorkerReady(listener *types.ListenerConfig) bool {
	client := buildHTTPClient(listener)
	endpoint := buildBaseURL(listener) + "/health/ready"

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

// buildHTTPClient creates an HTTP client configured for the listener type
func buildHTTPClient(listener *types.ListenerConfig) *http.Client {
	if listener == nil {
		return &http.Client{Timeout: jobStatusTimeout}
	}

	if listener.Type == "unix" {
		return &http.Client{
			Timeout: jobStatusTimeout,
			Transport: &http.Transport{
				DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
					return (&net.Dialer{}).DialContext(ctx, "unix", listener.Path)
				},
			},
		}
	}

	return &http.Client{Timeout: jobStatusTimeout}
}

// buildBaseURL builds the base URL based on the listener configuration
func buildBaseURL(listener *types.ListenerConfig) string {
	if listener == nil {
		return "http://127.0.0.1:9000"
	}

	if listener.Type == "unix" {
		// For unix sockets, the host doesn't matter but we need a valid URL
		return "http://localhost"
	}

	return fmt.Sprintf("http://127.0.0.1:%d", listener.Port)
}

// Deprecated: buildEndpointURL is kept for backwards compatibility
func buildEndpointURL(listener *types.ListenerConfig) string {
	return buildBaseURL(listener) + "/job"
}
