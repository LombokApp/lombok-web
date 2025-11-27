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
  "job_input": { "any": "json" }
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
    "listener": {
      "type": "tcp",
      "port": 9000
    }
  },
  "job_input": { "any": "json" }
}
```

Listener can also be a Unix socket:

```json
"listener": {
  "type": "unix",
  "path": "/tmp/worker.sock"
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
  "result": { "computed": "data", "from": "worker" }
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

**Note**: The `result` field contains the worker's output. Even failed jobs may include partial results if the worker produced output before failing.

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
echo '{"sum": 42, "status": "completed"}'  # <- This line is captured as result
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
   - Connect stdout/stderr to per-job-class logs:
     ```
     /var/log/lombok-worker-agent/workers/<job_class>.out.log
     /var/log/lombok-worker-agent/workers/<job_class>.err.log
     ```
   - Update worker state file to "starting"
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
  "input": { ...job_input... },
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
    <job_class>.json       # Per-worker state
  jobs/
    <job_id>.json          # Per-job state

/var/log/lombok-worker-agent/
  agent.log                # Agent logs
  agent.err.log            # Agent error logs
  workers/
    <job_class>.out.log    # Worker stdout (persistent_http)
    <job_class>.err.log    # Worker stderr (persistent_http)
  jobs/
    <job_id>.out.log       # Job stdout
    <job_id>.err.log       # Job stderr
```

### Worker State File

`/var/lib/lombok-worker-agent/workers/<job_class>.json`

```json
{
  "job_class": "image.resize.v1",
  "kind": "persistent_http",
  "pid": 1234,
  "state": "starting" | "ready" | "unhealthy" | "stopped",
  "listener": {
    "type": "tcp",
    "port": 9000
  },
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
docker exec <c> lombok-worker-agent worker-log --job-class <job_class> --tail 200
docker exec <c> lombok-worker-agent worker-log --job-class <job_class> --err --tail 200
```

### Job Logs

```bash
docker exec <c> lombok-worker-agent job-log --job-id <job_id> --tail 200
docker exec <c> lombok-worker-agent job-log --job-id <job_id> --err --tail 200
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
}

type InterfaceConfig struct {
    Kind     string          `json:"kind"` // "exec_per_job" or "persistent_http"
    Listener *ListenerConfig `json:"listener,omitempty"`
}

type ListenerConfig struct {
    Type string `json:"type"` // "tcp" or "unix"
    Port int    `json:"port,omitempty"`
    Path string `json:"path,omitempty"`
}
```

### HTTP Protocol Types

```go
// Request to worker
type HTTPJobRequest struct {
    JobID     string          `json:"job_id"`
    JobClass  string          `json:"job_class"`
    Input     json.RawMessage `json:"input"`
    JobLogOut string          `json:"job_log_out,omitempty"`
    JobLogErr string          `json:"job_log_err,omitempty"`
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
    Status   string          `json:"status"` // "pending", "running", "completed", "failed"
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

## 10. Sequence Diagrams

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
   |                          |<-- {status: completed} --|
   |                          |                          |
   |<-- JSON result ----------|                          |
   |                          |                          |
```

---

## 11. Testing

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
