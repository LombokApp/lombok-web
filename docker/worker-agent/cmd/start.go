package cmd

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/reaper"

	"github.com/spf13/cobra"
)

const (
	startEOFWait = 250 * time.Millisecond
)

type warmupSpec struct {
	Port    int
	Command []string
}

var startCmd = &cobra.Command{
	Use:                "start",
	Short:              "Start the agent and tail the unified log",
	Long:               "Start the agent, optionally warm up workers, and tail the unified log file containing agent, worker, and job logs.",
	RunE:               startAgent,
	DisableFlagParsing: true,
}

func init() {
	_ = startCmd.Flags().StringArray("warmup", nil, "Warm up a worker: --warmup <port> <command...> (repeatable)")
}

func startAgent(cmd *cobra.Command, args []string) error {
	for _, arg := range args {
		if arg == "-h" || arg == "--help" {
			return cmd.Help()
		}
	}

	warmups, err := parseStartArgs(args)
	if err != nil {
		return err
	}

	// Enable reaping unregistered zombies for the main start process
	reaper.EnableReapUnregisteredZombies()

	for _, warmup := range warmups {
		if err := launchWarmupSupervisor(warmup); err != nil {
			return err
		}
	}

	if err := config.EnsureLogDirs(); err != nil {
		return fmt.Errorf("failed to ensure log directories: %w", err)
	}

	logPath := config.UnifiedLogPath()
	if _, err := os.Stat(logPath); err != nil {
		if os.IsNotExist(err) {
			file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY, 0644)
			if err != nil {
				return fmt.Errorf("failed to create unified log file: %w", err)
			}
			file.Close()
		} else {
			return fmt.Errorf("failed to stat unified log file: %w", err)
		}
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	return followUnifiedLog(ctx, logPath, os.Stdout)
}

func followUnifiedLog(ctx context.Context, path string, output io.Writer) error {
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("start: failed to open %s: %w", path, err)
	}
	defer file.Close()

	if _, err := file.Seek(0, io.SeekEnd); err != nil {
		return fmt.Errorf("start: failed to seek %s: %w", path, err)
	}

	reader := bufio.NewReader(file)
	offset, _ := file.Seek(0, io.SeekCurrent)

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		rawLine, err := reader.ReadString('\n')
		if len(rawLine) > 0 {
			_, _ = io.WriteString(output, rawLine)
			offset += int64(len(rawLine))
		}

		if err == nil {
			continue
		}

		if errors.Is(err, io.EOF) {
			resetIfTruncated(file, reader, &offset)
			if waitForContext(ctx, startEOFWait) {
				return nil
			}
			continue
		}

		return fmt.Errorf("start: stopped tailing %s: %v", path, err)
	}
}

func resetIfTruncated(file *os.File, reader *bufio.Reader, offset *int64) {
	info, err := file.Stat()
	if err != nil {
		return
	}
	if info.Size() < *offset {
		if _, err := file.Seek(0, io.SeekStart); err != nil {
			return
		}
		reader.Reset(file)
		*offset = 0
	}
}

func waitForContext(ctx context.Context, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return true
	case <-timer.C:
		return false
	}
}

func parseStartArgs(args []string) ([]warmupSpec, error) {
	var warmups []warmupSpec

	for i := 0; i < len(args); {
		arg := args[i]
		switch arg {
		case "--warmup":
			if i+2 >= len(args) {
				return nil, fmt.Errorf("warmup requires a port and command")
			}
			port, err := strconv.Atoi(args[i+1])
			if err != nil || port <= 0 {
				return nil, fmt.Errorf("invalid warmup port %q", args[i+1])
			}
			i += 2
			startIdx := i
			for i < len(args) && args[i] != "--warmup" {
				i++
			}
			command := args[startIdx:i]
			if len(command) == 0 {
				return nil, fmt.Errorf("warmup for port %d requires a command", port)
			}
			warmups = append(warmups, warmupSpec{
				Port:    port,
				Command: command,
			})
		default:
			return nil, fmt.Errorf("unknown argument: %s", arg)
		}
	}

	return warmups, nil
}

func launchWarmupSupervisor(warmup warmupSpec) error {
	configPayload := workerSupervisorConfig{
		WorkerCommand: warmup.Command,
		Port:          warmup.Port,
	}
	configJSON, err := json.Marshal(configPayload)
	if err != nil {
		return fmt.Errorf("failed to marshal warmup config: %w", err)
	}
	configB64 := base64.StdEncoding.EncodeToString(configJSON)

	cmd := exec.Command(os.Args[0], "worker-supervisor", "--worker-config-base64", configB64)
	cmd.Env = os.Environ()

	logPath := config.AgentLogPath()
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open agent log for worker supervisor: %w", err)
	}
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return fmt.Errorf("failed to start worker supervisor for port %d: %w", warmup.Port, err)
	}

	pid := cmd.Process.Pid
	logFile.Close()

	logs.WriteAgentLog(logs.LogLevelInfo, "Launched worker warmup supervisor", map[string]any{
		"worker_command": warmup.Command,
		"worker_port":    warmup.Port,
		"pid":            pid,
	})

	return nil
}
