package cmd

import (
	"fmt"
	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"

	"github.com/spf13/cobra"
)

var (
	workerLogPort int
	workerLogTail int
)

var workerLogCmd = &cobra.Command{
	Use:   "worker-log",
	Short: "Read worker logs for a port",
	Long:  `Read structured worker logs for a persistent worker process by port.`,
	RunE:  readWorkerLog,
}

func init() {
	workerLogCmd.Flags().IntVar(&workerLogPort, "port", 0, "Worker port (required)")
	workerLogCmd.Flags().IntVar(&workerLogTail, "tail", 0, "Number of lines to tail (0 = all)")
	workerLogCmd.MarkFlagRequired("port")
}

func readWorkerLog(cmd *cobra.Command, args []string) error {
	if workerLogPort <= 0 {
		return fmt.Errorf("worker port is required")
	}

	return logs.ReadLogFile(config.UnifiedLogPath(), logs.ReadOptions{
		Tail: workerLogTail,
		Grep: fmt.Sprintf("|WORKER_%d|", workerLogPort),
	})
}
