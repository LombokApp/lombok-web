# Log Rotation Implementation Plan

## Overview

This document outlines the plan to implement log rotation for both the agent log (`agent.log`) and unified log (`lombok-worker-agent.log`) in the worker agent. Log rotation prevents log files from growing unbounded and consuming excessive disk space.

## Current State

### Log Files
- **Agent Log**: `/var/log/lombok-worker-agent/agent.log`
  - Contains agent-specific logs
  - Format: `timestamp|LEVEL|["message",{optional_data}]`
  - Written via `logs.WriteAgentLog()` and related functions

- **Unified Log**: `/var/log/lombok-worker-agent/lombok-worker-agent.log`
  - Contains all logs (agent, worker, and job logs)
  - Format: `timestamp|SOURCE|LEVEL|["message",{optional_data}]`
  - Written via `logs.WriteAgentLog()`, `logs.WriteJobLog()`, and `logs.WriteUnifiedWorkerLog()`

### Current Implementation
- Both log files are opened in append mode (`os.O_APPEND`) in `InitAgentLog()`
- Files are never closed or rotated during runtime
- Each write operation syncs to disk immediately (`file.Sync()`)
- All writes are protected by a mutex (`logMutex`)
- Files are only closed during shutdown via `CloseAgentLog()`

## Requirements

### Functional Requirements
1. **Size-based rotation**: Rotate logs when they exceed a configurable maximum size
2. **Periodic checks**: Check log file sizes periodically (default: every 10 minutes)
3. **Retention**: Keep a configurable number of rotated log files (e.g., keep 7 rotated files)
4. **Naming convention**: Rotated files should use a naming pattern:
   - `agent.log.1`, `agent.log.2`, etc.
   - `lombok-worker-agent.log.1`, `lombok-worker-agent.log.2`, etc.
5. **Thread safety**: Rotation must be thread-safe (already protected by existing mutex)
6. **No data loss**: Ensure all log entries are written before rotation
7. **Independent rotation**: Agent log and unified log rotate independently

### Non-Functional Requirements
1. **Performance**: Rotation checks should be lightweight and not block normal logging
2. **Configuration**: Rotation parameters should be configurable via environment variables
3. **Backward compatibility**: Default behavior should not break existing functionality
4. **Error handling**: Rotation failures should not prevent logging from continuing

## Design

### Rotation Strategy

We'll implement **periodic size-based rotation**:

1. **Periodic size checks**: Use a background goroutine with a ticker to check file sizes periodically (default: every 10 minutes)
2. **Size-based rotation**: When a log file exceeds the configured maximum size, rotate it
3. **Background operation**: Rotation checks run in the background, not blocking normal logging operations

### Configuration

Add environment variables for configuration (with sensible defaults):

```go
// Environment variables (with defaults)
LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_SIZE_MB = 50          // Max size in MB before rotation
LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_FILES = 5             // Number of rotated files to keep
LOMBOK_WORKER_AGENT_LOG_ROTATION_CHECK_INTERVAL_MINUTES = 10  // Check interval in minutes
```

### File Naming Convention

- Current: `agent.log`
- Rotated: `agent.log.1`, `agent.log.2`, ..., `agent.log.N`
- When rotating: `agent.log` → `agent.log.1`, `agent.log.1` → `agent.log.2`, etc.
- Oldest file (`agent.log.N`) is deleted when exceeding max files

### Implementation Approach

#### 1. Create Rotation Module (`internal/logs/rotation.go`)

```go
package logs

import (
    "context"
    "os"
    "path/filepath"
    "time"
)

type RotationConfig struct {
    MaxSizeMB           int
    MaxFiles            int
    CheckIntervalMinutes int
}

type rotationState struct {
    lastCheckTime time.Time
}

// checkAndRotate checks if rotation is needed and performs it
func checkAndRotate(file *os.File, filePath string, config RotationConfig) error

// startRotationChecker starts a background goroutine that periodically checks and rotates logs
func startRotationChecker(ctx context.Context, config RotationConfig) error
```

#### 2. Modify `writer.go`

