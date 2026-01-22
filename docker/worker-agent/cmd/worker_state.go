package cmd

import (
	"encoding/json"
	"fmt"
	"lombok-worker-agent/internal/state"

	"github.com/spf13/cobra"
)

var (
	workerStatePort int
)

var workerStateCmd = &cobra.Command{
	Use:   "worker-state",
	Short: "Read worker state for a port",
	Long:  `Read state for a persistent worker process by port.`,
	RunE:  readWorkerState,
}

func init() {
	workerStateCmd.Flags().IntVar(&workerStatePort, "port", 0, "Worker port (required)")
	workerStateCmd.MarkFlagRequired("port")
}

func readWorkerState(cmd *cobra.Command, args []string) error {
	if workerStatePort <= 0 {
		return fmt.Errorf("port must be greater than 0")
	}

	workerState, err := state.ReadWorkerState(workerStatePort)
	if err != nil {
		return fmt.Errorf("failed to read worker state: %w", err)
	}

	if workerState == nil {
		return fmt.Errorf("worker state not found for port: %d", workerStatePort)
	}

	// Output as JSON
	stateJSON, err := json.MarshalIndent(workerState, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	fmt.Println(string(stateJSON))
	return nil
}
