#!/usr/bin/env sh
set -e
source ./cmd/env.sh
set -x

yarn mikro-orm migration:up

{ set +x; } 2>/dev/null
