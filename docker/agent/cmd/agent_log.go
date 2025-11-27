package cmd

import (
	"platform-agent/internal/config"
	"platform-agent/internal/logs"

	"github.com/spf13/cobra"
)

var (
	agentLogTail int
	agentLogGrep string
)

var agentLogCmd = &cobra.Command{
	Use:   "agent-log",
	Short: "Read agent logs",
	Long:  `Read the platform-agent's own log files with optional filtering.`,
	RunE:  readAgentLog,
}

func init() {
	agentLogCmd.Flags().IntVar(&agentLogTail, "tail", 0, "Number of lines to tail (0 = all)")
	agentLogCmd.Flags().StringVar(&agentLogGrep, "grep", "", "Filter lines containing this pattern")
}

func readAgentLog(cmd *cobra.Command, args []string) error {
	logPath := config.AgentLogPath()
	return logs.ReadLogFile(logPath, logs.ReadOptions{
		Tail: agentLogTail,
		Grep: agentLogGrep,
	})
}
