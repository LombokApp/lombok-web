#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

{ set +x; } 2>/dev/null

yarn ts-node script/reset-local-ethereum-network.ts
