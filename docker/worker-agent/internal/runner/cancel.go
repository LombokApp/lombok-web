package runner

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"time"

	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/platform"
	"lombok-worker-agent/internal/state"
	"lombok-worker-agent/internal/types"
)

// CancelJobConfig contains the information needed to cancel a job
type CancelJobConfig struct {
	Payload         *types.JobPayload
	JobState        *types.JobState
	JobStartTime    time.Time
	WorkerStartTime time.Time
	PlatformClient  *platform.Client
	// For exec_per_job: the command process to kill
	ExecCmd *exec.Cmd
	// For persistent_http: the worker state PID (optional, will be read from jobState if not provided)
	WorkerPID int
}

// CancelJob cancels a running job, killing the worker process and recording failure
// It handles both exec_per_job and persistent_http interfaces appropriately
func CancelJob(config CancelJobConfig, errorCode string, errorMessage string) error {
	// Determine which interface type we're dealing with
	workerKind := config.JobState.WorkerKind
	if workerKind == "" {
		workerKind = config.Payload.Interface.Kind
	}

	switch workerKind {
	case "exec_per_job":
		// For exec_per_job, kill the command process directly
		if config.ExecCmd != nil && config.ExecCmd.Process != nil {
			var killErr error
			if killErr = config.ExecCmd.Process.Kill(); killErr != nil {
				logs.WriteAgentLog("warning: failed to kill exec_per_job worker process: %v", killErr)
			}

			// Wait for process to exit (with timeout)
			done := make(chan error, 1)
			go func() {
				done <- config.ExecCmd.Wait()
			}()
			select {
			case <-done:
				// Process exited
			case <-time.After(5 * time.Second):
				// Force kill if still running after 5 seconds
				if killErr = config.ExecCmd.Process.Kill(); killErr != nil {
					logs.WriteAgentLog("warning: failed to force kill exec_per_job worker process: %v", killErr)
				}
			}
		} else {
			logs.WriteAgentLog("warning: exec_per_job command process not available for cancellation")
		}

	case "persistent_http":
		// For persistent_http, attempt a best-effort HTTP cancel on the worker.
		// IMPORTANT: cancelling a job MUST NOT tear down the persistent worker.
		if config.Payload.Interface.Port == nil {
			logs.WriteAgentLog("warning: cannot cancel persistent_http job_id=%s: interface port is nil", config.Payload.JobID)
			break
		}

		baseURL := buildBaseURL(*config.Payload.Interface.Port)
		cancelURL := fmt.Sprintf("%s/job/%s/cancel", baseURL, config.Payload.JobID)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, cancelURL, nil)
		if err != nil {
			logs.WriteAgentLog("warning: failed to build cancel request for job_id=%s: %v", config.Payload.JobID, err)
			break
		}

		client := &http.Client{
			Timeout: 5 * time.Second,
		}

		resp, err := client.Do(req)
		if err != nil {
			// Endpoint may not exist yet or worker might not support cancel; log and continue.
			logs.WriteAgentLog("warning: failed to send cancel request to worker for job_id=%s url=%s: %v", config.Payload.JobID, cancelURL, err)
			break
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			// Treat non-2xx as best-effort failure; do not kill the worker.
			logs.WriteAgentLog("warning: cancel request to worker for job_id=%s url=%s returned status=%d", config.Payload.JobID, cancelURL, resp.StatusCode)
		} else {
			logs.WriteAgentLog("cancel request sent to worker for job_id=%s url=%s status=%d", config.Payload.JobID, cancelURL, resp.StatusCode)
		}

	default:
		return fmt.Errorf("unknown worker kind: %s", workerKind)
	}

	// Update job state to reflect failure
	completedAt := time.Now().UTC().Format(time.RFC3339)
	config.JobState.Status = "failed"
	config.JobState.Error = errorMessage
	config.JobState.CompletedAt = completedAt
	state.WriteJobState(config.JobState)

	// Calculate timing
	workerStartupDuration := time.Since(config.WorkerStartTime)
	totalJobDuration := time.Since(config.JobStartTime)
	timing := map[string]interface{}{
		"job_execution_time_seconds":  0.0,
		"total_time_seconds":          totalJobDuration.Seconds(),
		"worker_startup_time_seconds": workerStartupDuration.Seconds(),
	}

	// Signal completion to platform if available
	if config.PlatformClient != nil {
		ctx := context.Background()
		completionReq := &types.CompletionRequest{
			Success: false,
			Error: &types.JobError{
				Code:    errorCode,
				Message: errorMessage,
			},
		}
		if err := config.PlatformClient.SignalCompletion(ctx, config.Payload.JobID, completionReq); err != nil {
			logs.WriteAgentLog("warning: failed to signal completion: %v", err)
		}
	}

	// Output result to stdout for the platform to capture
	result := map[string]interface{}{
		"success":   false,
		"exit_code": 1,
		"job_id":    config.Payload.JobID,
		"job_class": config.Payload.JobClass,
		"timing":    timing,
		"error": map[string]interface{}{
			"code":    errorCode,
			"message": errorMessage,
		},
	}

	resultJSON, _ := json.Marshal(result)
	fmt.Println(string(resultJSON))

	// Save result to file
	jobResult := &types.JobResult{
		Success:  false,
		JobID:    config.Payload.JobID,
		JobClass: config.Payload.JobClass,
		Timing:   timing,
		ExitCode: func() *int { v := 1; return &v }(),
		Error: &types.JobError{
			Code:    errorCode,
			Message: errorMessage,
		},
	}
	if err := state.WriteJobResult(jobResult); err != nil {
		logs.WriteAgentLog("warning: failed to write job result: %v", err)
	}

	return fmt.Errorf("%s: %s", errorCode, errorMessage)
}

// HandleCompletionSignalFailure handles failures to signal completion to the platform
// Since the job has already completed at this point, we can't kill it, but we should
// treat this as a critical error. This function logs the error and updates job state.
// The caller should exit with an error code after calling this.
func HandleCompletionSignalFailure(
	payload *types.JobPayload,
	jobState *types.JobState,
	signalErr error,
) {
	logs.WriteAgentLog("error: failed to signal completion to platform: %v", signalErr)

	// Update job state to reflect the completion signal failure
	// Note: The job itself completed, but we failed to notify the platform
	if jobState.Status == "success" {
		// Job succeeded but completion signal failed - log warning
		// Don't change status from success, but note the issue
		logs.WriteAgentLog("warning: job_id=%s completed successfully but failed to signal completion to platform", payload.JobID)
	} else {
		// Job already failed, but add note about completion signal failure
		if jobState.Error != "" {
			jobState.Error += fmt.Sprintf("; also failed to signal completion: %v", signalErr)
		} else {
			jobState.Error = fmt.Sprintf("failed to signal completion: %v", signalErr)
		}
		state.WriteJobState(jobState)
	}
}
