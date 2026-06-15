#!/usr/bin/env sh
set -eu

# Log to a file: as the su-exec'd `bun` user we can't open the exec pipe's /dev/stdout, and it closes when `./dx restart ui` returns anyway.
LOG_FILE=/tmp/vite-dev.log
PORT=5173

# pkill only matches the parent `bun ... dev`; its vite children orphan and keep the port, so free the port directly too or the new vite can't bind.
pkill -f "packages/ui dev" 2>/dev/null || true
fuser -k "${PORT}/tcp" 2>/dev/null || true

# Wait for the port to free rather than a fixed sleep.
i=0
while fuser "${PORT}/tcp" >/dev/null 2>&1 && [ "$i" -lt 50 ]; do
  sleep 0.1
  i=$((i + 1))
done

# setsid + </dev/null detaches from the exec session so vite survives after `./dx restart ui` exits.
setsid bun --cwd /usr/src/app/packages/ui dev --host </dev/null >>"$LOG_FILE" 2>&1 &
echo "Vite dev server restarting on port 5173... (logs: $LOG_FILE)"
