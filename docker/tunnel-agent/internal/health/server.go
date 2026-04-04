package health

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"
)

// AgentStatus is the interface used by the health server to query the agent's
// current state. It is satisfied by *tunnel.Agent.
type AgentStatus interface {
	IsRunning() bool
	Uptime() time.Duration
	ActiveStreams() int
}

// healthResponse is the JSON body returned by GET /healthz.
type healthResponse struct {
	Status        string  `json:"status"`
	UptimeSeconds float64 `json:"uptime_seconds"`
	ActiveStreams  int     `json:"active_streams"`
}

// StartHealthServer listens on 127.0.0.1:{port} and serves GET /healthz.
// It shuts down gracefully when ctx is cancelled.
func StartHealthServer(ctx context.Context, port int, status AgentStatus) error {
	addr := fmt.Sprintf("127.0.0.1:%d", port)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		statusStr := "stopped"
		if status.IsRunning() {
			statusStr = "running"
		}

		resp := healthResponse{
			Status:        statusStr,
			UptimeSeconds: status.Uptime().Seconds(),
			ActiveStreams:  status.ActiveStreams(),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			slog.Warn("health: failed to encode response", "error", err)
		}
	})

	srv := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("health: listen %s: %w", addr, err)
	}

	slog.Info("health endpoint started", "addr", addr)

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	if err := srv.Serve(ln); err != nil {
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("health: serve: %w", err)
	}
	return nil
}
