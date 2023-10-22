#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

yarn ts-node "./script/db-reset.ts"
yarn drizzle-kit up:pg --config ./src/orm/drizzle.config.ts

{ set +x; } 2>/dev/null
