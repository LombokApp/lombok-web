package reaper

import (
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

var (
	reaperSetupOnce         sync.Once
	reapUnregisteredZombies bool // If true, reap all zombies (for main worker-logs process)
	reapUnregisteredMu      sync.Mutex
)

// setupReaperGoroutines sets up the actual reaper goroutines.
func setupReaperGoroutines() {
	sigchld := make(chan os.Signal, 10)
	signal.Notify(sigchld, syscall.SIGCHLD)

	// Handle SIGCHLD signals
	go func() {
		for range sigchld {
			reapZombies()
		}
	}()

	// Also periodically check for zombies (in case we miss signals)
	go func() {
		reapZombies()
		ticker := time.NewTicker(10 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			reapZombies()
		}
	}()
}

// reapZombies reaps zombie children (non-blocking).
// Only reaps zombies if reapUnregisteredZombies is enabled (main worker-logs process).
// Child agent processes don't reap zombies - when they exit, their zombie children
// become orphans and are reparented to PID 1 (worker-logs), which then reaps them.
// This prevents interference with exec_per_job workers being explicitly waited on.
func reapZombies() {
	reapUnregisteredMu.Lock()
	shouldReapUnregistered := reapUnregisteredZombies
	reapUnregisteredMu.Unlock()

	if !shouldReapUnregistered {
		// In child agent processes, don't reap zombies
		// When the agent process exits, any zombie children become orphans
		// and are reparented to PID 1 (worker-logs), which will reap them
		return
	}

	// In main worker-logs process (PID 1), reap all zombies
	// These are orphans that became children of PID 1 when their parent agent processes exited
	for {
		var status syscall.WaitStatus
		reaped, err := syscall.Wait4(-1, &status, syscall.WNOHANG, nil)
		if reaped <= 0 || err != nil {
			break
		}
		// Successfully reaped a zombie
	}
}

// EnableReapUnregisteredZombies enables reaping of unregistered zombie children.
// This should only be enabled for the main worker-logs process to handle zombies
// that become children of the main process when child agent processes exit.
func EnableReapUnregisteredZombies() {
	reapUnregisteredMu.Lock()
	reapUnregisteredZombies = true
	reapUnregisteredMu.Unlock()
}

// SetupChildReaper sets up a goroutine that automatically reaps zombie children.
// This function is idempotent - it only sets up the reaper once.
func SetupChildReaper() {
	reaperSetupOnce.Do(func() {
		setupReaperGoroutines()
	})
}
