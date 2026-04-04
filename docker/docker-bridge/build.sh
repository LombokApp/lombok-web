#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
echo "Building Docker Bridge..."
bun build src/index.ts --compile --outfile docker-bridge --external dockerode
echo "Build complete: $(ls -lh docker-bridge | awk '{print $5}')"
