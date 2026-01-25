package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/state"
	"lombok-worker-agent/internal/types"

	"github.com/spf13/cobra"
)

var purgeJobsOlderThan string

var purgeJobsCmd = &cobra.Command{
	Use:   "purge-jobs",
	Short: "Purge job files for completed jobs older than a threshold",
	Long: `Purge job state, result, log, and output files for jobs that have finished
(success or failure) before the provided "time ago" threshold.`,
	RunE: purgeJobs,
}

func init() {
	purgeJobsCmd.Flags().StringVar(&purgeJobsOlderThan, "older-than", "6h", "Purge jobs completed before this duration (e.g., 6h, 24h)")
}

func purgeJobs(cmd *cobra.Command, args []string) error {
	olderThan, err := time.ParseDuration(purgeJobsOlderThan)
	if err != nil {
		return fmt.Errorf("invalid duration for --older-than: %w", err)
	}
	if olderThan <= 0 {
		return fmt.Errorf("--older-than must be greater than 0")
	}

	cutoff := time.Now().UTC().Add(-olderThan)
	jobsDir := filepath.Join(config.StateBaseDir, "jobs")

	entries, err := os.ReadDir(jobsDir)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Println("No job state directory found.")
			return nil
		}
		return fmt.Errorf("failed to read job state directory: %w", err)
	}

	var purged int
	var errors []error

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if !strings.HasSuffix(name, ".json") || strings.HasSuffix(name, ".result.json") {
			continue
		}

		jobID := strings.TrimSuffix(name, ".json")
		if jobID == "" {
			continue
		}

		jobState, err := state.ReadJobState(jobID)
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to read job state %s: %w", jobID, err))
			continue
		}
		if jobState == nil {
			continue
		}
		if !isJobFinished(jobState) {
			continue
		}

		finishedAt, ok := parseCompletionTime(jobState.CompletedAt)
		if !ok {
			info, infoErr := entry.Info()
			if infoErr != nil {
				errors = append(errors, fmt.Errorf("failed to read job state file info %s: %w", jobID, infoErr))
				continue
			}
			finishedAt = info.ModTime()
		}

		if finishedAt.After(cutoff) {
			continue
		}

		if err := purgeJobFiles(jobID); err != nil {
			errors = append(errors, fmt.Errorf("failed to purge job %s: %w", jobID, err))
			continue
		}

		purged++
	}

	fmt.Printf("Purged %d job(s) completed before %s.\n", purged, cutoff.Format(time.RFC3339))

	if len(errors) > 0 {
		return fmt.Errorf("purge completed with %d error(s); first error: %w", len(errors), errors[0])
	}

	return nil
}

func isJobFinished(jobState *types.JobState) bool {
	return jobState.Status == "success" || jobState.Status == "failed"
}

func parseCompletionTime(value string) (time.Time, bool) {
	if value == "" {
		return time.Time{}, false
	}
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed, true
	}
	if parsed, err := time.Parse(time.RFC3339Nano, value); err == nil {
		return parsed, true
	}
	return time.Time{}, false
}

func purgeJobFiles(jobID string) error {
	outputDir := config.JobOutputDir(jobID)
	jobDir := filepath.Dir(outputDir)

	paths := []string{
		config.JobStatePath(jobID),
		config.JobResultPath(jobID),
		config.JobLogPath(jobID),
		config.JobOutLogPath(jobID),
		config.JobErrLogPath(jobID),
	}

	for _, path := range paths {
		if err := removeFileIfExists(path); err != nil {
			return err
		}
	}

	if err := removeDirIfExists(outputDir); err != nil {
		return err
	}

	if err := removeDirIfExists(jobDir); err != nil {
		return err
	}

	if err := removeWorkerJobLinks(jobID); err != nil {
		return err
	}

	logs.WriteAgentLog(logs.LogLevelInfo, "Purged job files", map[string]any{
		"job_id": jobID,
	})
	return nil
}

func removeFileIfExists(path string) error {
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func removeDirIfExists(path string) error {
	if err := os.RemoveAll(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func removeWorkerJobLinks(jobID string) error {
	baseDir := config.WorkerJobsBaseDir()
	entries, err := os.ReadDir(baseDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	linkName := fmt.Sprintf("%s.json", jobID)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		linkPath := filepath.Join(baseDir, entry.Name(), linkName)
		if err := removeFileIfExists(linkPath); err != nil {
			return err
		}
	}

	return nil
}
