#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

yarn jest -c jest.config.integration.ts --runInBand --detectOpenHandles --forceExit "$@"

{ set +x; } 2>/dev/null
