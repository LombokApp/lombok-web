#!/bin/bash
set -e

BRANCH=$(git rev-parse --symbolic-full-name --abbrev-ref HEAD | sed 's/[^A-Za-z0-9_\.-]/--/g' | head -c100)
SHA1=$(git rev-parse --short HEAD)
VERSION=$BRANCH-$SHA1-$(date +%s)
NAME=lombok-standalone

echo "Building version: $VERSION"

# Detect local platform
LOCAL_PLATFORM=$(uname -m)
if [ "$LOCAL_PLATFORM" = "arm64" ] || [ "$LOCAL_PLATFORM" = "aarch64" ]; then
    PLATFORM="linux/arm64"
else
    PLATFORM="linux/amd64"
fi

# Build for local platform with --load to make it available in local Docker
echo "Building for local platform: $PLATFORM"
docker buildx build --platform $PLATFORM --load --no-cache --target standalone-release -t $NAME:$VERSION -t $NAME:latest -f "../docker/app.Dockerfile" ../

# Run the container using docker-compose
echo "Starting container with docker-compose..."
cd ..
docker-compose -f docker-compose.standalone.demo.yml up -d
echo "Container started. Use 'docker-compose -f docker-compose.standalone.demo.yml logs -f' to view logs."
