#!/usr/bin/env sh
set -e
source ./cmd/env.sh

yarn mikro-orm "$@"

{ set +x; } 2>/dev/null
