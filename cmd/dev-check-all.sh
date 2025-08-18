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

run_checks "@stellariscloud/ui" packages/ui

run_checks "@stellariscloud/api" packages/api

run_checks "@stellariscloud/core-worker" packages/core-worker

run_checks "@stellariscloud/auth-utils" packages/auth-utils

run_checks "@stellariscloud/app-browser-sdk" packages/app-browser-sdk

run_checks "@stellariscloud/app-demo" packages/app-demo

run_checks "@stellariscloud/sdk" packages/sdk

run_checks "@stellariscloud/app-worker-sdk" packages/app-worker-sdk

run_checks "@stellariscloud/utils" packages/stellaris-utils

run_checks "@stellariscloud/types" packages/stellaris-types

run_checks "@stellariscloud/ui-toolkit" packages/ui-toolkit
