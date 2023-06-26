#!/usr/bin/env sh
set -e
source ./cmd/env.sh
set -x

yarn ts-node script/seed-staging.ts

{ set +x; } 2>/dev/null
