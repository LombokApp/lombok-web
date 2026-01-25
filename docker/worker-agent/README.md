# Lombok Worker Agent — Technical Design

This document describes the design and implementation of the `lombok-worker-agent`, which orchestrates job execution inside Docker containers.

---

## 1. Overview

The agent runs inside a Docker container and handles job execution on behalf of the platform. It supports two worker interfaces:

- **`exec_per_job`**: Spawns a new worker process for each job
- **`persistent_http`**: Maintains a long-running HTTP worker that handles multiple jobs

The platform communicates with the agent via `docker exec`:

```bash
docker exec <container> lombok-worker-agent run-job --payload-base64 "<BASE64_JSON>"
```

The agent outputs a JSON result to stdout, which the platform captures and parses.

---

## 2. Incoming Job Payload Schema

Decoded JSON payload structure:

```json
{
  "job_id": "uuid-string",
  "job_class": "string",
  "worker_command": ["path/to/worker", "arg1", "arg2"],
  "interface": {
    "kind": "exec_per_job"
  },
  "job_input": { "any": "json" },
  "job_token": "jwt-token-for-platform-auth",
  "platform_url": "https://api.lombok.app"
}
```

For `persistent_http` interface:

```json
{
  "job_id": "uuid-string",
  "job_class": "string",
  "worker_command": ["bun", "run", "worker.ts"],
  "interface": {
    "kind": "persistent_http",
    "port": 9000
  },
  "job_input": { "any": "json" },
  "job_token": "jwt-token-for-platform-auth",
  "platform_url": "https://api.lombok.app"
}
```

### Optional Platform Integration Fields

| Field | Description |
|-------|-------------|
| `job_token` | JWT token for authenticating platform API calls |
| `platform_url` | Base URL of the platform API |

The `job_token` contains claims restricting which folders can be uploaded to:
```json
{
  "job_id": "uuid",
  "exp": 1234567890,
  "storage_access_policy": [
    { "folderId": "folder-uuid-1", "prefix": "outputs/", "method": "PUT" },
    { "folderId": "folder-uuid-2", "prefix": "inputs/", "method": "GET" }
  ]
}
```
---

## 3. Agent Output Format

Both interfaces output a consistent JSON result to stdout:

### Successful Job

```json
{
  "success": true,
  "job_id": "uuid-string",
  "job_class": "string",
  "exit_code": 0,
  "result": { "computed": "data", "from": "worker" },
  "output_files": [
    { "folder_id": "folder-uuid", "object_key": "outputs/result.png" }
  ]
}
```

### Failed Job

```json
{
  "success": false,
  "job_id": "uuid-string",
  "job_class": "string",
  "exit_code": 1,
  "error": {
    "code": "WORKER_EXIT_ERROR",
    "message": "worker exited with code 1"
  },
  "result": { "partial": "data" }
}
```

**Note**: The `result` field contains the worker's output. Even failed jobs may include partial results if the worker produced output before failing. The `output_files` field is present when files were successfully uploaded to S3 (see File Output section).

---

## 4. Interface: `exec_per_job`

### Behavior

1. Encode `job_input` as base64 and append as final CLI argument:
   ```
   worker_argv = worker_command + [base64(json(job_input))]
   ```

2. Create per-job log files:
   ```
   /var/log/lombok-worker-agent/jobs/<job_id>.out.log
   /var/log/lombok-worker-agent/jobs/<job_id>.err.log
   ```

3. Spawn worker process with stdout/stderr redirected to log files

4. Also capture stdout to a buffer for result extraction

5. Wait for process exit

6. Extract result from worker stdout (see below)

7. Output JSON result to stdout and exit

### Worker Result Convention

The worker should output its result as **valid JSON on the last non-empty line of stdout**:

```bash
#!/bin/bash
echo "Processing..."
echo "Step 1 complete"
echo "Step 2 complete"
echo '{"sum": 42}'  # <- This line is captured as result
```

The agent:
- Captures all stdout to both log file and memory buffer
- Finds the last non-empty line
- Attempts to parse it as JSON
- If valid JSON, includes it in the `result` field of the output

