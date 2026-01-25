package cmd

import (
	"fmt"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"

	"github.com/spf13/cobra"
)

var rotateLogsCmd = &cobra.Command{
	Use:   "rotate-logs",
	Short: "Trigger a log rotation check immediately",
	Long: `Trigger a rotation check for the agent and unified logs using the
current configuration. Useful for testing or manual rotation.`,
	RunE: rotateLogs,
}

func rotateLogs(cmd *cobra.Command, args []string) error {
	cfg := config.LoadLogRotationConfig()
	logs.RotateNow(cfg)
	fmt.Println("Rotation triggered")
	return nil
}
