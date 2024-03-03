#!/usr/bin/env sh
bunx drizzle-kit check:pg --config ./src/orm/drizzle.config.ts

{ set +x; } 2>/dev/null
