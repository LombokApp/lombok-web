#!/usr/bin/env sh
bun script/generate-module-keys.ts "$1"

{ set +x; } 2>/dev/null
