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
	"lombok-worker-agent/internal/state"
	"lombok-worker-agent/internal/types"
)

const (
	// Readiness polling settings
	readinessTimeout  = 30 * time.Second
	readinessPollWait = 500 * time.Millisecond

	// HTTP request timeout
	httpRequestTimeout = 60 * time.Second
)

// RunPersistentHTTP runs a job using the persistent_http interface
// It ensures a persistent worker is running, then POSTs the job to it.
func RunPersistentHTTP(payload *types.JobPayload) error {
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

	// Build the HTTP client
	client := buildHTTPClient(payload.Interface.Listener)

	// Build the job request payload
	jobOutPath := config.JobOutLogPath(payload.JobID)
	jobErrPath := config.JobErrLogPath(payload.JobID)

	// Create job log files (empty initially, worker may write to them)
	os.Create(jobOutPath)
	os.Create(jobErrPath)

	httpReq := types.HTTPJobRequest{
		JobID:     payload.JobID,
		JobClass:  payload.JobClass,
		Input:     payload.JobInput,
		JobLogOut: jobOutPath,
		JobLogErr: jobErrPath,
	}

	reqBody, err := json.Marshal(httpReq)
	if err != nil {
		return fmt.Errorf("failed to marshal job request: %w", err)
	}

	// Build the endpoint URL
	endpoint := buildEndpointURL(payload.Interface.Listener)

	// Make the HTTP request
	ctx, cancel := context.WithTimeout(context.Background(), httpRequestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		jobState.Status = "failed"
		jobState.Error = fmt.Sprintf("HTTP request failed: %s", err.Error())
		jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)
		state.WriteJobState(jobState)

		result := map[string]interface{}{
			"success": false,
			"job_id":  payload.JobID,
			"error": map[string]interface{}{
				"code":    "HTTP_REQUEST_FAILED",
				"message": err.Error(),
			},
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
		return err
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	// Update job state with HTTP status
	jobState.Meta = &types.JobMeta{HTTPStatus: resp.StatusCode}
	jobState.CompletedAt = time.Now().UTC().Format(time.RFC3339)

	// Try to parse response as HTTPJobResponse
	var jobResp types.HTTPJobResponse
	if err := json.Unmarshal(respBody, &jobResp); err == nil {
		if jobResp.Success {
			jobState.Status = "success"
		} else {
			jobState.Status = "failed"
			if jobResp.Error != nil {
				jobState.Error = jobResp.Error.Message
			}
		}
	} else {
		// If response is not valid JSON, check HTTP status
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			jobState.Status = "success"
		} else {
			jobState.Status = "failed"
			jobState.Error = fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(respBody))
		}
	}

	state.WriteJobState(jobState)

	// Output the response to stdout for the platform
	if json.Valid(respBody) {
		fmt.Println(string(respBody))
	} else {
		result := map[string]interface{}{
			"success":     jobState.Status == "success",
			"job_id":      payload.JobID,
			"http_status": resp.StatusCode,
			"result":      string(respBody),
		}
		resultJSON, _ := json.Marshal(result)
		fmt.Println(string(resultJSON))
	}

	if jobState.Status == "failed" {
		os.Exit(1)
	}

	return nil
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
	endpoint := buildEndpointURL(listener)

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

	// Any response (even 4xx/5xx) means the worker is listening
	return true
}

// buildHTTPClient creates an HTTP client configured for the listener type
func buildHTTPClient(listener *types.ListenerConfig) *http.Client {
	if listener == nil {
		return &http.Client{Timeout: httpRequestTimeout}
	}

	if listener.Type == "unix" {
		return &http.Client{
			Timeout: httpRequestTimeout,
			Transport: &http.Transport{
				DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
					return (&net.Dialer{}).DialContext(ctx, "unix", listener.Path)
				},
			},
		}
	}

	return &http.Client{Timeout: httpRequestTimeout}
}

// buildEndpointURL builds the endpoint URL based on the listener configuration
func buildEndpointURL(listener *types.ListenerConfig) string {
	if listener == nil {
		return "http://127.0.0.1:9000/job"
	}

	if listener.Type == "unix" {
		// For unix sockets, the host doesn't matter but we need a valid URL
		return "http://localhost/job"
	}

	return fmt.Sprintf("http://127.0.0.1:%d/job", listener.Port)
}
