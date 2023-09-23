#!/usr/bin/env sh
source ./cmd/env.sh

yarn ts-node script/generate-worker-jwt.ts "$1"

{ set +x; } 2>/dev/null
