#!/usr/bin/env bash
set -euo pipefail

# Remove all node_modules directories and optionally bun.lock, then reinstall
cd "$(dirname "$0")/.."


find . -name node_modules -type d -prune -exec rm -rf {} +

echo "🧹 Removing bun.lock..."
rm -f bun.lock

# Define the Bun image and target platform
BUN_IMAGE="oven/bun:1.3.9-alpine"
TARGET_PLATFORM="linux/amd64"

echo "🚀 Running \"bun install\" (platform: $TARGET_PLATFORM) ..."

# Run Bun install inside a temporary Linux/amd64 container
docker run --rm \
  --platform $TARGET_PLATFORM \
  -v "$PWD:/app" \
  -w /app \
  $BUN_IMAGE sh -c "
    bun install && \
    echo '✅ Finished running \"bun install\"\n'"

echo 'Running "bun install" locally...\n'

find . -name node_modules -type d -prune -exec rm -rf {} +
bun install

echo "🎉 Done! Commit the updated bun.lock if needed."
