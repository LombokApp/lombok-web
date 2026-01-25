package logs

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	"lombok-worker-agent/internal/config"
)

type rotationTarget struct {
	name    string
	path    string
	getFile func() *os.File
	setFile func(*os.File)
}

func startRotationChecker(
	ctx context.Context,
	cfg config.LogRotationConfig,
	locker sync.Locker,
	targets []rotationTarget,
) {
	if ctx == nil || len(targets) == 0 {
		return
	}

	interval := cfg.CheckInterval
	if interval <= 0 {
		interval = 10 * time.Minute
	}

	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
		performRotation(locker, cfg, targets)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				performRotation(locker, cfg, targets)
			}
		}
	}()
}

// RotateNow performs a single rotation check using the provided configuration.
func RotateNow(cfg config.LogRotationConfig) {
	performRotation(&logMutex, cfg, rotationTargets())
}

func performRotation(
	locker sync.Locker,
	cfg config.LogRotationConfig,
	targets []rotationTarget,
) {
	locker.Lock()
	defer locker.Unlock()

	for _, target := range targets {
		if err := rotateTarget(target, cfg); err != nil {
			fmt.Fprintf(os.Stderr, "log rotation error for %s: %v\n", target.name, err)
		}
	}
}

func rotateTarget(target rotationTarget, cfg config.LogRotationConfig) error {
	file := target.getFile()
	if file == nil {
		return nil
	}

	stat, err := file.Stat()
	if err != nil {
		return err
	}

	maxSizeBytes := int64(cfg.MaxSizeMB) * 1024 * 1024
	if maxSizeBytes <= 0 {
		maxSizeBytes = 1
	}
	if stat.Size() < maxSizeBytes {
		return nil
	}

	if err := file.Close(); err != nil {
		return err
	}

	base := target.path
	maxFiles := cfg.MaxFiles
	if maxFiles < 1 {
		maxFiles = 1
	}

	oldest := fmt.Sprintf("%s.%d", base, maxFiles)
	_ = os.Remove(oldest)
	for i := maxFiles - 1; i >= 1; i-- {
		src := fmt.Sprintf("%s.%d", base, i)
		dst := fmt.Sprintf("%s.%d", base, i+1)
		if err := renameIfExists(src, dst); err != nil {
			return err
		}
	}

	if err := renameIfExists(base, fmt.Sprintf("%s.1", base)); err != nil {
		return err
	}

	newFile, err := os.OpenFile(base, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return err
	}
	target.setFile(newFile)

	return nil
}

func renameIfExists(src, dst string) error {
	if _, err := os.Stat(src); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if err := os.Rename(src, dst); err != nil {
		return err
	}
	return nil
}
