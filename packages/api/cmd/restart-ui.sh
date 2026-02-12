#!/usr/bin/env sh
set -eu

pkill -f "packages/ui dev" 2>/dev/null || true
sleep 1
nohup bun --cwd /usr/src/app/packages/ui dev --host > /dev/stdout 2>/dev/stderr &
echo "Vite dev server restarting on port 5173..."
