#!/bin/bash

# Generic build bundle script for demo apps
# Usage: ./build-bundle.sh <app-name>

set -euo pipefail

# Check for app name argument
if [ $# -eq 0 ]; then
  echo "Usage: $0 <app-name>"
  echo "Example: $0 simple-demo"
  exit 1
fi

APP_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/$APP_NAME"

# Validate app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo "Error: App directory '$APP_DIR' does not exist"
  exit 1
fi

echo "Starting build bundle process for $APP_NAME..."

# Clean and create dist directory
echo "Cleaning up existing dist directory..."
rm -rf "$APP_DIR/dist"
mkdir -p "$APP_DIR/dist"

# Copy config.json
echo "Copying config files..."
if [ ! -f "$APP_DIR/config.json" ]; then
  echo "Error: config.json not found in $APP_DIR"
  exit 1
fi
cp "$APP_DIR/config.json" "$APP_DIR/dist/"

# Optionally copy .publicKey if it exists
if [ -f "$APP_DIR/.publicKey" ]; then
  cp "$APP_DIR/.publicKey" "$APP_DIR/dist/"
fi

# Build runtime
echo "Building workers..."
if [ ! -d "$APP_DIR/runtime" ]; then
  echo "Error: runtime directory not found in $APP_DIR"
  exit 1
fi
(cd "$APP_DIR/runtime" && bun run build.ts)

# Handle runtime output - support both build patterns
# Pattern 1: build.ts outputs directly to ../dist/workers (simple-demo)
# Pattern 2: build.ts outputs to ./dist/<worker-name> (clippy)
if [ -d "$APP_DIR/runtime/dist" ]; then
  # Clippy pattern: copy runtime/dist contents to dist/workers/
  echo "Copying runtime output to dist/workers/..."
  mkdir -p "$APP_DIR/dist/workers"
  cp -R "$APP_DIR/runtime/dist/"* "$APP_DIR/dist/workers/"
elif [ ! -d "$APP_DIR/dist/workers" ]; then
  # If neither pattern worked, something is wrong
  echo "Error: No runtime output found in $APP_DIR/runtime/dist or $APP_DIR/dist/workers"
  exit 1
fi

# Optionally copy migrations if they exist
if [ -d "$APP_DIR/runtime/src/migrations" ]; then
  echo "Copying migration files..."
  mkdir -p "$APP_DIR/dist/migrations"
  if compgen -G "$APP_DIR/runtime/src/migrations/*.sql" > /dev/null; then
    cp "$APP_DIR/runtime/src/migrations/"*.sql "$APP_DIR/dist/migrations/"
  fi
fi

# Build UI if present
if [ -d "$APP_DIR/ui" ]; then
  echo "Building frontend package..."
  (cd "$APP_DIR/ui" && bun run build)

  echo "Copying frontend dist to dist/ui..."
  if [ -d "$APP_DIR/ui/dist" ]; then
    cp -R "$APP_DIR/ui/dist" "$APP_DIR/dist/ui"
  else
    echo "Warning: UI build did not produce dist directory"
  fi
fi

echo "Build bundle completed successfully for $APP_NAME!"
