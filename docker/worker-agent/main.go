package main

import (
	"fmt"
	"os"

	"lombok-worker-agent/cmd"
	"lombok-worker-agent/internal/reaper"
)

func main() {
	// Set up automatic child reaping by handling SIGCHLD.
	reaper.SetupChildReaper()

	if err := cmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
