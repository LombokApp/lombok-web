#!/bin/bash
set -e

# Define the Bun image and target platform
BUN_IMAGE="oven/bun:1.2.17-alpine"
TARGET_PLATFORM="linux/amd64"

echo "🚀 Running Bun install in a $TARGET_PLATFORM container..."

# Run Bun install inside a temporary Linux/amd64 container
docker run --rm \
  --platform $TARGET_PLATFORM \
  -v "$PWD:/app" \
  -w /app \
  $BUN_IMAGE sh -c "
    rm -f bun.lock && \
    bun install && \
    echo '✅ bun.lock updated successfully!'"

echo "🎉 Done! Commit the updated bun.lock if needed."
