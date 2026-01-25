package state

import (
	"encoding/json"
	"fmt"
	"os"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/types"
)

// ReadJobState reads the state file for a job
func ReadJobState(jobID string) (*types.JobState, error) {
	path := config.JobStatePath(jobID)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var state types.JobState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

// WriteJobState writes the state file for a job
func WriteJobState(state *types.JobState) error {
	if err := config.EnsureStateDirs(); err != nil {
		return err
	}

	path := config.JobStatePath(state.JobID)
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

// WriteHTTPJobState writes the job state file and creates a worker-specific symlink.
func WriteHTTPJobState(state *types.JobState, port int) error {
	if err := WriteJobState(state); err != nil {
		return err
	}

	if err := config.EnsureWorkerJobsDir(port); err != nil {
		return err
	}

	linkPath := config.WorkerJobStateLinkPath(port, state.JobID)
	targetPath := config.JobStatePath(state.JobID)
	if err := ensureSymlink(linkPath, targetPath); err != nil {
		return fmt.Errorf("failed to create worker job symlink: %w", err)
	}

	return nil
}

func ensureSymlink(linkPath, targetPath string) error {
	info, err := os.Lstat(linkPath)
	if err == nil {
		if info.Mode()&os.ModeSymlink != 0 {
			return nil
		}
		if removeErr := os.Remove(linkPath); removeErr != nil {
			return removeErr
		}
	} else if !os.IsNotExist(err) {
		return err
	}

	return os.Symlink(targetPath, linkPath)
}

// WriteJobResult writes the result file for a job
func WriteJobResult(result *types.JobResult) error {
	if err := config.EnsureStateDirs(); err != nil {
		return err
	}

	path := config.JobResultPath(result.JobID)
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

// ReadJobResult reads the result file for a job
func ReadJobResult(jobID string) (*types.JobResult, error) {
	path := config.JobResultPath(jobID)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var result types.JobResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return &result, nil
}
