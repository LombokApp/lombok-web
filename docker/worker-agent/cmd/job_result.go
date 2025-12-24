package cmd

import (
	"encoding/json"
	"fmt"
	"lombok-worker-agent/internal/state"

	"github.com/spf13/cobra"
)

var jobResultJobID string

var jobResultCmd = &cobra.Command{
	Use:   "job-result",
	Short: "Read the result for a specific job",
	Long:  `Read the result file for a specific job execution, including success status, result data, errors, and timing information.`,
	RunE:  readJobResult,
}

func init() {
	jobResultCmd.Flags().StringVar(&jobResultJobID, "job-id", "", "Job ID (required)")
	jobResultCmd.MarkFlagRequired("job-id")
}

func readJobResult(cmd *cobra.Command, args []string) error {
	result, err := state.ReadJobResult(jobResultJobID)
	if err != nil {
		return fmt.Errorf("failed to read job result: %w", err)
	}

	if result == nil {
		return fmt.Errorf("job result not found for job_id: %s", jobResultJobID)
	}

	// Output as JSON
	resultJSON, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal result: %w", err)
	}

	fmt.Println(string(resultJSON))
	return nil
}
