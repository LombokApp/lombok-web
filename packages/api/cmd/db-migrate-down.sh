#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

yarn mikro-orm migration:down

{ set +x; } 2>/dev/null