### Exit Code

The agent exits with the worker's exit code. The platform can use this to determine success/failure.

---

## 5. Interface: `persistent_http`

### Async Protocol

The `persistent_http` interface uses an asynchronous job submission protocol:

1. **Submit**: Agent POSTs job to worker, receives immediate acknowledgment
2. **Poll**: Agent polls `GET /job/{job_id}` until job completes or fails
3. **Result**: Agent outputs final result to stdout

This decouples job execution time from HTTP connection lifetime, allowing long-running jobs.

### Worker Lifecycle

1. Check if worker is already running (via state file + process check)
2. If not running or unhealthy:
   - Start worker using `worker_command` (without payload argument)
   - Connect stdout/stderr to per-worker log:
     ```
     /var/log/lombok-worker-agent/workers/<worker_id>.log
     ```
     `worker_id` is derived from the persistent worker port (for example:
     `http_9000`).
   - Update worker state file status to "starting"
3. Poll for readiness via `GET /health/ready` until worker responds with 200 OK
4. Mark worker as "ready" in state file

### Job Submission

Agent creates per-job log files and POSTs to worker:

```http
POST /job HTTP/1.1
Content-Type: application/json

{
  "job_id": "uuid-string",
  "job_class": "string",
  "job_input": { ...job_input... },
  "job_log_out": "/var/log/lombok-worker-agent/jobs/<job_id>.out.log",
  "job_log_err": "/var/log/lombok-worker-agent/jobs/<job_id>.err.log"
}
```

Worker responds immediately with acknowledgment:

```json
{
  "accepted": true,
  "job_id": "uuid-string"
}
```

Or rejection:

```json
{
  "accepted": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "description"
  }
}
```

### Job Status Polling

Agent polls `GET /job/{job_id}` until completion:

**Pending/Running:**
```json
{
  "job_id": "uuid-string",
  "job_class": "string",
  "status": "pending" | "running"
}
```

**Completed:**
```json
{
  "job_id": "uuid-string",
  "job_class": "string",
  "status": "completed",
  "result": { "computed": "data" }
}
```

**Failed:**
```json
{
  "job_id": "uuid-string",
  "job_class": "string",
  "status": "failed",
  "error": {
    "code": "JOB_EXECUTION_ERROR",
    "message": "description"
  }
}
```

### Polling Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `jobSubmitTimeout` | 10 seconds | Timeout for POST /job |
| `jobPollInterval` | 1 second | Time between status polls |
| `jobPollTimeout` | 30 minutes | Max time to wait for completion |
| `jobStatusTimeout` | 5 seconds | Timeout for each GET /job/{id} |

### Worker HTTP Endpoints

Workers must implement:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health/ready` | GET | Readiness check (200 OK = ready) |
| `/job` | POST | Submit new job (async) |
| `/job/{id}` | GET | Get job status (for polling) |

Optional endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Detailed health info with stats (debugging) |
| `/job-classes` | GET | List supported job classes |
| `/job` | GET | Info about job submission endpoint |

---

## 6. Local State Files

### Directory Structure

```
/var/lib/lombok-worker-agent/
  workers/
    <worker_id>.json           # Per-worker state
  jobs/
    <job_id>.json              # Per-job state
    <job_id>/output/           # Job output files
      __manifest__.json        # Output manifest (optional)
      <output_files>           # Files written by worker

/var/log/lombok-worker-agent/
  agent.log                    # Agent logs
  agent.err.log                # Agent error logs
  workers/
    <worker_id>.log            # Worker logs (persistent_http)
  jobs/
    <job_id>.out.log           # Job stdout
    <job_id>.err.log           # Job stderr
