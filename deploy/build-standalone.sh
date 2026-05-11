#!/bin/bash
set -e

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>   (e.g. $0 1.2.1-beta-rc3)" >&2
    exit 1
fi

SHA1=$(git rev-parse --short HEAD)
BUILD_ID="$VERSION-$SHA1"
NAME=lombok-standalone

echo "Building build ID: $BUILD_ID"

# Detect local platform
LOCAL_PLATFORM=$(uname -m)
if [ "$LOCAL_PLATFORM" = "arm64" ] || [ "$LOCAL_PLATFORM" = "aarch64" ]; then
    PLATFORM="linux/arm64"
else
    PLATFORM="linux/amd64"
fi

# Build for local platform with --load to make it available in local Docker
echo "Building for local platform: $PLATFORM"
docker buildx build --platform $PLATFORM --load --no-cache --build-arg LOMBOK_BUILD_ID=$BUILD_ID --target standalone-release -t $NAME:$BUILD_ID -t $NAME:latest -f "../docker/app.Dockerfile" ../

# Run the container using docker-compose
echo "Starting container with docker-compose..."
cd ..
docker-compose -f docker-compose.standalone.demo.yml up -d
echo "Container started. Use 'docker-compose -f docker-compose.standalone.demo.yml logs -f' to view logs."
