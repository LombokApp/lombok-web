#!/bin/bash
# Build script for lombok-worker-agent
# Compiles a static Linux binary for use in Docker containers

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Default values
OUTPUT_NAME="lombok-worker-agent"
GOOS="${GOOS:-linux}"
GOARCH="${GOARCH:-amd64}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --os)
            GOOS="$2"
            shift 2
            ;;
        --arch)
            GOARCH="$2"
            shift 2
            ;;
        --output|-o)
            OUTPUT_NAME="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --os OS        Target OS (default: linux)"
            echo "  --arch ARCH    Target architecture (default: amd64)"
            echo "  -o, --output   Output binary name (default: lombok-worker-agent)"
            echo "  -h, --help     Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                          # Build for linux/amd64"
            echo "  $0 --arch arm64             # Build for linux/arm64"
            echo "  $0 --os darwin --arch arm64 # Build for macOS/arm64"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Building lombok-worker-agent for ${GOOS}/${GOARCH}..."

# Build with static linking (CGO_ENABLED=0)
CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" go build \
    -ldflags="-s -w" \
    -o "$OUTPUT_NAME" \
    .

echo "Built: $OUTPUT_NAME ($(du -h "$OUTPUT_NAME" | cut -f1))"
echo ""
echo "To test locally:"
echo "  ./$OUTPUT_NAME --help"
echo ""
echo "To use in a Docker image, copy the binary:"
echo "  COPY $OUTPUT_NAME /usr/local/bin/lombok-worker-agent"