```

### Worker State File

`/var/lib/lombok-worker-agent/workers/<worker_id>.json`

```json
{
  "job_class": "image.resize.v1",
  "kind": "persistent_http",
  "port": 9000,
  "pid": 1234,
  "status": "starting" | "ready" | "unhealthy" | "stopped",
  "started_at": "2025-11-27T10:10:00Z",
  "last_checked_at": "2025-11-27T10:11:00Z",
  "agent_version": "1.0.0"
}
```

### Job State File

`/var/lib/lombok-worker-agent/jobs/<job_id>.json`

```json
{
  "job_id": "uuid",
  "job_class": "image.resize.v1",
  "status": "pending" | "running" | "success" | "failed",
  "started_at": "2025-11-27T10:12:00Z",
  "completed_at": "2025-11-27T10:12:05Z",
  "worker_kind": "exec_per_job" | "persistent_http",
  "worker_pid": 2345,
  "worker_state_pid": 1234,
  "error": "optional error message",
  "meta": {
    "exit_code": 0,
    "http_status": 200
  }
}
```

### Log Rotation

The agent rotates both `/var/log/lombok-worker-agent/agent.log` and
`/var/log/lombok-worker-agent/lombok-worker-agent.log` once they exceed a configured
size so disk usage stays bounded.

Configure rotation using these environment variables (defaults listed):

| Variable                              | Description                                   | Default |
|---------------------------------------|-----------------------------------------------|---------|
| `LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_SIZE_MB`            | Max size in MB before rotating a log file     | `50`    |
| `LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_FILES`              | Number of rotated archives to retain         | `5`     |
| `LOMBOK_WORKER_AGENT_LOG_ROTATION_CHECK_INTERVAL_MINUTES` | Poll interval (minutes) for size checks       | `10`    |

Rotation runs in a background checker that acquires the same logging mutex, so
entries continue without loss while files are swapped. Rotation errors are
logged to `stderr` and do not disrupt normal logging.

---

## 7. Log Access Commands

The platform accesses logs via agent commands (never directly reading files):

### Agent Logs

```bash
docker exec <c> lombok-worker-agent agent-log --tail 200
docker exec <c> lombok-worker-agent agent-log --grep "job=<job_id>"
```

### Worker Logs

```bash
docker exec <c> lombok-worker-agent worker-log --port <port> --tail 200
```

### Combined Worker Logs (Start)

```bash
docker exec <c> lombok-worker-agent start
docker exec <c> lombok-worker-agent start --from-start
```

Warm up workers before tailing logs:

```bash
docker exec <c> lombok-worker-agent start \
  --warmup 8080 start-worker.sh arg1 -- --arg2 \
  --warmup 9000 start-another-worker.sh argX arg2
```

### Job Logs

```bash
docker exec <c> lombok-worker-agent job-log --job-id <job_id> --tail 200
```

---

## 8. Type Definitions (Go)

### Job Payload Types

```go
type JobPayload struct {
    JobID         string          `json:"job_id"`
    JobClass      string          `json:"job_class"`
    WorkerCommand []string        `json:"worker_command"`
    Interface     InterfaceConfig `json:"interface"`
    JobInput      json.RawMessage `json:"job_input"`
    JobToken      string          `json:"job_token,omitempty"`    // JWT for platform auth
    PlatformURL   string          `json:"platform_url,omitempty"` // Platform API base URL
}

type InterfaceConfig struct {
    Kind     string          `json:"kind"` // "exec_per_job" or "persistent_http"
    Port     *int            `json:"port,omitempty"` // empty for exec_per_job
}

```

### HTTP Protocol Types

```go
// Request to worker
type HTTPJobRequest struct {
    JobID        string          `json:"job_id"`
    JobClass     string          `json:"job_class"`
    JobInput     json.RawMessage `json:"job_input"`
    JobLogOut    string          `json:"job_log_out,omitempty"`
    JobLogErr    string          `json:"job_log_err,omitempty"`
    JobOutputDir string          `json:"job_output_dir,omitempty"`
}

// Immediate response from worker (job submission)
type HTTPJobSubmitResponse struct {
    Accepted bool      `json:"accepted"`
    JobID    string    `json:"job_id"`
    Error    *JobError `json:"error,omitempty"`
}

// Response when polling for job status
type HTTPJobStatusResponse struct {
    JobID    string          `json:"job_id"`
    JobClass string          `json:"job_class,omitempty"`
    Status   string          `json:"status"` // "pending", "running", "success", "failed"
    Result   json.RawMessage `json:"result,omitempty"`
    Error    *JobError       `json:"error,omitempty"`
}

