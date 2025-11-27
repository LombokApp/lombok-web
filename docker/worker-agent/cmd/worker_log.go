package cmd

import (
	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"

	"github.com/spf13/cobra"
)

var (
	workerLogJobClass string
	workerLogErr      bool
	workerLogTail     int
)

var workerLogCmd = &cobra.Command{
	Use:   "worker-log",
	Short: "Read worker logs for a job class",
	Long:  `Read stdout/stderr logs for a persistent worker process by job class.`,
	RunE:  readWorkerLog,
}

func init() {
	workerLogCmd.Flags().StringVar(&workerLogJobClass, "job-class", "", "Job class identifier (required)")
	workerLogCmd.Flags().BoolVar(&workerLogErr, "err", false, "Read stderr instead of stdout")
	workerLogCmd.Flags().IntVar(&workerLogTail, "tail", 0, "Number of lines to tail (0 = all)")
	workerLogCmd.MarkFlagRequired("job-class")
}

func readWorkerLog(cmd *cobra.Command, args []string) error {
	var logPath string
	if workerLogErr {
		logPath = config.WorkerErrLogPath(workerLogJobClass)
	} else {
		logPath = config.WorkerOutLogPath(workerLogJobClass)
	}

	return logs.ReadLogFile(logPath, logs.ReadOptions{
		Tail: workerLogTail,
	})
}
