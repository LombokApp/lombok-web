package cmd

import (
	"platform-agent/internal/config"
	"platform-agent/internal/logs"

	"github.com/spf13/cobra"
)

var (
	jobLogJobID string
	jobLogErr   bool
	jobLogTail  int
)

var jobLogCmd = &cobra.Command{
	Use:   "job-log",
	Short: "Read logs for a specific job",
	Long:  `Read stdout/stderr logs for a specific job execution.`,
	RunE:  readJobLog,
}

func init() {
	jobLogCmd.Flags().StringVar(&jobLogJobID, "job-id", "", "Job ID (required)")
	jobLogCmd.Flags().BoolVar(&jobLogErr, "err", false, "Read stderr instead of stdout")
	jobLogCmd.Flags().IntVar(&jobLogTail, "tail", 0, "Number of lines to tail (0 = all)")
	jobLogCmd.MarkFlagRequired("job-id")
}

func readJobLog(cmd *cobra.Command, args []string) error {
	var logPath string
	if jobLogErr {
		logPath = config.JobErrLogPath(jobLogJobID)
	} else {
		logPath = config.JobOutLogPath(jobLogJobID)
	}

	return logs.ReadLogFile(logPath, logs.ReadOptions{
		Tail: jobLogTail,
	})
}
