#!/bin/bash
set -e

echo "Checking @stellariscloud/ui..."
bun --cwd packages/ui prettier:check

echo "Checking @stellariscloud/api..."
bun --cwd packages/api prettier:check

echo "Checking @stellariscloud/core-worker..."
bun --cwd packages/core-worker prettier:check

echo "Checking @stellariscloud/auth-utils..."
bun --cwd packages/auth-utils prettier:check

echo "Checking @stellariscloud/app-browser-sdk..."
bun --cwd packages/app-browser-sdk prettier:check

echo "Checking @stellariscloud/app-dev-demo..."
bun --cwd packages/app-dev-demo prettier:check

echo "Checking @stellariscloud/sdk..."
bun --cwd packages/sdk prettier:check

echo "Checking @stellariscloud/app-worker-sdk..."
bun --cwd packages/app-worker-sdk prettier:check

echo "Checking @stellariscloud/utils..."
bun --cwd packages/stellaris-utils prettier:check

echo "Checking @stellariscloud/types..."
bun --cwd packages/stellaris-types prettier:check

echo "Checking @stellariscloud/ui-toolkit..."
bun --cwd packages/ui-toolkit prettier:check
