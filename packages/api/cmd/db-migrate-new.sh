#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

rm -rf .orm-cache

yarn mikro-orm migration:create

./cmd/db-migrate-format.sh

{ set +x; } 2>/dev/null
