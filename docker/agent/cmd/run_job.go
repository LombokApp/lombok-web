package cmd

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"

	"platform-agent/internal/runner"
	"platform-agent/internal/types"

	"github.com/spf13/cobra"
)

var payloadBase64 string

var runJobCmd = &cobra.Command{
	Use:   "run-job",
	Short: "Execute a job in a worker process",
	Long: `Run a job by decoding the base64-encoded payload and dispatching it
to the appropriate worker based on the interface configuration.

For exec_per_job: spawns a new worker process for this job.
For persistent_http: ensures a persistent worker is running and POSTs the job to it.`,
	RunE: runJob,
}

func init() {
	runJobCmd.Flags().StringVar(&payloadBase64, "payload-base64", "", "Base64-encoded JSON job payload (required)")
	runJobCmd.MarkFlagRequired("payload-base64")
}

func runJob(cmd *cobra.Command, args []string) error {
	// Decode the base64 payload
	payloadBytes, err := base64.StdEncoding.DecodeString(payloadBase64)
	if err != nil {
		return fmt.Errorf("failed to decode base64 payload: %w", err)
	}

	// Parse the JSON payload
	var payload types.JobPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return fmt.Errorf("failed to parse JSON payload: %w", err)
	}

	// Log basic info
	fmt.Fprintf(os.Stderr, "[platform-agent] job_id=%s job_class=%s interface=%s\n",
		payload.JobID, payload.JobClass, payload.Interface.Kind)

	// Dispatch based on interface kind
	switch payload.Interface.Kind {
	case "exec_per_job":
		return runner.RunExecPerJob(&payload)
	case "persistent_http":
		return runner.RunPersistentHTTP(&payload)
	default:
		return fmt.Errorf("unknown interface kind: %s", payload.Interface.Kind)
	}
}
