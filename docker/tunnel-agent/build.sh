#!/bin/bash
# Build script for tunnel-agent
# Compiles a static Linux binary for use in Docker containers
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Default values
OUTPUT_NAME="${OUTPUT_NAME:-tunnel-agent}"
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
        -o|--output)
            OUTPUT_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --os OS        Target OS (default: linux)"
            echo "  --arch ARCH    Target architecture (default: amd64)"
            echo "  -o, --output   Output binary name (default: tunnel-agent)"
            echo "  -h, --help     Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Building tunnel-agent for ${GOOS}/${GOARCH}..."

CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" go build \
    -ldflags="-s -w" \
    -o "$OUTPUT_NAME" \
    .

echo "Built: $OUTPUT_NAME ($(du -h "$OUTPUT_NAME" | cut -f1))"
