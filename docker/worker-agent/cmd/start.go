package cmd

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"lombok-worker-agent/internal/config"
	"lombok-worker-agent/internal/logs"
	"lombok-worker-agent/internal/reaper"

	"github.com/spf13/cobra"
)

const (
	startEOFWait = 250 * time.Millisecond

	// Token refresh: check every 6 hours, refresh when less than 12 hours remain.
	tokenRefreshInterval     = 6 * time.Hour
	tokenRefreshInitialDelay = 30 * time.Second
	tokenRefreshThreshold    = 12 * time.Hour

	containerTokenEnvKey = "LOMBOK_CONTAINER_TOKEN"
	platformURLEnvKey    = "LOMBOK_PLATFORM_URL"
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

	if err := config.EnsureStateDirs(); err != nil {
		return fmt.Errorf("failed to ensure state directories: %w", err)
	}

	// Persist the provision secret for 'provision' command authentication.
	// Read from LOMBOK_PROVISION_SECRET env var (set by the platform at container creation).
	provisionSecret := os.Getenv("LOMBOK_PROVISION_SECRET")
	if provisionSecret != "" {
		if err := os.WriteFile(config.ProvisionSecretPath(), []byte(provisionSecret), 0600); err != nil {
			return fmt.Errorf("failed to write provision secret: %w", err)
		}
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

	go startTokenRefreshLoop(ctx)

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

// --- Token refresh ---

func startTokenRefreshLoop(ctx context.Context) {
	// Wait briefly to give provision time to inject the token.
	if waitForContext(ctx, tokenRefreshInitialDelay) {
		return
	}

	refreshTokenIfNeeded()

	ticker := time.NewTicker(tokenRefreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			refreshTokenIfNeeded()
		}
	}
}

func refreshTokenIfNeeded() {
	envPath := config.ProvisionEnvPath()

	data, err := os.ReadFile(envPath)
	if err != nil {
		if os.IsNotExist(err) {
			logs.WriteAgentLog(logs.LogLevelDebug, "Token refresh: provision.env not found yet, skipping", nil)
			return
		}
		logs.WriteAgentLog(logs.LogLevelError, "Token refresh: failed to read provision.env", map[string]any{"error": err.Error()})
		return
	}

	lines := strings.Split(string(data), "\n")
	tokenValue := ""
	tokenLineIdx := -1
	for i, line := range lines {
		if strings.HasPrefix(line, containerTokenEnvKey+"=") {
			tokenValue = strings.TrimPrefix(line, containerTokenEnvKey+"=")
			tokenLineIdx = i
			break
		}
	}

	if tokenValue == "" {
		logs.WriteAgentLog(logs.LogLevelDebug, "Token refresh: no container token found, skipping", nil)
		return
	}

	exp, err := getJWTExpiry(tokenValue)
	if err != nil {
		logs.WriteAgentLog(logs.LogLevelError, "Token refresh: failed to parse token expiry", map[string]any{"error": err.Error()})
		return
	}

	remaining := time.Until(exp)
	if remaining > tokenRefreshThreshold {
		logs.WriteAgentLog(logs.LogLevelDebug, "Token refresh: token still valid", map[string]any{
			"remaining_hours": fmt.Sprintf("%.1f", remaining.Hours()),
		})
		return
	}

	platformURL := resolvePlatformURL(lines)
	if platformURL == "" {
		logs.WriteAgentLog(logs.LogLevelError, "Token refresh: platform URL not available", nil)
		return
	}

	newToken, err := callTokenRefreshEndpoint(platformURL, tokenValue)
	if err != nil {
		logs.WriteAgentLog(logs.LogLevelError, "Token refresh: failed to refresh", map[string]any{"error": err.Error()})
		return
	}

	// Replace the token line and write back atomically.
	lines[tokenLineIdx] = containerTokenEnvKey + "=" + newToken
	newContent := strings.Join(lines, "\n")

	tmpPath := envPath + ".tmp"
	if err := os.WriteFile(tmpPath, []byte(newContent), 0600); err != nil {
		logs.WriteAgentLog(logs.LogLevelError, "Token refresh: failed to write temp file", map[string]any{"error": err.Error()})
		return
	}
	if err := os.Rename(tmpPath, envPath); err != nil {
		logs.WriteAgentLog(logs.LogLevelError, "Token refresh: failed to rename temp file", map[string]any{"error": err.Error()})
		return
	}

	logs.WriteAgentLog(logs.LogLevelInfo, "Token refresh: successfully refreshed container token", map[string]any{
		"old_remaining_hours": fmt.Sprintf("%.1f", remaining.Hours()),
	})
}

// getJWTExpiry decodes the payload segment of a JWT and returns the exp claim.
func getJWTExpiry(token string) (time.Time, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return time.Time{}, fmt.Errorf("invalid JWT format: expected 3 parts, got %d", len(parts))
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to decode JWT payload: %w", err)
	}

	var claims struct {
		Exp int64 `json:"exp"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return time.Time{}, fmt.Errorf("failed to parse JWT claims: %w", err)
	}

	if claims.Exp == 0 {
		return time.Time{}, fmt.Errorf("JWT has no exp claim")
	}

	return time.Unix(claims.Exp, 0), nil
}

// resolvePlatformURL reads the platform URL from the process env or provision.env lines.
func resolvePlatformURL(envLines []string) string {
	if v := os.Getenv(platformURLEnvKey); v != "" {
		return v
	}
	for _, line := range envLines {
		if strings.HasPrefix(line, platformURLEnvKey+"=") {
			return strings.TrimPrefix(line, platformURLEnvKey+"=")
		}
	}
	return ""
}

func callTokenRefreshEndpoint(platformURL, token string) (string, error) {
	url := strings.TrimRight(platformURL, "/") + "/api/v1/docker/refresh-container-token"

	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("refresh returned status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Token == "" {
		return "", fmt.Errorf("refresh returned empty token")
	}

	return result.Token, nil
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