- Add rotation config loading in `InitAgentLog()`
- Start background rotation checker goroutine in `InitAgentLog()`
- Store context for rotation checker to allow graceful shutdown
- Implement rotation logic that:
  1. Checks file size using `file.Stat()`
  2. If size exceeds threshold:
     a. Closes current file
     b. Renames existing rotated files (shift numbers)
     c. Deletes oldest rotated file if exceeding max files
     d. Opens new log file
     e. Updates file handles atomically
- Stop rotation checker in `CloseAgentLog()`

#### 3. Add Configuration Loading (`internal/config/log_rotation.go`)

```go
package config

import (
    "os"
    "strconv"
)

type LogRotationConfig struct {
    MaxSizeMB            int
    MaxFiles             int
    CheckIntervalMinutes int
}

func LoadLogRotationConfig() LogRotationConfig
```

## Implementation Steps

_Note: the agent log and unified log rotate independently, but both files will be managed by the same rotation helpers so they share configuration defaults and retention logic._

### Phase 1: Core Rotation Infrastructure

1. **Create `internal/config/log_rotation.go`**
   - Add `LogRotationConfig` struct
   - Add `LoadLogRotationConfig()` function to read environment variables
   - Provide sensible defaults

2. **Create `internal/logs/rotation.go`**
   - Add rotation config struct
   - Implement `checkAndRotate()` function for a single log file
  - Implement `startRotationChecker()` function to run periodic checks
  - Implement file renaming/shifting logic
  - Implement old file cleanup logic
  - Handle context cancellation for graceful shutdown
  - Expose a helper that can be invoked from both log files (agent + unified) so each file can be rotated independently but share the same size/retention settings.

3. **Add unit tests for rotation logic**
  - Test size-based rotation
  - Test file retention limits
  - Test concurrent rotation safety
  - Test periodic checker goroutine
  - Test graceful shutdown
  - Mock the ticker interval so a single test can cover the periodic checker without waiting minutes

### Phase 2: Integrate Rotation into Writer

4. **Modify `internal/logs/writer.go`**
  - Add rotation config variable
  - Add context and cancel function for rotation checker
  - Load rotation config in `InitAgentLog()`
  - Start background rotation checker goroutine in `InitAgentLog()`
  - Stop rotation checker in `CloseAgentLog()`
  - Ensure rotation is thread-safe (already protected by mutex)
  - Ensure both the agent log and unified log share the same mutex guard when swapping files so concurrent writes block momentarily during rotation
  - After rotation, atomically swap the `*os.File` handles under the mutex so future writes hit the new file

