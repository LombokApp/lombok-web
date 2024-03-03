#!/usr/bin/env sh
bun script/generate-module-jwt.ts "$1" "$2"

{ set +x; } 2>/dev/null
