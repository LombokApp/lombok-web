package types

import (
	"encoding/json"
)

// JobPayload is the decoded payload sent to the agent via run-job command
type JobPayload struct {
	JobID         string          `json:"job_id"`
	JobClass      string          `json:"job_class"`
	WorkerCommand []string        `json:"worker_command"`
	Interface     InterfaceConfig `json:"interface"`
	JobInput      json.RawMessage `json:"job_input"`
	JobToken      string          `json:"job_token,omitempty"`    // JWT for platform auth
	PlatformURL   string          `json:"platform_url,omitempty"` // e.g. "https://api.lombok.app"
}

// InterfaceConfig describes how the agent communicates with the worker
type InterfaceConfig struct {
	Kind     string          `json:"kind"` // "exec_per_job" or "persistent_http"
	Listener *ListenerConfig `json:"listener,omitempty"`
}

// ListenerConfig describes how to connect to a persistent HTTP worker
type ListenerConfig struct {
	Type string `json:"type"` // "tcp" or "unix"
	Port int    `json:"port,omitempty"`
	Path string `json:"path,omitempty"`
}

// WorkerState represents the state of a persistent worker process
type WorkerState struct {
	JobClass      string          `json:"job_class"`
	Kind          string          `json:"kind"`
	PID           int             `json:"pid"`
	State         string          `json:"state"` // "starting", "ready", "unhealthy", "stopped"
	Listener      *ListenerConfig `json:"listener,omitempty"`
	StartedAt     string          `json:"started_at"`
	LastCheckedAt string          `json:"last_checked_at"`
	AgentVersion  string          `json:"agent_version"`
}

// JobState represents the state of a job execution
type JobState struct {
	JobID          string   `json:"job_id"`
	JobClass       string   `json:"job_class"`
	Status         string   `json:"status"` // "pending", "running", "success", "failed"
	StartedAt      string   `json:"started_at"`
	CompletedAt    string   `json:"completed_at,omitempty"`
	WorkerKind     string   `json:"worker_kind"`
	WorkerPID      int      `json:"worker_pid,omitempty"`
	WorkerStatePID int      `json:"worker_state_pid,omitempty"`
	Error          string   `json:"error,omitempty"`
	Meta           *JobMeta `json:"meta,omitempty"`
}

// JobMeta contains additional metadata about job execution
type JobMeta struct {
	ExitCode   int `json:"exit_code,omitempty"`
	HTTPStatus int `json:"http_status,omitempty"`
}

// HTTPJobRequest is the payload sent to persistent HTTP workers
type HTTPJobRequest struct {
	JobID        string          `json:"job_id"`
	JobClass     string          `json:"job_class"`
	Input        json.RawMessage `json:"input"`
	JobLogOut    string          `json:"job_log_out,omitempty"`
	JobLogErr    string          `json:"job_log_err,omitempty"`
	JobOutputDir string          `json:"job_output_dir,omitempty"` // Directory for output files
}

// HTTPJobSubmitResponse is the immediate response when submitting a job
type HTTPJobSubmitResponse struct {
	Accepted bool      `json:"accepted"`
	JobID    string    `json:"job_id"`
	Error    *JobError `json:"error,omitempty"`
}

// HTTPJobStatusResponse is the response when polling for job status
type HTTPJobStatusResponse struct {
	JobID    string          `json:"job_id"`
	JobClass string          `json:"job_class,omitempty"`
	Status   string          `json:"status"` // "pending", "running", "completed", "failed"
	Result   json.RawMessage `json:"result,omitempty"`
	Error    *JobError       `json:"error,omitempty"`
}

// HTTPJobResponse is the expected response from persistent HTTP workers (legacy sync mode)
type HTTPJobResponse struct {
	Success bool            `json:"success"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *JobError       `json:"error,omitempty"`
}

// JobError represents an error from a job execution
type JobError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// =============================================================================
// Output Manifest Types (written by worker)
// =============================================================================

// OutputManifest describes files to be uploaded after job completion
type OutputManifest struct {
	Files []OutputFile `json:"files"`
}

// OutputFile describes a single file to be uploaded
type OutputFile struct {
	LocalPath   string `json:"local_path"`   // Relative path within output directory
	FolderID    string `json:"folder_id"`    // Target folder UUID in platform
	ObjectKey   string `json:"object_key"`   // Object key/path within the folder
	ContentType string `json:"content_type"` // MIME type of the file
}

// =============================================================================
// Platform API Types
// =============================================================================

// UploadURLRequest is sent to the platform to request presigned upload URLs
type UploadURLRequest struct {
	Files []UploadFileRequest `json:"files"`
}

// UploadFileRequest describes a file for which we need a presigned URL
type UploadFileRequest struct {
	FolderID    string `json:"folderId"`
	ObjectKey   string `json:"objectKey"`
	ContentType string `json:"contentType"`
}

// UploadURLResponse is the response from the platform with presigned URLs
type UploadURLResponse struct {
	Uploads []UploadURL `json:"uploads"`
}

// UploadURL contains the presigned URL for a single file upload
type UploadURL struct {
	FolderID     string `json:"folderId"`
	ObjectKey    string `json:"objectKey"`
	PresignedURL string `json:"presignedUrl"`
}

// CompletionRequest is sent to the platform to signal job completion
type CompletionRequest struct {
	Success       bool            `json:"success"`
	Result        json.RawMessage `json:"result,omitempty"`
	Error         *JobError       `json:"error,omitempty"`
	UploadedFiles []UploadedFile  `json:"uploadedFiles,omitempty"`
}

// UploadedFile describes a file that was successfully uploaded
type UploadedFile struct {
	FolderID  string `json:"folderId"`
	ObjectKey string `json:"objectKey"`
}
