#!/bin/bash
set -e

echo "Checking @lombokapp/ui..."
bun --cwd packages/ui prettier:check

echo "Checking @lombokapp/api..."
bun --cwd packages/api prettier:check

echo "Checking @lombokapp/core-worker..."
bun --cwd packages/core-worker prettier:check

echo "Checking @lombokapp/auth-utils..."
bun --cwd packages/auth-utils prettier:check

echo "Checking @lombokapp/app-browser-sdk..."
bun --cwd packages/app-browser-sdk prettier:check

echo "Checking @lombokapp/app-demo..."
bun --cwd packages/app-demo prettier:check

echo "Checking @lombokapp/sdk..."
bun --cwd packages/sdk prettier:check

echo "Checking @lombokapp/app-worker-sdk..."
bun --cwd packages/app-worker-sdk prettier:check

echo "Checking @lombokapp/utils..."
bun --cwd packages/utils prettier:check

echo "Checking @lombokapp/types..."
bun --cwd packages/types prettier:check

echo "Checking @lombokapp/ui-toolkit..."
bun --cwd packages/ui-toolkit prettier:check
