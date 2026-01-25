package logs

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"lombok-worker-agent/internal/config"
)

func newTestTarget(t *testing.T, dir string) (rotationTarget, func()) {
	t.Helper()

	path := filepath.Join(dir, "agent.log")
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		t.Fatalf("failed to create test log file: %v", err)
	}

	current := file
	target := rotationTarget{
		name: "test",
		path: path,
		getFile: func() *os.File {
			return current
		},
		setFile: func(f *os.File) {
			current = f
		},
	}
	cleanup := func() {
		if current != nil {
			current.Close()
		}
		os.RemoveAll(dir)
	}
	return target, cleanup
}

func TestRotateTargetSizeExceeded(t *testing.T) {
	dir := t.TempDir()
	target, cleanup := newTestTarget(t, dir)
	defer cleanup()

	current := target.getFile()
	if _, err := current.WriteString(strings.Repeat("x", 1024)); err != nil {
		t.Fatalf("failed to write test data: %v", err)
	}

	cfg := config.LogRotationConfig{
		MaxSizeMB:     0,
		MaxFiles:      2,
		CheckInterval: time.Minute,
	}

	if err := rotateTarget(target, cfg); err != nil {
		t.Fatalf("rotateTarget failed: %v", err)
	}

	if _, err := os.Stat(target.path + ".1"); err != nil {
		t.Fatalf("rotated file missing: %v", err)
	}
	if info, err := os.Stat(target.path); err != nil {
		t.Fatalf("new log file missing: %v", err)
	} else if info.Size() != 0 {
		t.Fatalf("new log file not truncated")
	}
}

func TestRotateTargetRespectsRetention(t *testing.T) {
	dir := t.TempDir()
	target, cleanup := newTestTarget(t, dir)
	defer cleanup()

	entries := []struct {
		name    string
		content string
	}{
		{".1", "first"},
		{".2", "second"},
	}
	for _, entry := range entries {
		path := target.path + entry.name
		if err := os.WriteFile(path, []byte(entry.content), 0644); err != nil {
			t.Fatalf("failed to create rotated file: %v", err)
		}
	}

	cfg := config.LogRotationConfig{
		MaxSizeMB:     0,
		MaxFiles:      2,
		CheckInterval: time.Minute,
	}

	if err := rotateTarget(target, cfg); err != nil {
		t.Fatalf("rotateTarget failed: %v", err)
	}

	data, err := os.ReadFile(target.path + ".2")
	if err != nil {
		t.Fatalf("expected rotated file missing: %v", err)
	}
	if string(data) != "first" {
		t.Fatalf("retention logic failed, expected %q, got %q", "first", string(data))
	}
	if _, err := os.Stat(target.path + ".3"); err == nil {
		t.Fatalf("oldest file was not removed")
	}
}

func TestStartRotationChecker(t *testing.T) {
	dir := t.TempDir()
	target, cleanup := newTestTarget(t, dir)
	defer cleanup()

	if _, err := target.getFile().WriteString("bulk"); err != nil {
		t.Fatalf("failed to seed log file: %v", err)
	}

	cfg := config.LogRotationConfig{
		MaxSizeMB:     0,
		MaxFiles:      2,
		CheckInterval: 20 * time.Millisecond,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	locker := &sync.Mutex{}

	startRotationChecker(ctx, cfg, locker, []rotationTarget{target})

	time.Sleep(100 * time.Millisecond)

	if _, err := os.Stat(target.path + ".1"); err != nil {
		t.Fatalf("background rotation did not occur: %v", err)
	}
}
