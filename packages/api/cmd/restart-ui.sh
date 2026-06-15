#!/usr/bin/env sh
set -eu

# Logs go to a file, not the exec session's stdout: this script runs as the
# `bun` user via su-exec, which cannot open /dev/stdout (the exec pipe) nor
# PID 1's fds, and that pipe closes when `./dx restart ui` returns anyway.
LOG_FILE=/tmp/vite-dev.log
PORT=5173

# Stop the dev runner. pkill only matches the parent `bun ... dev` process;
# its `bun vite`/`node vite` children have a different command line, so they
# orphan and keep holding the port. Free the port directly to reap them too —
# otherwise the new vite can't bind 5173 and dies (the intermittent failure).
pkill -f "packages/ui dev" 2>/dev/null || true
fuser -k "${PORT}/tcp" 2>/dev/null || true

# Wait for the port to actually free before starting, instead of a fixed sleep.
i=0
while fuser "${PORT}/tcp" >/dev/null 2>&1 && [ "$i" -lt 50 ]; do
  sleep 0.1
  i=$((i + 1))
done

# setsid + </dev/null fully detaches from the transient exec session so vite
# survives after `./dx restart ui` exits.
setsid bun --cwd /usr/src/app/packages/ui dev --host </dev/null >>"$LOG_FILE" 2>&1 &
echo "Vite dev server restarting on port 5173... (logs: $LOG_FILE)"
