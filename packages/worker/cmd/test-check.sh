#!/usr/bin/env sh
set -e
source ./cmd/env.sh
set -x

yarn prettier:check
yarn ts:check
yarn lint:check

{ set +x; } 2>/dev/null