// Error structure
type JobError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}
```

---

## 9. Error Codes

### Agent Error Codes

| Code | Description |
|------|-------------|
| `WORKER_NOT_READY` | Worker failed to start or become ready |
| `WORKER_EXIT_ERROR` | Worker process exited with non-zero code |
| `JOB_SUBMIT_FAILED` | Failed to submit job to HTTP worker |
| `JOB_NOT_ACCEPTED` | Worker rejected the job submission |
| `JOB_POLL_TIMEOUT` | Job did not complete within timeout |
| `HTTP_REQUEST_FAILED` | HTTP request to worker failed |

### Worker Error Codes (suggested)

| Code | Description |
|------|-------------|
| `INVALID_JSON` | Request body is not valid JSON |
| `MISSING_JOB_ID` | job_id field is required |
| `DUPLICATE_JOB_ID` | Job ID already exists |
| `UNKNOWN_JOB_CLASS` | Job class not supported |
| `JOB_EXECUTION_ERROR` | Error during job execution |
| `JOB_NOT_FOUND` | Job ID not found (for status polling) |

---

## 10. File Output and Upload

Workers can write output files that the agent uploads to S3 via presigned URLs.

### Output Directory

Each job has a dedicated output directory:

```
/var/lib/lombok-worker-agent/jobs/{job_id}/output/
```

For `exec_per_job`, this path is available via the `JOB_OUTPUT_DIR` environment variable.
For `persistent_http`, it's provided in the job request's `job_output_dir` field.

### Output Manifest

Workers write a manifest file to describe files for upload:

```
/var/lib/lombok-worker-agent/jobs/{job_id}/output/__manifest__.json
```

Manifest format:

```json
{
 "files": [
    {
      "local_path": "result.png",
      "object_key": "result.png"
    },
    {
      "local_path": "data.json",
      "object_key": "data.json"
    }
  ]
}
```

### Upload Flow

After job completion (success or failure), if `platform_url` and `job_token` are configured:

1. Agent checks for manifest at `{output_dir}/__manifest__.json`
2. If manifest exists, requests presigned URLs from platform
3. Uploads each file to S3 using presigned URLs
4. Signals completion to platform with result and uploaded files

---

## 11. Platform API Integration

When `platform_url` and `job_token` are provided, the agent communicates with the platform.

If the worker produces files, the payload can include an optional `output_location` describing where to store them:

```json
"output_location": {
  "folder_id": "folder-uuid-1",
  "prefix": "outputs" // optional, will be prepended to each manifest object_key
}
```

### Request Presigned Upload URLs

```http
POST {platform_url}/api/v1/docker/jobs/{job_id}/request-presigned-urls
Authorization: Bearer {job_token}
Content-Type: application/json

[
  {
    "folderId": "folder-uuid-1",
    "objectKey": "outputs/result.png",
    "method": "PUT"
  }
]
```

Response:

```json
{
  "urls": [
    {
      "folderId": "folder-uuid-1",
      "objectKey": "outputs/result.png",
      "method": "PUT",
      "url": "https://s3..."
    }
  ]
}
```

### Signal Start

```http
POST {platform_url}/api/v1/docker/jobs/{job_id}/start
Authorization: Bearer {job_token}
```

### Signal Completion

```http
POST {platform_url}/api/v1/docker/jobs/{job_id}/complete
Authorization: Bearer {job_token}
Content-Type: application/json

{
  "success": true,
  "result": { "computed": "data" },
  "outputFiles": [
    { "folderId": "folder-uuid-1", "objectKey": "outputs/result.png" }
  ]
}
```

For failed jobs:

```json
{
  "success": false,
  "error": {
    "code": "WORKER_EXIT_ERROR",
    "message": "worker exited with code 1"
  },
  "outputFiles": []
}
```

### Platform API Types (Go)

```go
// Output manifest written by worker
type OutputManifest struct {
    Files []OutputFile `json:"files"`
}

