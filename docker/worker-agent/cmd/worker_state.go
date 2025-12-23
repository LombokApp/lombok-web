package cmd

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"lombok-worker-agent/internal/state"
	"lombok-worker-agent/internal/types"

	"github.com/spf13/cobra"
)

var (
	workerStateJobConfigBase64 string
)

var workerStateCmd = &cobra.Command{
	Use:   "worker-state",
	Short: "Read worker state for a job config",
	Long:  `Read state for a persistent worker process by job config.`,
	RunE:  readWorkerState,
}

func init() {
	workerStateCmd.Flags().StringVar(&workerStateJobConfigBase64, "job-config", "", "Job command and interface (required)")
	workerStateCmd.MarkFlagRequired("job-config")
}

type WorkerStateConfigPayload struct {
	WorkerCommand []string              `json:"worker_command"`
	Interface     types.InterfaceConfig `json:"interface"`
}

func readWorkerState(cmd *cobra.Command, args []string) error {
	payloadBytes, err := base64.StdEncoding.DecodeString(workerStateJobConfigBase64)
	if err != nil {
		return fmt.Errorf("failed to decode base64 payload: %w", err)
	}

	// Parse the JSON payload
	var payload types.JobConfigPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return fmt.Errorf("failed to parse JSON payload: %w", err)
	}

	workerState, err := state.ReadWorkerState(payload.WorkerCommand, payload.Interface)
	if err != nil {
		return fmt.Errorf("failed to read job state: %w", err)
	}

	if workerState == nil {
		jsonPayload, _ := json.MarshalIndent(payload, "", "  ")
		return fmt.Errorf("worker state not found for job config: %s", jsonPayload)
	}

	// Output as JSON
	stateJSON, err := json.MarshalIndent(workerState, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	fmt.Println(string(stateJSON))
	return nil
}
