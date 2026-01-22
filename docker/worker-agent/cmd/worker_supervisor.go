package cmd

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"syscall"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/state"
	"lombok-worker-agent/internal/types"

	"github.com/spf13/cobra"
)

var workerSupervisorConfigBase64 string

type workerSupervisorConfig struct {
	WorkerCommand []string `json:"worker_command"`
	Port          int      `json:"port"`
}

const (
	supervisorReadinessTimeout  = 180 * time.Second
	supervisorReadinessPollWait = 500 * time.Millisecond
)

var workerSupervisorCmd = &cobra.Command{
	Use:   "worker-supervisor",
	Short: "Run a persistent worker and relay logs",
	RunE:  runWorkerSupervisor,
}

func init() {
	workerSupervisorCmd.Flags().StringVar(&workerSupervisorConfigBase64, "worker-config-base64", "", "Base64-encoded JSON worker config (required)")
	workerSupervisorCmd.MarkFlagRequired("worker-config-base64")
}

func runWorkerSupervisor(cmd *cobra.Command, args []string) error {
	configBytes, err := base64.StdEncoding.DecodeString(workerSupervisorConfigBase64)
	if err != nil {
		return fmt.Errorf("failed to decode worker config: %w", err)
	}

	var configPayload workerSupervisorConfig
	if err := json.Unmarshal(configBytes, &configPayload); err != nil {
		return fmt.Errorf("failed to parse worker config: %w", err)
	}

	if err := config.EnsureAllDirs(); err != nil {
		return fmt.Errorf("failed to ensure directories: %w", err)
	}

	if len(configPayload.WorkerCommand) == 0 {
		return fmt.Errorf("worker_command is empty")
	}

	if configPayload.Port <= 0 {
		return fmt.Errorf("worker port is required")
	}

	releaseLock, err := state.AcquireWorkerStartLock(configPayload.Port, supervisorReadinessTimeout)
	if err != nil {
		alive, _, aliveErr := state.IsWorkerAlive(configPayload.Port)
		if aliveErr == nil && alive {
			return nil
		}
		return fmt.Errorf("failed to acquire worker start lock: %w", err)
	}
	releaseLockOnce := func() {
		if releaseLock != nil {
			_ = releaseLock()
			releaseLock = nil
		}
	}
	defer releaseLockOnce()

	alive, _, err := state.IsWorkerAlive(configPayload.Port)
	if err == nil && alive {
		releaseLockOnce()
		return nil
	}

	var cmdExec *exec.Cmd
	if len(configPayload.WorkerCommand) > 1 {
		cmdExec = exec.Command(configPayload.WorkerCommand[0], configPayload.WorkerCommand[1:]...)
	} else {
		cmdExec = exec.Command(configPayload.WorkerCommand[0])
	}
	cmdExec.Env = os.Environ()

	logPath := config.WorkerLogPath(configPayload.Port)
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open worker log: %w", err)
	}

	stdoutInterceptor := newPersistentWorkerLogInterceptor(configPayload.Port, logFile, logs.LogLevelInfo)
	stderrInterceptor := newPersistentWorkerLogInterceptor(configPayload.Port, logFile, logs.LogLevelError)

	cmdExec.Stdout = stdoutInterceptor
	cmdExec.Stderr = stderrInterceptor

	workerStartTime := time.Now()
	if err := cmdExec.Start(); err != nil {
		stdoutInterceptor.Close()
		stderrInterceptor.Close()
		logFile.Close()
		return fmt.Errorf("failed to start worker: %w", err)
	}

	time.Sleep(500 * time.Millisecond)
	if !state.IsProcessAlive(cmdExec.Process.Pid) {
		stdoutInterceptor.Close()
		stderrInterceptor.Close()
		logFile.Close()
		return fmt.Errorf("worker process exited immediately after start (check logs: %s)", logPath)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	workerState := &types.WorkerState{
		Kind:          "persistent_http",
		WorkerCommand: configPayload.WorkerCommand,
		PID:           cmdExec.Process.Pid,
		Status:        "starting",
		Port:          configPayload.Port,
		StartedAt:     now,
		LastCheckedAt: now,
		AgentVersion:  config.AgentVersion,
	}

	if err := state.WriteWorkerState(workerState); err != nil {
		stdoutInterceptor.Close()
		stderrInterceptor.Close()
		logFile.Close()
		return fmt.Errorf("failed to write worker state: %w", err)
	}

	readySucceeded := false
	if configPayload.Port > 0 {
		if err := waitForWorkerReady(configPayload.Port, supervisorReadinessTimeout); err != nil {
			workerState.Status = "unhealthy"
			workerState.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
			if writeErr := state.WriteWorkerState(workerState); writeErr != nil {
				logs.WriteAgentLog(logs.LogLevelWarn, "Failed to update worker state after readiness timeout", map[string]any{
					"error": writeErr.Error(),
				})
			}
			logs.WriteAgentLog(logs.LogLevelWarn, "Worker did not become ready", map[string]any{
				"command": configPayload.WorkerCommand,
				"port":    configPayload.Port,
				"error":   err.Error(),
			})
		} else {
			readyDuration := time.Since(workerStartTime)
			workerState.Status = "ready"
			workerState.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
			if writeErr := state.WriteWorkerState(workerState); writeErr != nil {
				logs.WriteAgentLog(logs.LogLevelWarn, "Failed to update worker state after readiness", map[string]any{
					"error": writeErr.Error(),
				})
			}
			logs.WriteAgentLog(logs.LogLevelInfo, "Worker ready", map[string]any{
				"worker_entrypoint": strings.Join(configPayload.WorkerCommand, " "),
				"worker_port":       configPayload.Port,
				"worker_ready_time": readyDuration.Seconds(),
			})
			readySucceeded = true
		}
	} else {
		logs.WriteAgentLog(logs.LogLevelWarn, "Worker readiness check skipped (missing port)", map[string]any{
			"command": configPayload.WorkerCommand,
			"port":    configPayload.Port,
		})
	}
	if readySucceeded {
		releaseLockOnce()
	}

	err = cmdExec.Wait()
	exitCode := 0
	exitSignal := ""
	if cmdExec.ProcessState != nil {
		exitCode = cmdExec.ProcessState.ExitCode()
		if status, ok := cmdExec.ProcessState.Sys().(syscall.WaitStatus); ok && status.Signaled() {
			exitSignal = status.Signal().String()
		}
	}
	logData := map[string]any{
		"command":   configPayload.WorkerCommand,
		"port":      configPayload.Port,
		"pid":       cmdExec.Process.Pid,
		"exit_code": exitCode,
	}
	if exitSignal != "" {
		logData["signal"] = exitSignal
	}
	if err != nil {
		logData["error"] = err.Error()
		logs.WriteAgentLog(logs.LogLevelWarn, "Worker process exited", logData)
	} else {
		logs.WriteAgentLog(logs.LogLevelInfo, "Worker process exited", logData)
	}
	stdoutInterceptor.Close()
	stderrInterceptor.Close()
	logFile.Close()

	workerState.Status = "stopped"
	workerState.LastCheckedAt = time.Now().UTC().Format(time.RFC3339)
	_ = state.WriteWorkerState(workerState)

	if err != nil {
		return fmt.Errorf("worker process exited with error: %w", err)
	}
	return nil
}

