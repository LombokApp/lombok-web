#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

yarn drizzle-kit check:pg --config ./src/orm/drizzle.config.ts

{ set +x; } 2>/dev/null
