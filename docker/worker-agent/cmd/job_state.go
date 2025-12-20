package cmd

import (
	"encoding/json"
	"fmt"
	"lombok-worker-agent/internal/state"

	"github.com/spf13/cobra"
)

var jobStateJobID string

var jobStateCmd = &cobra.Command{
	Use:   "job-state",
	Short: "Read the state for a specific job",
	Long:  `Read the state file for a specific job execution, including status, metadata, and timing information.`,
	RunE:  readJobState,
}

func init() {
	jobStateCmd.Flags().StringVar(&jobStateJobID, "job-id", "", "Job ID (required)")
	jobStateCmd.MarkFlagRequired("job-id")
}

func readJobState(cmd *cobra.Command, args []string) error {
	jobState, err := state.ReadJobState(jobStateJobID)
	if err != nil {
		return fmt.Errorf("failed to read job state: %w", err)
	}

	if jobState == nil {
		return fmt.Errorf("job state not found for job_id: %s", jobStateJobID)
	}

	// Output as JSON
	stateJSON, err := json.MarshalIndent(jobState, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	fmt.Println(string(stateJSON))
	return nil
}
