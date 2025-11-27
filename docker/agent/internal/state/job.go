package state

import (
	"encoding/json"
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

// UpdateJobStatus is a helper to update just the status of a job
func UpdateJobStatus(jobID string, status string, completedAt string, errMsg string, meta *types.JobMeta) error {
	state, err := ReadJobState(jobID)
	if err != nil {
		return err
	}
	if state == nil {
		return nil // Job state not found, nothing to update
	}

	state.Status = status
	if completedAt != "" {
		state.CompletedAt = completedAt
	}
	if errMsg != "" {
		state.Error = errMsg
	}
	if meta != nil {
		state.Meta = meta
	}

	return WriteJobState(state)
}
