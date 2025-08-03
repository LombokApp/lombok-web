#!/bin/bash
set -e

echo "Checking @stellariscloud/ui..."
bun --cwd packages/ui tsc:check

echo "Checking @stellariscloud/api..."
bun --cwd packages/api tsc:check

echo "Checking @stellariscloud/core-worker..."
bun --cwd packages/core-worker tsc:check

echo "Checking @stellariscloud/app-browser-sdk..."
bun --cwd packages/app-browser-sdk tsc:check

echo "Checking @stellariscloud/auth-utils..."
bun --cwd packages/auth-utils tsc:check

echo "Checking @stellariscloud/app-dev-demo..."
bun --cwd packages/app-dev-demo tsc:check

echo "Checking @stellariscloud/sdk..."
bun --cwd packages/sdk tsc:check

echo "Checking @stellariscloud/app-worker-sdk..."
bun --cwd packages/app-worker-sdk tsc:check

echo "Checking @stellariscloud/utils..."
bun --cwd packages/stellaris-utils tsc:check

echo "Checking @stellariscloud/types..."
bun --cwd packages/stellaris-types tsc:check

echo "Checking @stellariscloud/ui-toolkit..."
bun --cwd packages/ui-toolkit tsc:check
