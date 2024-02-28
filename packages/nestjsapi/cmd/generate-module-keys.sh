#!/usr/bin/env sh
source ./cmd/env.sh

yarn ts-node script/generate-module-keys.ts "$1"

{ set +x; } 2>/dev/null
