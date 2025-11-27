package state

import (
	"encoding/json"
	"os"
	"syscall"

	"platform-agent/internal/config"
	"platform-agent/internal/types"
)

// ReadWorkerState reads the state file for a worker by job class
func ReadWorkerState(jobClass string) (*types.WorkerState, error) {
	path := config.WorkerStatePath(jobClass)
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

// WriteWorkerState writes the state file for a worker
func WriteWorkerState(state *types.WorkerState) error {
	if err := config.EnsureStateDirs(); err != nil {
		return err
	}

	path := config.WorkerStatePath(state.JobClass)
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

// IsProcessAlive checks if a process with the given PID is still running
func IsProcessAlive(pid int) bool {
	if pid <= 0 {
		return false
	}

	// On Unix, sending signal 0 checks if the process exists
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}

	err = process.Signal(syscall.Signal(0))
	return err == nil
}

// IsWorkerAlive checks if the worker for a job class is still running
func IsWorkerAlive(jobClass string) (bool, *types.WorkerState, error) {
	state, err := ReadWorkerState(jobClass)
	if err != nil {
		return false, nil, err
	}
	if state == nil {
		return false, nil, nil
	}

	alive := IsProcessAlive(state.PID)
	return alive, state, nil
}
