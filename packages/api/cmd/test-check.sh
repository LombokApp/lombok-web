#!/usr/bin/env sh
bun prettier:check
bun tsc:check
bun lint:check

{ set +x; } 2>/dev/null
