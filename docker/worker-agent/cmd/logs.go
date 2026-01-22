package cmd

import (
	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"

	"github.com/spf13/cobra"
)

var (
	logsTail int
)

var logsCmd = &cobra.Command{
	Use:   "logs",
	Short: "Read the unified logs",
	Long:  `Read structured logs for workers, agents and jobs.`,
	RunE:  readLogs,
}

func init() {
	logsCmd.Flags().IntVar(&logsTail, "tail", 0, "Number of lines to tail (0 = all)")
}

func readLogs(cmd *cobra.Command, args []string) error {
	logPath := config.UnifiedLogPath()

	return logs.ReadLogFile(logPath, logs.ReadOptions{
		Tail: logsTail,
	})
}
