#!/bin/bash

# Build bundle script for lombok demo app
# This script creates a complete bundle of the demo app with frontend UI

set -e  # Exit on any error

echo "Starting build bundle process..."

# Clean up existing bundle-dist directory
echo "Cleaning up existing bundle-dist directory..."
rm -rf ./bundle-dist

# Create bundle-dist directory and copy config files
echo "Creating bundle-dist directory and copying config files..."
mkdir -p ./bundle-dist
cp ./config.json ./.publicKey ./bundle-dist/

# Build workers
echo "Building workers..."
bun --cwd app-demo-workers build

# Create migrations directory and copy migration files
echo "Copying migration files..."
mkdir -p ./bundle-dist/migrations
cp ./app-demo-workers/src/migrations/*.sql ./bundle-dist/migrations/

# Build frontend package
echo "Building frontend package..."
bun --cwd app-demo-ui build

# Copy frontend dist to bundle-dist/ui
echo "Copying frontend dist to bundle-dist/ui..."
cp -R ./app-demo-ui/dist ./bundle-dist/ui

echo "Build bundle completed successfully!"
