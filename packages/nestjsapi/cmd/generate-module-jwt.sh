#!/usr/bin/env sh
source ./cmd/env.sh

yarn ts-node script/generate-module-jwt.ts "$1" "$2"

{ set +x; } 2>/dev/null
