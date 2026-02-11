#!/bin/bash
set -e

echo "Testing GitHub Actions workflows with act..."
echo ""

# Linting jobs (linting.yml)
LINTING_JOBS=(
  "check-ui"
  "check-api"
  "check-core-worker"
  "check-worker-utils"
  "check-app-browser-sdk"
  "check-app-worker-sdk"
  "check-simple-demo"
  "check-sdk"
  "check-auth-utils"
  "check-lombok-utils"
  "check-lombok-types"
  "check-ui-toolkit"
)

# Unit test jobs (unit-tests.yml)
UNIT_TEST_JOBS=(
  "check-api"
  "check-app-worker-sdk"
  "check-lombok-types"
  "check-utils"
)

# E2E test jobs (e2e-api-tests.yml, e2e-ui-tests.yml)
E2E_JOBS=(
  "run-api-e2e-tests"
  "run-ui-e2e-tests"
)

echo "Linting jobs (${#LINTING_JOBS[@]}):"
for job in "${LINTING_JOBS[@]}"; do
  echo "  - $job"
done
echo ""
echo "Unit test jobs (${#UNIT_TEST_JOBS[@]}):"
for job in "${UNIT_TEST_JOBS[@]}"; do
  echo "  - $job"
done
echo ""
echo "E2E test jobs (${#E2E_JOBS[@]}):"
for job in "${E2E_JOBS[@]}"; do
  echo "  - $job"
done
echo ""

TOTAL=$(( ${#LINTING_JOBS[@]} + ${#UNIT_TEST_JOBS[@]} + ${#E2E_JOBS[@]} ))
echo "Total: $TOTAL jobs across 4 workflows"
echo ""

# Check if act is available
if ! command -v act &> /dev/null; then
  echo "❌ act is not installed. Please install it first:"
  echo "   brew install act"
  exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

echo "🚀 Running all jobs with act..."
echo "Note: This may take a while and will use significant system resources"
echo ""

# Run all jobs
act --container-architecture linux/amd64

echo ""
echo "✅ Workflow testing completed!" 
