#!/bin/bash
set -e

BUILD_ID="${1:-}"
PLATFORM_ARG="${2:-}"

if [ -z "$BUILD_ID" ]; then
    echo "Usage: $0 <build-id> [platform]   (e.g. $0 20260524-150000-abc1234 arm64)" >&2
    echo "  platform: amd64 | arm64 (default: both)" >&2
    exit 1
fi

case "$PLATFORM_ARG" in
    "")           PLATFORMS="linux/amd64 linux/arm64" ;;
    amd64|arm64)  PLATFORMS="linux/$PLATFORM_ARG" ;;
    linux/amd64|linux/arm64) PLATFORMS="$PLATFORM_ARG" ;;
    *)
        echo "Invalid platform: $PLATFORM_ARG (expected amd64 or arm64)" >&2
        exit 1
        ;;
esac

NAME=lombok

echo "Building build ID: $BUILD_ID"

for PLATFORM in $PLATFORMS; do
    ARCH="${PLATFORM##*/}"
    echo "Building for $PLATFORM"
    docker buildx build \
        --platform "$PLATFORM" \
        --load \
        --no-cache \
        --build-arg LOMBOK_BUILD_ID="$BUILD_ID" \
        --target release \
        -t "$NAME:$BUILD_ID-$ARCH" \
        -t "$NAME:latest-$ARCH" \
        -f "../docker/app.Dockerfile" \
        ../
done
