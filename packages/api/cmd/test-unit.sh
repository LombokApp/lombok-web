#!/usr/bin/env sh
jest -c jest.config.unit.ts "$@"

{ set +x; } 2>/dev/null
