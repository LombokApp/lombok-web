#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

yarn ts-node "./script/db-reset.ts"
yarn ts-node "./script/db-migrate-up.ts"

{ set +x; } 2>/dev/null
