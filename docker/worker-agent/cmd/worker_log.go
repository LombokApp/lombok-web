package cmd

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/types"

	"github.com/spf13/cobra"
)

var (
	workerLogJobConfigBase64 string
	workerLogErr             bool
	workerLogTail            int
)

var workerLogCmd = &cobra.Command{
	Use:   "worker-log",
	Short: "Read worker logs for a job config",
	Long:  `Read stdout/stderr logs for a persistent worker process by job config.`,
	RunE:  readWorkerLog,
}

func init() {
	workerLogCmd.Flags().StringVar(&workerLogJobConfigBase64, "job-config", "", "Job command and interface (required)")
	workerLogCmd.Flags().BoolVar(&workerLogErr, "err", false, "Read stderr instead of stdout")
	workerLogCmd.Flags().IntVar(&workerLogTail, "tail", 0, "Number of lines to tail (0 = all)")
	workerLogCmd.MarkFlagRequired("job-config")
}

func readWorkerLog(cmd *cobra.Command, args []string) error {
	// Decode the base64 payload
	payloadBytes, err := base64.StdEncoding.DecodeString(workerLogJobConfigBase64)
	if err != nil {
		return fmt.Errorf("failed to decode base64 payload: %w", err)
	}

	// Parse the JSON payload
	var payload types.JobConfigPayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return fmt.Errorf("failed to parse JSON payload: %w", err)
	}

	var logPath string
	if workerLogErr {
		logPath = config.WorkerErrLogPath(payload.WorkerCommand, payload.Interface)
	} else {
		logPath = config.WorkerOutLogPath(payload.WorkerCommand, payload.Interface)
	}

	return logs.ReadLogFile(logPath, logs.ReadOptions{
		Tail: workerLogTail,
	})
}
