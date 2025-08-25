#!/bin/bash
set -e

echo "Checking @lombokapp/ui..."
bun --cwd packages/ui tsc:check

echo "Checking @lombokapp/api..."
bun --cwd packages/api tsc:check

echo "Checking @lombokapp/core-worker..."
bun --cwd packages/core-worker tsc:check

echo "Checking @lombokapp/app-browser-sdk..."
bun --cwd packages/app-browser-sdk tsc:check

echo "Checking @lombokapp/auth-utils..."
bun --cwd packages/auth-utils tsc:check

echo "Checking @lombokapp/app-demo..."
bun --cwd packages/app-demo tsc:check

echo "Checking @lombokapp/sdk..."
bun --cwd packages/sdk tsc:check

echo "Checking @lombokapp/app-worker-sdk..."
bun --cwd packages/app-worker-sdk tsc:check

echo "Checking @lombokapp/utils..."
bun --cwd packages/utils tsc:check

echo "Checking @lombokapp/types..."
bun --cwd packages/types tsc:check

echo "Checking @lombokapp/ui-toolkit..."
bun --cwd packages/ui-toolkit tsc:check
