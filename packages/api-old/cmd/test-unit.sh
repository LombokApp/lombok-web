#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

yarn jest -c jest.config.unit.ts "$@"

{ set +x; } 2>/dev/null