type OutputFile struct {
    LocalPath   string `json:"local_path"`
    ObjectKey   string `json:"object_key"`
}

// Where outputs should be stored (optional on payload)
type OutputLocation struct {
    FolderID string `json:"folder_id"`
    Prefix   string `json:"prefix,omitempty"`
}

// Platform API request/response types
type SignedURLsRequestMethod string

const (
    SignedURLsRequestMethodPUT    SignedURLsRequestMethod = "PUT"
    SignedURLsRequestMethodDELETE SignedURLsRequestMethod = "DELETE"
    SignedURLsRequestMethodGET    SignedURLsRequestMethod = "GET"
    SignedURLsRequestMethodHEAD   SignedURLsRequestMethod = "HEAD"
)

type UploadURLRequest struct {
    FolderID  string                  `json:"folderId"`
    ObjectKey string                  `json:"objectKey"`
    Method    SignedURLsRequestMethod `json:"method"`
}

type UploadURLResponse struct {
    URLs []UploadURL `json:"urls"`
}

type UploadURL struct {
    FolderID  string `json:"folderId"`
    ObjectKey string `json:"objectKey"`
    Method    string `json:"method"`
    URL       string `json:"url"`
}

type CompletionRequest struct {
    Success       bool            `json:"success"`
    Result        json.RawMessage `json:"result,omitempty"`
    Error         *JobError       `json:"error,omitempty"`
    OutputFiles   []OutputFile    `json:"outputFiles,omitempty"`
}

type OutputFile struct {
    FolderID  string `json:"folderId"`
    ObjectKey string `json:"objectKey"`
}
```

---

## 12. Sequence Diagrams

### exec_per_job Flow

```
Platform                    Agent                      Worker
   |                          |                          |
   |-- docker exec run-job -->|                          |
   |                          |-- spawn process -------->|
   |                          |                          | (executes)
   |                          |                          | (outputs JSON on last line)
   |                          |<-- exit code ------------|
   |                          |                          |
   |                          | (extract result from stdout)
   |                          | (check for manifest, upload files)
   |                          | (signal completion to platform)
   |<-- JSON result ----------|                          |
   |                          |                          |
```

### persistent_http Flow

```
Platform                    Agent                      Worker
   |                          |                          |
   |-- docker exec run-job -->|                          |
   |                          |-- POST /job ------------>|
   |                          |<-- {accepted: true} -----|
   |                          |                          | (executes async)
   |                          |-- GET /job/{id} -------->|
   |                          |<-- {status: running} ----|
   |                          |                          |
   |                          |-- GET /job/{id} -------->|
   |                          |<-- {status: success/failed} --|
   |                          |                          |
   |                          | (check for manifest, upload files)
   |                          | (signal completion to platform)
   |<-- JSON result ----------|                          |
   |                          |                          |
```

### File Upload Flow

```
Agent                      Platform                     S3
   |                          |                          |
   | (job complete, manifest exists)                     |
   |                          |                          |
   |-- POST /request-presigned-urls -->|                 |
   |<-- {urls: [...]} --------|                          |
   |                          |                          |
   |-- PUT presigned URL ----------------------------->|
   |<-- 200 OK ----------------------------------------|
   |                          |                          |
   |-- POST /complete ------->|                          |
   |<-- 200 OK ---------------|                          |
   |                          |                          |
```

---

## 13. Testing

The agent includes a comprehensive test suite in `docker/worker-job-runner/test/`:

```bash
# Run all tests
cd docker/worker-job-runner/test && bun test

# Rebuild Docker image and run tests
REBUILD=1 bun test

