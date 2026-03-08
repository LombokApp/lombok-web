#!/bin/bash
set -e

echo "Checking @lombokapp/ui..."
bun --cwd packages/ui prettier:fix

echo "Checking @lombokapp/api..."
bun --cwd packages/api prettier:fix

echo "Checking @lombokapp/core-worker..."
bun --cwd packages/core-worker prettier:fix

echo "Checking @lombokapp/worker-utils..."
bun --cwd packages/worker-utils prettier:fix

echo "Checking @lombokapp/auth-utils..."
bun --cwd packages/auth-utils prettier:fix

echo "Checking @lombokapp/app-browser-sdk..."
bun --cwd packages/app-browser-sdk prettier:fix

echo "Checking @lombokapp/demo-apps/simple-demo..."
bun --cwd packages/demo-apps/simple-demo prettier:fix

echo "Checking @lombokapp/sdk..."
bun --cwd packages/sdk prettier:fix

echo "Checking @lombokapp/app-worker-sdk..."
bun --cwd packages/app-worker-sdk prettier:fix

echo "Checking @lombokapp/utils..."
bun --cwd packages/utils prettier:fix

echo "Checking @lombokapp/types..."
bun --cwd packages/types prettier:fix

echo "Checking @lombokapp/ui-toolkit..."
bun --cwd packages/ui-toolkit prettier:fix
