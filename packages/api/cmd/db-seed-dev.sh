#!/usr/bin/env sh
set -e
source ./cmd/env.sh
set -x

yarn ts-node script/seed-dev.ts

{ set +x; } 2>/dev/null
