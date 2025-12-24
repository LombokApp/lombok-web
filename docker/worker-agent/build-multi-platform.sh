#!/bin/bash
# Multi-platform build script for lombok-worker-agent
# Builds binaries for multiple OS/architecture combinations

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Output directory
DIST_DIR="${DIST_DIR:-dist}"
BINARY_NAME="lombok-worker-agent"

# Clean and create dist directory
echo "Cleaning previous builds..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Define platforms: OS/ARCH pairs
PLATFORMS=(
    "linux/amd64"
    "linux/arm64"
    "darwin/amd64"
    "darwin/arm64"
)

echo "Building lombok-worker-agent for multiple platforms..."
echo ""

# Build for each platform
for PLATFORM in "${PLATFORMS[@]}"; do
    GOOS="${PLATFORM%%/*}"
    GOARCH="${PLATFORM##*/}"
    
    # Determine output filename
    if [ "$GOOS" = "windows" ]; then
        OUTPUT_NAME="${BINARY_NAME}-${GOOS}-${GOARCH}.exe"
    else
        OUTPUT_NAME="${BINARY_NAME}-${GOOS}-${GOARCH}"
    fi
    
    OUTPUT_PATH="${DIST_DIR}/${OUTPUT_NAME}"
    
    echo "Building for ${GOOS}/${GOARCH}..."
    
    # Build with static linking (CGO_ENABLED=0)
    CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" go build \
        -ldflags="-s -w" \
        -o "$OUTPUT_PATH" \
        .
    
    # Get file size
    if [ "$GOOS" = "windows" ]; then
        SIZE=$(stat -f%z "$OUTPUT_PATH" 2>/dev/null || stat -c%s "$OUTPUT_PATH" 2>/dev/null || echo "unknown")
    else
        SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
    fi
    
    echo "  ✓ Built: $OUTPUT_NAME ($SIZE)"
done

echo ""
echo "Build complete! Binaries are in: $DIST_DIR/"
echo ""
echo "Files:"
ls -lh "$DIST_DIR" | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "Usage examples:"
echo "  # Linux (amd64)"
echo "  ./${DIST_DIR}/${BINARY_NAME}-linux-amd64 --help"
echo ""
echo "  # macOS (Apple Silicon)"
echo "  ./${DIST_DIR}/${BINARY_NAME}-darwin-arm64 --help"
echo ""
