package cmd

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"

	"github.com/spf13/cobra"
)

var (
	processLogTail   int
	processLogGrep   string
	processLogFollow bool
)

var processLogCmd = &cobra.Command{
	Use:   "process-log",
	Short: "Read the secondary process log",
	Long: `Read Docker-engine-compatible JSON log entries written by JavaScript processes.
These logs are written to a dedicated file separate from the main worker-agent
stdout, which is reserved for the job protocol.

Use --follow to tail the log in real time (like 'docker logs -f').`,
	RunE: readProcessLog,
}

func init() {
	processLogCmd.Flags().IntVar(&processLogTail, "tail", 0, "Number of lines to tail (0 = all)")
	processLogCmd.Flags().StringVar(&processLogGrep, "grep", "", "Filter lines containing this pattern")
	processLogCmd.Flags().BoolVarP(&processLogFollow, "follow", "f", false, "Follow log output (like tail -f)")
}

func readProcessLog(cmd *cobra.Command, args []string) error {
	logPath := config.ProcessLogPath()

	if !processLogFollow {
		return logs.ReadLogFile(logPath, logs.ReadOptions{
			Tail: processLogTail,
			Grep: processLogGrep,
		})
	}

	// --follow mode: print existing lines then tail
	return followProcessLog(logPath)
}

const processLogPollInterval = 250 * time.Millisecond

func followProcessLog(path string) error {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// Wait for the file to exist if it doesn't yet.
	for {
		if _, err := os.Stat(path); err == nil {
			break
		}
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(processLogPollInterval):
		}
	}

	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("failed to open process log: %w", err)
	}
	defer file.Close()

	// If --tail is set, skip to the appropriate position first.
	if processLogTail > 0 {
		if err := printTailAndSeekEnd(file, processLogTail); err != nil {
			return err
		}
	} else {
		// Print all existing content, then follow.
		if _, err := io.Copy(os.Stdout, file); err != nil {
			return fmt.Errorf("failed to read process log: %w", err)
		}
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
			if processLogGrep == "" || strings.Contains(rawLine, processLogGrep) {
				_, _ = io.WriteString(os.Stdout, rawLine)
			}
			offset += int64(len(rawLine))
		}

		if err == nil {
			continue
		}

		if errors.Is(err, io.EOF) {
			// Check for file truncation (e.g. log rotation).
			info, statErr := file.Stat()
			if statErr == nil && info.Size() < offset {
				if _, seekErr := file.Seek(0, io.SeekStart); seekErr == nil {
					reader.Reset(file)
					offset = 0
				}
			}
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(processLogPollInterval):
			}
			continue
		}

		return fmt.Errorf("process-log: stopped following: %w", err)
	}
}

// printTailAndSeekEnd prints the last N lines then leaves the file cursor at the end.
func printTailAndSeekEnd(file *os.File, n int) error {
	var lines []string
	reader := bufio.NewReader(file)

	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			if processLogGrep == "" || strings.Contains(line, processLogGrep) {
				lines = append(lines, line)
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return fmt.Errorf("failed to read process log: %w", err)
		}
	}

	start := 0
	if len(lines) > n {
		start = len(lines) - n
	}
	for i := start; i < len(lines); i++ {
		_, _ = io.WriteString(os.Stdout, lines[i])
	}

	return nil
}
