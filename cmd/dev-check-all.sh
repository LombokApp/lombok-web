#!/bin/bash

failures=()

run_checks() {
  local name=$1
  local path=$2

  echo ""
  echo "════════════════════════════════════════"
  echo "  ${name}"
  echo "════════════════════════════════════════"

  echo "Prettier check ${name}..."
  if ! bun --cwd "${path}" prettier:check; then
    failures+=("${name} prettier")
  fi

  echo "TypeScript check ${name}..."
  if ! bun --cwd "${path}" tsc:check; then
    failures+=("${name} tsc")
  fi

  echo "ESLint check ${name}..."
  if ! bun --cwd "${path}" lint:check; then
    failures+=("${name} eslint")
  fi
}

# Workspace packages
run_checks "@lombokapp/api" packages/api
run_checks "@lombokapp/ui" packages/ui
run_checks "@lombokapp/ui-toolkit" packages/ui-toolkit
run_checks "@lombokapp/types" packages/types
run_checks "@lombokapp/sdk" packages/sdk
run_checks "@lombokapp/utils" packages/utils
run_checks "@lombokapp/auth-utils" packages/auth-utils
run_checks "@lombokapp/core-worker" packages/core-worker
run_checks "@lombokapp/worker-utils" packages/worker-utils
run_checks "@lombokapp/app-browser-sdk" packages/app-browser-sdk
run_checks "@lombokapp/app-worker-sdk" packages/app-worker-sdk

# Demo apps (excluded from workspace, checked independently)
run_checks "@lombokapp/simple-demo" packages/demo-apps/simple-demo

# Summary
echo ""
echo "════════════════════════════════════════"
echo "  Summary"
echo "════════════════════════════════════════"

if [ ${#failures[@]} -eq 0 ]; then
  echo "All checks passed!"
  exit 0
else
  echo "Failed checks (${#failures[@]}):"
  for f in "${failures[@]}"; do
    echo "  - ${f}"
  done
  exit 1
fi
