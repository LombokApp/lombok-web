#!/bin/bash

# Build bundle script for lombok demo app
# This script creates a complete bundle of the demo app with frontend UI

set -e  # Exit on any error

echo "Starting build bundle process..."

# Clean up existing dist directory
echo "Cleaning up existing dist directory..."
rm -rf ./dist

# Create dist directory and copy config files
echo "Creating dist directory and copying config files..."
mkdir -p ./dist
cp ./config.json ./.publicKey ./dist/

# Build workers
echo "Building workers..."
bun --cwd app-demo-workers build

# Create migrations directory and copy migration files
echo "Copying migration files..."
mkdir -p ./dist/migrations
cp ./app-demo-workers/src/migrations/*.sql ./dist/migrations/

# Build frontend package
echo "Building frontend package..."
bun --cwd app-demo-ui build

# Copy frontend dist to dist/ui
echo "Copying frontend dist to dist/ui..."
cp -R ./app-demo-ui/dist ./dist/ui

echo "Build bundle completed successfully!"
