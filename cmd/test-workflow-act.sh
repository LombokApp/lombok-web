#!/bin/bash
set -e

echo "Testing GitHub Actions workflow with act..."
echo "This will run all 11 jobs in parallel (if your system supports it)"
echo ""

# List of all job names from the workflow
JOBS=(
  "check-ui"
  "check-api"
  "check-core-worker"
  "check-app-browser-sdk"
  "check-app-worker-sdk"
  "check-app-demo"
  "check-sdk"
  "check-auth-utils"
  "check-stellaris-utils"
  "check-stellaris-types"
  "check-ui-toolkit"
)

echo "Available jobs:"
for job in "${JOBS[@]}"; do
  echo "  - $job"
done
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