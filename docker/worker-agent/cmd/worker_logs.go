package cmd

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"lombok-worker-agent/internal/config"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/spf13/cobra"
)

const (
	workerLogsDefaultPollInterval = 2 * time.Second
	workerLogsEOFWait             = 250 * time.Millisecond
)

var (
	workerLogsPollInterval time.Duration
	workerLogsFromStart    bool
	workerLogsIdentifiers  string
	workerLogsIncludeAgent bool
)

var workerLogsCmd = &cobra.Command{
	Use:   "worker-logs",
	Short: "Tail all worker logs",
	Long: `Tail all worker stdout/stderr logs combined, following new log files as they are created.

By default, existing logs are tailed from the end while newly created logs are
tailed from the beginning so early output is not missed. Use --worker-identifiers to
restrict output to some workers.`,
	RunE: tailWorkerLogs,
}

func init() {
	workerLogsCmd.Flags().DurationVar(&workerLogsPollInterval, "poll-interval", workerLogsDefaultPollInterval, "How often to scan for new worker log files")
	workerLogsCmd.Flags().BoolVar(&workerLogsFromStart, "from-start", false, "Read existing log files from the beginning instead of the end")
	workerLogsCmd.Flags().StringVar(&workerLogsIdentifiers, "worker-identifiers", "", "Filter logs to a set of worker identifiers (comma-separated list)")
	workerLogsCmd.Flags().BoolVar(&workerLogsIncludeAgent, "include-agent", false, "Include agent logs with an [agent] prefix")
}

func tailWorkerLogs(cmd *cobra.Command, args []string) error {
	if workerLogsPollInterval <= 0 {
		workerLogsPollInterval = workerLogsDefaultPollInterval
	}

	if err := config.EnsureLogDirs(); err != nil {
		return fmt.Errorf("failed to ensure log directories: %w", err)
	}

	logDir := filepath.Join(config.LogBaseDir, "workers")
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	outputMutex := &sync.Mutex{}
	followed := make(map[string]struct{})

	startFollow := func(path string, startAtEnd bool, prefix string) {
		followed[path] = struct{}{}
		go followLogFile(ctx, path, startAtEnd, prefix, os.Stdout, outputMutex)
	}

	var filteredWorkerLogsIdentifiers []string = make([]string, 0, len(strings.Split(workerLogsIdentifiers, ",")))
	for _, id := range strings.Split(workerLogsIdentifiers, ",") {
		trimmed := strings.TrimSpace(id)
		if len(trimmed) > 0 {
			filteredWorkerLogsIdentifiers = append(filteredWorkerLogsIdentifiers, trimmed)
		}
	}

	existingLogs, err := listWorkerLogFiles(logDir, filteredWorkerLogsIdentifiers)
	if err != nil {
		return fmt.Errorf("failed to list worker log files: %w", err)
	}

	for _, path := range existingLogs {
		startFollow(path, !workerLogsFromStart, "")
	}

	if workerLogsIncludeAgent {
		startFollow(config.AgentLogPath(), !workerLogsFromStart, "")
	}

	ticker := time.NewTicker(workerLogsPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:

			logs, err := listWorkerLogFiles(logDir, filteredWorkerLogsIdentifiers)
			if err != nil {
				fmt.Fprintf(os.Stderr, "worker-logs: failed to scan log directory: %v\n", err)
				continue
			}
			for _, path := range logs {
				if _, seen := followed[path]; seen {
					continue
				}
				startFollow(path, false, "")
			}
		}
	}
}

func listWorkerLogFiles(dir string, identifiers []string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if len(identifiers) == 0 {
			files = append(files, filepath.Join(dir, name))
			continue
		}
		for _, identifier := range identifiers {
			if matchesWorkerLog(name, identifier) {
				files = append(files, filepath.Join(dir, name))
			}
		}
	}

	sort.Strings(files)
	return files, nil
}

func matchesWorkerLog(name string, identifier string) bool {
	if !strings.HasSuffix(name, ".log") {
		return false
	}
	if identifier == "" {
		return true
	}
	return name == identifier+".out.log" || name == identifier+".err.log"
}

func followLogFile(ctx context.Context, path string, startAtEnd bool, prefix string, output io.Writer, outputMutex *sync.Mutex) {
	file, err := os.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "worker-logs: failed to open %s: %v\n", path, err)
		return
	}
	defer file.Close()

	if startAtEnd {
		if _, err := file.Seek(0, io.SeekEnd); err != nil {
			fmt.Fprintf(os.Stderr, "worker-logs: failed to seek %s: %v\n", path, err)
			return
		}
	}

	reader := bufio.NewReader(file)
	offset, _ := file.Seek(0, io.SeekCurrent)
	needsPrefix := prefix != ""

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		rawLine, err := reader.ReadString('\n')
		if len(rawLine) > 0 {
			line := rawLine
			if prefix != "" && needsPrefix {
				line = prefix + line
			}
			outputMutex.Lock()
			_, _ = io.WriteString(output, line)
			outputMutex.Unlock()
			offset += int64(len(rawLine))
			needsPrefix = strings.HasSuffix(rawLine, "\n")
		}

		if err == nil {
			continue
		}

		if errors.Is(err, io.EOF) {
			resetIfTruncated(file, reader, &offset)
			if waitForContext(ctx, workerLogsEOFWait) {
				return
			}
			continue
		}

		fmt.Fprintf(os.Stderr, "worker-logs: stopped tailing %s: %v\n", path, err)
		return
	}
}

func resetIfTruncated(file *os.File, reader *bufio.Reader, offset *int64) {
	info, err := file.Stat()
	if err != nil {
		return
	}
	if info.Size() >= *offset {
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return
	}
	reader.Reset(file)
	*offset = 0
}

func waitForContext(ctx context.Context, wait time.Duration) bool {
	timer := time.NewTimer(wait)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return true
	case <-timer.C:
		return false
	}
}
