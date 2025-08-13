#!/bin/bash
set -e

echo "Checking @stellariscloud/ui..."
bun --cwd packages/ui lint:check

echo "Checking @stellariscloud/api..."
bun --cwd packages/api lint:check

echo "Checking @stellariscloud/core-worker..."
bun --cwd packages/core-worker lint:check

echo "Checking @stellariscloud/auth-utils..."
bun --cwd packages/auth-utils lint:check

echo "Checking @stellariscloud/app-browser-sdk..."
bun --cwd packages/app-browser-sdk lint:check

echo "Checking @stellariscloud/app-demo..."
bun --cwd packages/app-demo lint:check

echo "Checking @stellariscloud/sdk..."
bun --cwd packages/sdk lint:check

echo "Checking @stellariscloud/app-worker-sdk..."
bun --cwd packages/app-worker-sdk lint:check

echo "Checking @stellariscloud/utils..."
bun --cwd packages/stellaris-utils lint:check

echo "Checking @stellariscloud/types..."
bun --cwd packages/stellaris-types lint:check

echo "Checking @stellariscloud/ui-toolkit..."
bun --cwd packages/ui-toolkit lint:check