func waitForWorkerReady(port int, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		if checkWorkerReady(port) {
			return nil
		}
		time.Sleep(supervisorReadinessPollWait)
	}

	return fmt.Errorf("worker did not become ready within %s", timeout)
}

func checkWorkerReady(port int) bool {
	client := &http.Client{Timeout: 5 * time.Second}
	endpoint := buildBaseURL(port) + "/health/ready"

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return false
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func buildBaseURL(port int) string {
	return fmt.Sprintf("http://127.0.0.1:%d", port)
}

type persistentWorkerLogInterceptor struct {
	port          int
	workerLogFile *os.File
	defaultLevel  logs.LogLevel
	jobLogFiles   map[string]*os.File
	mu            sync.Mutex
	buffer        []byte
}

func newPersistentWorkerLogInterceptor(port int, workerLogFile *os.File, defaultLevel logs.LogLevel) *persistentWorkerLogInterceptor {
	return &persistentWorkerLogInterceptor{
		port:          port,
		workerLogFile: workerLogFile,
		defaultLevel:  defaultLevel,
		jobLogFiles:   make(map[string]*os.File),
		buffer:        make([]byte, 0, 4096),
	}
}

func (w *persistentWorkerLogInterceptor) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	w.buffer = append(w.buffer, p...)

	var lines []string
	for {
		newlineIdx := bytes.IndexByte(w.buffer, '\n')
		if newlineIdx == -1 {
			break
		}

		line := w.buffer[:newlineIdx+1]
		w.buffer = w.buffer[newlineIdx+1:]
		lines = append(lines, strings.TrimSuffix(string(line), "\n"))
	}
	w.mu.Unlock()

	for _, line := range lines {
		w.processLine(line)
	}

	return len(p), nil
}

