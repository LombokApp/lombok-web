#!/usr/bin/env sh
bun "./script/db-reset.ts"
bun "./script/db-migrate-up.ts"

{ set +x; } 2>/dev/null
