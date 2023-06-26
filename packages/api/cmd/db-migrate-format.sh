#!/usr/bin/env sh
set -e
. ./cmd/env.sh
set -x

yarn jscodeshift src/orm/migrations --extensions=ts -t src/orm/format-migration.ts
yarn prettier --write src/orm/migrations/*.ts

{ set +x; } 2>/dev/null
