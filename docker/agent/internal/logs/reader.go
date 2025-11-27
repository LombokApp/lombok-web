package logs

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strings"
)

// ReadOptions configures how to read log files
type ReadOptions struct {
	Tail int    // Number of lines from the end (0 = all)
	Grep string // Filter pattern (empty = no filter)
}

// ReadLogFile reads a log file with optional tail and grep filtering
func ReadLogFile(path string, opts ReadOptions) error {
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("log file not found: %s", path)
		}
		return fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	// If we need to tail, we need to read all lines first
	if opts.Tail > 0 {
		return readWithTail(file, opts)
	}

	// Otherwise, stream and filter
	return readAndFilter(file, opts.Grep)
}

// readWithTail reads the file and outputs the last N lines
func readWithTail(file *os.File, opts ReadOptions) error {
	var lines []string
	scanner := bufio.NewScanner(file)

	// Read all lines, applying grep filter if specified
	for scanner.Scan() {
		line := scanner.Text()
		if opts.Grep == "" || strings.Contains(line, opts.Grep) {
			lines = append(lines, line)
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading log file: %w", err)
	}

	// Output the last N lines
	start := 0
	if len(lines) > opts.Tail {
		start = len(lines) - opts.Tail
	}

	for i := start; i < len(lines); i++ {
		fmt.Println(lines[i])
	}

	return nil
}

// readAndFilter streams the file, filtering by grep pattern
func readAndFilter(file *os.File, grep string) error {
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		if grep == "" || strings.Contains(line, grep) {
			fmt.Println(line)
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading log file: %w", err)
	}

	return nil
}

// CatLogFile simply outputs the entire log file to stdout
func CatLogFile(path string) error {
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("log file not found: %s", path)
		}
		return fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	_, err = io.Copy(os.Stdout, file)
	return err
}
