#!/usr/bin/env sh
jest -c jest.config.integration.ts --runInBand --detectOpenHandles --forceExit "$@"

{ set +x; } 2>/dev/null
