#!/usr/bin/env sh
set -e
source ./cmd/env.sh
set -x

{ set +x; } 2>/dev/null

yarn ts-node script/deploy-contract-deployer-locally.ts
