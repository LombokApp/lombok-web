#!/usr/bin/env sh
set -e

. ./cmd/env.sh
set -x

yarn mikro-orm schema:drop -r --drop-migrations-table --fk-checks
yarn mikro-orm migration:up

{ set +x; } 2>/dev/null