# Run specific test pattern
bun test -t "exec_per_job"
bun test -t "persistent_http"
bun test -t "JSON result"
```

The test suite includes:
- Basic exec_per_job execution
- JSON result capture from worker stdout
- persistent_http async protocol
- Worker reuse across jobs
- Job logging verification
- Error handling scenarios
- Output directory creation and JOB_OUTPUT_DIR env var
- file_output job class with manifest generation

---

## 14. Implementers

This section describes what a Docker image must implement to integrate with the agent as an HTTP-based worker. It focuses on the **local HTTP jobs interface** (`persistent_http`) and the **file output contract**.

### 14.1 Local HTTP jobs interface (`persistent_http`)

To use the `persistent_http` interface, your image must:

- Start an HTTP server when the worker process is launched using `worker_command` (for example, `["bun", "run", "worker.ts"]`).
- Bind to the listener described in the job payload (or bind to the port you want and assume the config knows which port that is).
- Remain running and serve multiple jobs over its lifetime (the agent reuses the same worker for many jobs of the same `job_class`).

Your HTTP server **must** implement the following endpoints:

- **`GET /health/ready`**
  - Return HTTP 200 when the worker is ready to accept jobs.
  - You may include a JSON body for debugging, but the agent only relies on the status code.
- **`POST /job`**
  - Request body is `HTTPJobRequest` as defined above:
    - `job_id`: string (unique per job).
    - `job_class`: string.
    - `job_input`: JSON payload (input for the job).
    - `job_log_out`: absolute path to a log file for stdout-like job logs.
    - `job_log_err`: absolute path to a log file for stderr-like job logs.
    - `job_output_dir`: absolute path where output files should be written (see below).
  - Your worker should:
    - Validate the request.
    - Start processing the job asynchronously.
  - Response body is `HTTPJobSubmitResponse`:
    - On success:
      ```json
      {
        "accepted": true,
        "job_id": "uuid-string"
      }
      ```
    - On immediate validation failure:
      ```json
      {
        "accepted": false,
        "job_id": "uuid-string",
        "error": {
          "code": "INVALID_INPUT",
          "message": "description"
        }
      }
      ```
- **`GET /job/{job_id}`**
  - Return `HTTPJobStatusResponse`:
    - While queued or running:
      ```json
      {
        "job_id": "uuid-string",
        "job_class": "string",
        "status": "pending"
      }
      ```
      or
      ```json
      {
        "job_id": "uuid-string",
        "job_class": "string",
        "status": "running"
      }
      ```
    - On success:
      ```json
      {
        "job_id": "uuid-string",
        "job_class": "string",
        "status": "success",
        "result": { "any": "json" }
      }
      ```
    - On failure:
      ```json
      {
        "job_id": "uuid-string",
        "job_class": "string",
        "status": "failed",
        "error": {
          "code": "JOB_EXECUTION_ERROR",
          "message": "description"
        }
      }
      ```

Your implementation is free to choose any internal concurrency, queuing, and resource management strategy, as long as:

- `POST /job` returns quickly (no long-running HTTP requests).
- `GET /job/{job_id}` eventually transitions to `status` `"success"` or `"failed"`.
- Job IDs are unique per worker instance, or safely de-duplicated.

### 14.2 Managing output files

The agent supports automatic upload of worker-generated files to the platform. To participate in this, your worker must follow the output directory and manifest conventions:

- **Output directory**
  - For HTTP workers, the agent passes the per-job output directory in `job_output_dir` (inside `HTTPJobRequest`).
  - Your worker must:
    - Create any necessary subdirectories under `job_output_dir`.
    - Write all files you want uploaded under this directory.
- **Manifest file**
  - When the job finishes (success or failure), your worker should write:
    - Path: `{job_output_dir}/__manifest__.json`.
    - Format:
      ```json
      {
        "files": [
          {
            "local_path": "relative/path/from_output_dir.ext",
            "object_key": "worker-chosen/path.ext"
          }
        ]
      }
      ```
  - `local_path`:
    - Relative to `job_output_dir`.
    - Must point to an existing file by the time the agent checks for uploads.
  - `object_key`:
    - Worker-chosen relative key. The agent will prepend the optional `output_location.prefix` and use the `output_location.folder_id` from the job payload when uploading.

The agent will:

- Read `__manifest__.json` after the job reaches `success` or `failed`.
- Request presigned URLs from the platform for each file entry (using `output_location.folder_id` and prefixed object keys).
- Upload the files to S3.
- Include the final `output_files` list in the job completion payload back to the platform.

If your worker does not create a manifest, the job will still run correctly; it will simply produce no uploaded files.
