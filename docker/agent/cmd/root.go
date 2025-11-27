package cmd

import (
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "lombok-worker-agent",
	Short: "Platform agent for managing worker processes in Docker containers",
	Long: `Platform agent is a lightweight process manager that runs inside Docker containers.
It handles job dispatch to worker processes, manages worker lifecycle, and provides
log access for the platform.`,
}

// Execute runs the root command
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	// Sub-commands are registered in their respective files
	rootCmd.AddCommand(runJobCmd)
	rootCmd.AddCommand(agentLogCmd)
	rootCmd.AddCommand(workerLogCmd)
	rootCmd.AddCommand(jobLogCmd)
}
