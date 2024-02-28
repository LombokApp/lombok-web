#!/usr/bin/env sh
set -e
source ./cmd/env.sh
set -x

/wait && yarn node dist

{ set +x; } 2>/dev/null
