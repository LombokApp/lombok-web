package main

import (
	"fmt"
	"os"

	"docker-bridge-tunnel-agent/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
