package state

import (
	"encoding/json"
	"os"
	"syscall"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/types"
)

// ReadWorkerState reads the state file for a worker by job class
func ReadWorkerState(workerCommand []string, iface types.InterfaceConfig) (*types.WorkerState, error) {
	path := config.WorkerStatePath(workerCommand, iface)
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

	path := config.WorkerStatePath(state.WorkerCommand, types.InterfaceConfig{
		Kind: state.Kind,
		Port: state.Port,
	})
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	logs.WriteAgentLog("writing state file for pid %d to path: %s", state.PID, path)
	return os.WriteFile(path, data, 0644)
}

// IsProcessAlive checks if a process with the given PID is still running
func IsProcessAlive(pid int) bool {
	if pid <= 0 {
		logs.WriteAgentLog("IsProcessAlive: pid %d is invalid (<= 0)", pid)
		return false
	}

	// On Unix, sending signal 0 checks if the process exists
	process, err := os.FindProcess(pid)
	if err != nil {
		logs.WriteAgentLog("IsProcessAlive: failed to find process pid %d: %v", pid, err)
		return false
	}

	err = process.Signal(syscall.Signal(0))
	alive := err == nil
	if !alive {
		logs.WriteAgentLog("IsProcessAlive: signal(0) to pid %d failed: %v", pid, err)
	} else {
		logs.WriteAgentLog("IsProcessAlive: pid %d is alive", pid)
	}
	return alive
}

// IsWorkerAlive checks if the worker for a job class is still running
func IsWorkerAlive(workerCommand []string, iface types.InterfaceConfig) (bool, *types.WorkerState, error) {
	path := config.WorkerStatePath(workerCommand, iface)
	logs.WriteAgentLog("IsWorkerAlive: checking worker_command=%v interface=%+v path=%s", workerCommand, iface, path)

	state, err := ReadWorkerState(workerCommand, iface)
	if err != nil {
		logs.WriteAgentLog("IsWorkerAlive: failed to read worker state: %v", err)
		return false, nil, err
	}
	if state == nil {
		logs.WriteAgentLog("IsWorkerAlive: worker state file not found at path: %s", path)
		return false, nil, nil
	}

	logs.WriteAgentLog("IsWorkerAlive: found worker state file, pid=%d state=%s", state.PID, state.State)
	alive := state.PID > 0 && IsProcessAlive(state.PID)
	logs.WriteAgentLog("IsWorkerAlive: result state=%v alive=%v for pid=%d", state.State, alive, state.PID)
	return alive, state, nil
}