func (w *persistentWorkerLogInterceptor) processLine(line string) {
	jobID, level, message, data, ok := parsePersistentWorkerLogLine(line)
	if ok {
		w.mu.Lock()
		jobLogFile, err := w.getOrCreateJobLogFile(jobID)
		w.mu.Unlock()

		if err != nil {
			return
		}

		if err := logs.WriteJobLog(jobLogFile, jobID, level, message, data); err != nil {
			logs.WriteAgentLog(logs.LogLevelWarn, "Failed to write job log", map[string]any{
				"job_id": jobID,
				"error":  err.Error(),
			})
		}
		return
	}

	w.mu.Lock()
	workerLogFile := w.workerLogFile
	w.mu.Unlock()
	if workerLogFile != nil {
		_, _ = io.WriteString(workerLogFile, line+"\n")
	}

	logs.WriteUnifiedWorkerLog(w.port, line, w.defaultLevel)
}

func parsePersistentWorkerLogLine(line string) (string, logs.LogLevel, string, any, bool) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return "", "", "", nil, false
	}

	prefix := "JOB_ID_"
	rest := ""
	if strings.HasPrefix(trimmed, prefix) {
		rest = trimmed[len(prefix):]
	}
	if rest == "" {
		return "", "", "", nil, false
	}

	parts := strings.SplitN(rest, "|", 3)
	if len(parts) != 3 {
		return "", "", "", nil, false
	}

	jobID := strings.TrimSpace(parts[0])
	levelStr := strings.TrimSpace(parts[1])
	jsonPart := strings.TrimSpace(parts[2])

	if jobID == "" {
		return "", "", "", nil, false
	}

	level := logs.LogLevel(levelStr)
	validLevels := []logs.LogLevel{
		logs.LogLevelTrace,
		logs.LogLevelDebug,
		logs.LogLevelInfo,
		logs.LogLevelWarn,
		logs.LogLevelError,
		logs.LogLevelFatal,
	}
	valid := false
	for _, validLevel := range validLevels {
		if level == validLevel {
			valid = true
			break
		}
	}
	if !valid {
		return "", "", "", nil, false
	}

	var logArray []any
	if err := json.Unmarshal([]byte(jsonPart), &logArray); err != nil {
		return "", "", "", nil, false
	}

	if len(logArray) == 0 {
		return "", "", "", nil, false
	}

	message, ok := logArray[0].(string)
	if !ok {
		return "", "", "", nil, false
	}

	var data any
	if len(logArray) > 1 {
		data = logArray[1]
	}

	return jobID, level, message, data, true
}

func (w *persistentWorkerLogInterceptor) getOrCreateJobLogFile(jobID string) (*os.File, error) {
	if file, exists := w.jobLogFiles[jobID]; exists {
		return file, nil
	}

	jobLogPath := config.JobLogPath(jobID)
	file, err := os.OpenFile(jobLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open job log file for %s: %w", jobID, err)
	}

	w.jobLogFiles[jobID] = file
	return file, nil
}

func (w *persistentWorkerLogInterceptor) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	var firstErr error
	for jobID, file := range w.jobLogFiles {
		if err := file.Close(); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("failed to close job log file for %s: %w", jobID, err)
		}
		delete(w.jobLogFiles, jobID)
	}

	return firstErr
}
