#!/bin/bash
# Build script for lombok/mock-worker Docker image
# Builds the mock worker image for manual local testing

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
IMAGE_NAME="lombok/mock-worker"
IMAGE_TAG="latest"
PLATFORM=""
NO_CACHE=""

# Detect local platform if not specified
detect_local_platform() {
    LOCAL_ARCH=$(uname -m)
    if [ "$LOCAL_ARCH" = "arm64" ] || [ "$LOCAL_ARCH" = "aarch64" ]; then
        echo "linux/arm64"
    else
        echo "linux/amd64"
    fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --platform|-p)
            PLATFORM="$2"
            shift 2
            ;;
        --tag|-t)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --name|-n)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Builds the lombok/mock-worker Docker image for manual local testing."
            echo ""
            echo "Options:"
            echo "  -p, --platform PLATFORM   Target platform (e.g., linux/amd64, linux/arm64)"
            echo "                            Default: auto-detect local platform"
            echo "  -t, --tag TAG             Image tag (default: latest)"
            echo "  -n, --name NAME           Image name (default: lombok/mock-worker)"
            echo "  --no-cache                Build without using cache"
            echo "  -h, --help                Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Build for local platform"
            echo "  $0 --platform linux/amd64             # Build for linux/amd64"
            echo "  $0 --platform linux/arm64             # Build for linux/arm64"
            echo "  $0 --tag dev --no-cache               # Build with tag 'dev' and no cache"
            echo ""
            echo "After building, run the container:"
            echo "  docker run --rm -p 8080:8080 $IMAGE_NAME:$IMAGE_TAG"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Set default platform if not specified
if [ -z "$PLATFORM" ]; then
    PLATFORM=$(detect_local_platform)
    echo "No platform specified, using local platform: $PLATFORM"
fi

FULL_IMAGE_NAME="$IMAGE_NAME:$IMAGE_TAG"

echo "Building $FULL_IMAGE_NAME for platform: $PLATFORM"
echo "Dockerfile: $SCRIPT_DIR/mock-worker.Dockerfile"
echo "Context: $REPO_ROOT"
echo ""

# Ensure buildx is available
if ! docker buildx version > /dev/null 2>&1; then
    echo "Error: docker buildx is not available"
    echo "Please install Docker Buildx or update Docker Desktop"
    exit 1
fi

# Build the image
docker buildx build \
    --platform "$PLATFORM" \
    --load \
    $NO_CACHE \
    -f "$SCRIPT_DIR/mock-worker.Dockerfile" \
    -t "$FULL_IMAGE_NAME" \
    "$REPO_ROOT"

echo ""
echo "✓ Build complete: $FULL_IMAGE_NAME"
echo ""
echo "To run the container:"
echo "  docker run --rm -p 8080:8080 $FULL_IMAGE_NAME"
echo ""
echo "To run interactively:"
echo "  docker run --rm -it -p 8080:8080 $FULL_IMAGE_NAME sh"
echo ""
echo "To test the agent inside:"
echo "  docker run --rm -it $FULL_IMAGE_NAME sh"
echo "  lombok-worker-agent --help"
