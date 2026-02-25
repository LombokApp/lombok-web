#!/bin/bash
set -e

echo "Checking @lombokapp/ui..."
bun --cwd packages/ui lint:check

echo "Checking @lombokapp/api..."
bun --cwd packages/api lint:check

echo "Checking @lombokapp/core-worker..."
bun --cwd packages/core-worker lint:check

echo "Checking @lombokapp/worker-utils..."
bun --cwd packages/worker-utils lint:check

echo "Checking @lombokapp/auth-utils..."
bun --cwd packages/auth-utils lint:check

echo "Checking @lombokapp/app-browser-sdk..."
bun --cwd packages/app-browser-sdk lint:check

echo "Checking @lombokapp/app-demo..."
bun --cwd packages/app-demo lint:check

echo "Checking @lombokapp/sdk..."
bun --cwd packages/sdk lint:check

echo "Checking @lombokapp/app-worker-sdk..."
bun --cwd packages/app-worker-sdk lint:check

echo "Checking @lombokapp/utils..."
bun --cwd packages/utils lint:check

echo "Checking @lombokapp/types..."
bun --cwd packages/types lint:check

echo "Checking @lombokapp/ui-toolkit..."
bun --cwd packages/ui-toolkit lint:check
