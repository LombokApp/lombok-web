#!/usr/bin/env sh
set -e
source ./cmd/env.sh
set -x

rm -rf .orm-cache

{ set +x; } 2>/dev/null

/wait && ts-node-dev --transpile-only ./src/index.ts
