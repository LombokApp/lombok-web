package cmd

import (
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"docker-bridge-tunnel-agent/internal/config"
	"docker-bridge-tunnel-agent/internal/health"
	"docker-bridge-tunnel-agent/internal/transport"
	"docker-bridge-tunnel-agent/internal/tunnel"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "tunnel-agent",
	Short: "Stdin/stdout tunnel agent for Docker containers",
	Long: `tunnel-agent reads framed messages from stdin, proxies HTTP and WebSocket
traffic to local dev server ports, and writes framed responses to stdout.
It is invoked as a Docker exec process by the bridge service.`,
	RunE: runAgent,
}

// Execute runs the root command.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.Flags().StringSlice("ports", nil, "Comma-separated list of local ports to proxy (required)")
	rootCmd.Flags().String("log-level", "info", "Log level: debug, info, warn, error")
	rootCmd.Flags().Duration("proxy-timeout", 30*time.Second, "HTTP proxy timeout")
	rootCmd.Flags().Int("max-body-chunk", 1048576, "Max body chunk size in bytes (default 1MB)")
	rootCmd.Flags().Int("health-port", 9091, "Health endpoint port (loopback only)")
	_ = rootCmd.MarkFlagRequired("ports")
}

func runAgent(cmd *cobra.Command, args []string) error {
	// CRITICAL: Redirect all log output to stderr. Stdout is reserved for the protocol.
	log.SetOutput(os.Stderr)

	portsStr, _ := cmd.Flags().GetStringSlice("ports")
	logLevel, _ := cmd.Flags().GetString("log-level")
	proxyTimeout, _ := cmd.Flags().GetDuration("proxy-timeout")
	maxBodyChunk, _ := cmd.Flags().GetInt("max-body-chunk")
	healthPort, _ := cmd.Flags().GetInt("health-port")

	// Parse ports from string slice to int slice.
	ports, err := config.ParsePorts(portsStr)
	if err != nil {
		return fmt.Errorf("invalid ports: %w", err)
	}

	cfg := &config.Config{
		Ports:            ports,
		LogLevel:         logLevel,
		ProxyTimeout:     proxyTimeout,
		MaxBodyChunkSize: int64(maxBodyChunk),
		HealthPort:       healthPort,
	}

	initLogger(cfg.LogLevel)

	// Create context that cancels on SIGTERM or SIGINT (graceful shutdown).
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	slog.Info("tunnel-agent starting",
		"ports", cfg.Ports,
		"proxy_timeout", cfg.ProxyTimeout,
		"max_body_chunk", cfg.MaxBodyChunkSize,
	)

	tr := transport.NewStdioTransport()
	agent := tunnel.NewAgent(cfg, tr)

	// Start health endpoint (loopback only).
	go func() {
		if err := health.StartHealthServer(ctx, cfg.HealthPort, agent); err != nil {
			slog.Warn("health server error", "error", err)
		}
	}()

	if err := agent.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		return fmt.Errorf("agent exited: %w", err)
	}

	slog.Info("tunnel-agent shutting down")
	return nil
}

// initLogger initializes the default structured JSON logger writing to stderr.
func initLogger(levelStr string) {
	var level slog.Level
	switch strings.ToLower(levelStr) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	programLevel := new(slog.LevelVar)
	programLevel.Set(level)

	// CRITICAL: Logger writes to stderr, not stdout. Stdout is reserved for the protocol.
	h := slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: programLevel})
	slog.SetDefault(slog.New(h))
}
