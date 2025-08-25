#!/bin/bash
set -e

run_checks() {
  local name=$1
  local path=$2

  echo "Prettier check ${name}..."
  bun --cwd ${path} prettier:check

  echo "TypeScript check ${name}..."
  bun --cwd ${path} tsc:check

  echo "ESLint check ${name}..."
  bun --cwd ${path} lint:check
}

run_checks "@lombokapp/ui" packages/ui

run_checks "@lombokapp/api" packages/api

run_checks "@lombokapp/core-worker" packages/core-worker

run_checks "@lombokapp/auth-utils" packages/auth-utils

run_checks "@lombokapp/app-browser-sdk" packages/app-browser-sdk

run_checks "@lombokapp/app-demo" packages/app-demo

run_checks "@lombokapp/sdk" packages/sdk

run_checks "@lombokapp/app-worker-sdk" packages/app-worker-sdk

run_checks "@lombokapp/utils" packages/utils

run_checks "@lombokapp/types" packages/types

run_checks "@lombokapp/ui-toolkit" packages/ui-toolkit