5. **Handle edge cases**
   - Rotation during active writes (use mutex to prevent concurrent writes during rotation)
   - Rotation failures (log error but continue, don't block logging)
   - File handle updates after rotation (atomically update file handles)
   - Graceful shutdown of rotation checker

### Phase 3: Testing and Validation

6. **Add integration tests**
  - Test rotation with actual log writes
  - Test rotation with concurrent writes
  - Test rotation with large log files
  - Verify no log entries are lost
  - Include a quick-running integration test that uses a short `LOMBOK_WORKER_AGENT_LOG_ROTATION_CHECK_INTERVAL_MINUTES` so the ticker fires several times during the test

7. **Add manual testing scenarios**
   - Test size-based rotation by writing large amounts of logs
   - Test periodic checker (verify it checks every 10 minutes)
   - Test file retention limits
   - Test rotation with existing rotated files
   - Test rotation checker shutdown on agent close

### Phase 4: Documentation and Cleanup

8. **Update documentation**
   - Update `README.md` with rotation configuration
   - Add examples of rotation behavior
   - Document environment variables

9. **Code review and cleanup**
   - Review error handling
   - Verify rotation checker goroutine properly shuts down
   - Ensure mutex usage is correct for thread safety
   - Review file handle management during rotation

## Technical Considerations

### Periodic Check Implementation

**Approach: Background goroutine with ticker**
- Start a goroutine in `InitAgentLog()` that runs a ticker
- Ticker fires every `CheckIntervalMinutes` (default: 10 minutes)
- On each tick, check both log files for rotation needs
- Use `context.Context` for graceful shutdown
- Stop the goroutine in `CloseAgentLog()`

**Benefits:**
- Non-blocking: Checks happen in background, don't affect logging performance
- Predictable: Checks happen at regular intervals
- Simple: No need to track write counts or check on every write

### File Size Checking

- Use `file.Stat()` to get current file size
- Compare against configured max size (convert MB to bytes)
- Check both `agentLogFile` and `unifiedLogFile` independently
- Each file rotates independently when it exceeds its size limit

### Rotation Timing

- Rotation checks happen periodically (default: every 10 minutes)
- If a file exceeds max size, it's rotated immediately when checked
- There may be a delay of up to `CheckIntervalMinutes` before rotation occurs
- This is acceptable as it prevents blocking normal logging operations

### Error Handling

- If rotation fails, log the error but continue with existing file
- Don't block logging operations due to rotation failures
- Log rotation errors to stderr or agent log (if available)

### Thread Safety

- Existing `logMutex` already protects all write operations
- Rotation checks and operations must acquire the same mutex lock
- This ensures no writes occur during rotation
- Background rotation checker must acquire mutex before checking/rotating
- Rotation operations are quick (file rename/delete), so mutex hold time is minimal

## File Structure Changes

```
docker/worker-agent/
├── internal/
│   ├── config/
│   │   ├── paths.go (existing)
│   │   └── log_rotation.go (new)
│   └── logs/
│       ├── writer.go (modified)
│       ├── reader.go (existing)
│       └── rotation.go (new)
```

## Configuration Examples

### Default (Periodic size-based rotation)
```bash
# No environment variables needed
# Defaults: 100MB max size, keep 7 files, check every 10 minutes
```

### Custom size and retention
```bash
export LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_SIZE_MB=50
export LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_FILES=10
```

### Custom check interval
```bash
export LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_SIZE_MB=100
export LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_FILES=7
export LOMBOK_WORKER_AGENT_LOG_ROTATION_CHECK_INTERVAL_MINUTES=5  # Check every 5 minutes
```

## Testing Strategy

### Unit Tests
- Test rotation logic with mock files
- Test file renaming and shifting
- Test old file cleanup
- Test configuration loading

### Integration Tests
- Test rotation with actual log writes
- Test concurrent rotation safety
- Test rotation with existing rotated files
- Test error handling during rotation failures

### Manual Testing
- Write large amounts of logs to trigger size-based rotation
- Verify periodic checker runs (wait for check interval)
- Verify rotated files are created correctly
- Verify old files are cleaned up
- Test rotation with both log files independently
- Test rotation checker shutdown on agent close

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rotation fails and blocks logging | High | Ensure rotation errors don't block writes, log errors to stderr |
| Race condition during rotation | High | Use existing mutex to protect rotation operations |
| Performance degradation | Low | Periodic checks in background don't block normal logging |
| Disk space issues during rotation | Medium | Ensure rotation completes before deleting old files |
| Lost log entries during rotation | High | Ensure all writes are flushed before rotation, reopen file immediately |
| Rotation checker goroutine leak | Medium | Properly stop checker in CloseAgentLog(), use context cancellation |
| Delay in rotation (up to check interval) | Low | Acceptable trade-off for non-blocking operation |

## Future Enhancements

1. **Compression**: Compress rotated log files to save space
2. **External rotation**: Support external tools like `logrotate`
3. **Metrics**: Track rotation events and file sizes
4. **Alerting**: Alert when rotation fails or disk space is low
5. **Per-log configuration**: Different rotation settings for agent vs unified log
6. **Immediate rotation on size check**: Option to check size on every write (for critical systems)

## Success Criteria

- [ ] Agent log rotates when exceeding configured size
- [ ] Unified log rotates when exceeding configured size
- [ ] Periodic checker runs at configured interval (default: 10 minutes)
- [ ] Old rotated files are cleaned up correctly
- [ ] No log entries are lost during rotation
- [ ] Rotation failures don't block normal logging
- [ ] Configuration via environment variables works
- [ ] Thread-safe rotation with concurrent writes
- [ ] Backward compatible (works without configuration)
- [ ] Rotation checker shuts down gracefully on agent close
- [ ] Comprehensive test coverage
