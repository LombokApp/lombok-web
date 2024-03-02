#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

yarn ts-node "./script/db-seed.ts"

{ set +x; } 2>/dev/null
