#!/usr/bin/env bash
set -euo pipefail

# Remove all node_modules directories and optionally bun.lock, then reinstall
cd "$(dirname "$0")/.."


find . -name node_modules -type d -prune -exec rm -rf {} +

echo "🧹 Removing bun.lock..."
rm -f bun.lock

echo "🚀 Running bun install with cross-platform lockfile support..."
bun install --os darwin --os linux --cpu arm64 --cpu x64

echo "🎉 Done! Commit the updated bun.lock if needed."
