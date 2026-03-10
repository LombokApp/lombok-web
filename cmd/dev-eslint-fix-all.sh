#!/bin/bash
set -e

echo "Checking @lombokapp/ui..."
bun --cwd packages/ui lint:fix

echo "Checking @lombokapp/api..."
bun --cwd packages/api lint:fix

echo "Checking @lombokapp/core-worker..."
bun --cwd packages/core-worker lint:fix

echo "Checking @lombokapp/worker-utils..."
bun --cwd packages/worker-utils lint:fix

echo "Checking @lombokapp/auth-utils..."
bun --cwd packages/auth-utils lint:fix

echo "Checking @lombokapp/app-browser-sdk..."
bun --cwd packages/app-browser-sdk lint:fix

echo "Checking @lombokapp/demo-apps/simple-demo..."
bun --cwd packages/demo-apps/simple-demo lint:fix

echo "Checking @lombokapp/sdk..."
bun --cwd packages/sdk lint:fix

echo "Checking @lombokapp/app-worker-sdk..."
bun --cwd packages/app-worker-sdk lint:fix

echo "Checking @lombokapp/utils..."
bun --cwd packages/utils lint:fix

echo "Checking @lombokapp/types..."
bun --cwd packages/types lint:fix

echo "Checking @lombokapp/ui-toolkit..."
bun --cwd packages/ui-toolkit lint:fix
