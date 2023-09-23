#!/usr/bin/env bash
set -e
source ./cmd/env.sh
set -x

{ set +x; } 2>/dev/null

/wait && ts-node-dev --transpile-only ./src/index.ts
