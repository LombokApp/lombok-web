package state

import (
	"encoding/json"
	"fmt"
	"os"
	"syscall"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/types"
)

// ReadWorkerState reads the state file for a worker by port.
func ReadWorkerState(port int) (*types.WorkerState, error) {
	if port <= 0 {
		return nil, fmt.Errorf("worker port is required")
	}
	path := config.WorkerStatePath(port)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var state types.WorkerState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

// AcquireWorkerStartLock guards worker startup to prevent multiple supervisors from starting the same worker.
// It returns a release function that must be called to unlock.
func AcquireWorkerStartLock(port int, timeout time.Duration) (func() error, error) {
	if err := config.EnsureStateDirs(); err != nil {
		return nil, err
	}

	if port <= 0 {
		return nil, fmt.Errorf("worker port is required")
	}

	lockPath := config.WorkerStartLockPath(port)
	lockFile, err := os.OpenFile(lockPath, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		return nil, err
	}

	deadline := time.Now().Add(timeout)
	for {
		if err := syscall.Flock(int(lockFile.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err == nil {
			break
		} else if err != syscall.EWOULDBLOCK {
			lockFile.Close()
			return nil, fmt.Errorf("failed to acquire worker start lock: %w", err)
		}

		if time.Now().After(deadline) {
			lockFile.Close()
			return nil, fmt.Errorf("timed out waiting for worker start lock")
		}

		time.Sleep(100 * time.Millisecond)
	}

	release := func() error {
		defer lockFile.Close()
		if err := syscall.Flock(int(lockFile.Fd()), syscall.LOCK_UN); err != nil {
			return fmt.Errorf("failed to release worker start lock: %w", err)
		}
		return nil
	}

	return release, nil
}

// WriteWorkerState writes the state file for a worker
func WriteWorkerState(state *types.WorkerState) error {
	if err := config.EnsureStateDirs(); err != nil {
		return err
	}

	if state.Port <= 0 {
		return fmt.Errorf("worker port is required")
	}

	path := config.WorkerStatePath(state.Port)
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	logs.WriteAgentLog(logs.LogLevelInfo, "Writing state file", map[string]any{
		"pid":  state.PID,
		"path": path,
	})
	return os.WriteFile(path, data, 0644)
}

// IsProcessAlive checks if a process with the given PID is still running
func IsProcessAlive(pid int) bool {
	if pid <= 0 {
		logs.WriteAgentLog(logs.LogLevelWarn, "Invalid PID", map[string]any{
			"pid": pid,
		})
		return false
	}

	// On Unix, sending signal 0 checks if the process exists
	process, err := os.FindProcess(pid)
	if err != nil {
		logs.WriteAgentLog(logs.LogLevelWarn, "Failed to find process", map[string]any{
			"pid":   pid,
			"error": err.Error(),
		})
		return false
	}

	err = process.Signal(syscall.Signal(0))
	alive := err == nil
	if !alive {
		logs.WriteAgentLog(logs.LogLevelWarn, "Signal check failed", map[string]any{
			"pid":   pid,
			"error": err.Error(),
		})
	} else {
		logs.WriteAgentLog(logs.LogLevelDebug, "Process is alive", map[string]any{
			"pid": pid,
		})
	}
	return alive
}

// IsWorkerAlive checks if the worker for a given port is still running.
func IsWorkerAlive(port int) (bool, *types.WorkerState, error) {
	if port <= 0 {
		return false, nil, fmt.Errorf("worker port is required")
	}
	path := config.WorkerStatePath(port)
	logs.WriteAgentLog(logs.LogLevelDebug, "Checking worker state", map[string]any{
		"port": port,
		"path": path,
	})

	state, err := ReadWorkerState(port)
	if err != nil {
		logs.WriteAgentLog(logs.LogLevelWarn, "Failed to read worker state", map[string]any{
			"error": err.Error(),
		})
		return false, nil, err
	}
	if state == nil {
		logs.WriteAgentLog(logs.LogLevelDebug, "Worker state file not found", map[string]any{
			"path": path,
		})
		return false, nil, nil
	}

	logs.WriteAgentLog(logs.LogLevelDebug, "Found worker state file", map[string]any{
		"pid":    state.PID,
		"status": state.Status,
	})
	alive := state.PID > 0 && IsProcessAlive(state.PID)
	logs.WriteAgentLog(logs.LogLevelDebug, "Worker state check result", map[string]any{
		"status": state.Status,
		"alive":  alive,
		"pid":    state.PID,
	})
	return alive, state, nil
}
