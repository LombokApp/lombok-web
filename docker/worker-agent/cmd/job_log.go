package cmd

import (
	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"

	"github.com/spf13/cobra"
)

var (
	jobLogJobID string
	jobLogTail  int
)

var jobLogCmd = &cobra.Command{
	Use:   "job-log",
	Short: "Read logs for a specific job",
	Long:  `Read structured logs for a specific job execution.`,
	RunE:  readJobLog,
}

func init() {
	jobLogCmd.Flags().StringVar(&jobLogJobID, "job-id", "", "Job ID (required)")
	jobLogCmd.Flags().IntVar(&jobLogTail, "tail", 0, "Number of lines to tail (0 = all)")
	jobLogCmd.MarkFlagRequired("job-id")
}

func readJobLog(cmd *cobra.Command, args []string) error {
	logPath := config.JobLogPath(jobLogJobID)

	return logs.ReadLogFile(logPath, logs.ReadOptions{
		Tail: jobLogTail,
	})
}
