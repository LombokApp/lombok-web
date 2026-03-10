#!/bin/bash

# Generic dev install script for demo apps
# Usage: ./dev-install.sh [--install-deps] [--run-scripts] <app-name>

set -euo pipefail

RUN_INSTALL=false
RUN_SCRIPTS=false

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-deps)
      RUN_INSTALL=true
      shift
      ;;
    --run-scripts)
      RUN_SCRIPTS=true
      shift
      ;;
    -*)
      echo "Unknown flag: $1"
      echo "Usage: $0 [--install-deps] [--run-scripts] <app-name>"
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

# Check for app name argument
if [ $# -eq 0 ]; then
  echo "Usage: $0 [--install-deps] [--run-scripts] <app-name>"
  echo "Example: $0 --install-deps --run-scripts simple-demo"
  exit 1
fi

APP_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/$APP_NAME"

# Validate app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo "Error: App directory '$APP_DIR' does not exist"
  exit 1
fi

# Optional: run bun install in the app directory
if [ "$RUN_INSTALL" = true ]; then
  echo "Running bun install in $APP_DIR..."
  (cd "$APP_DIR" && bun install)
fi

API_URL="${API_URL:-http://localhost:3000}"
CREDENTIALS_FILE="$SCRIPT_DIR/.lombok-credentials"
ZIP_FILE="$APP_NAME.zip"

echo "Starting dev install process for $APP_NAME..."

# Step 1: Build the bundle
echo "Step 1: Building bundle..."
"$SCRIPT_DIR/build-bundle.sh" "$APP_NAME"

# Step 2: Create zip file from bundle output
echo "Step 2: Creating zip file from bundle output..."
if [ ! -d "$APP_DIR/dist" ]; then
  echo "Error: Bundle directory '$APP_DIR/dist' not found"
  exit 1
fi

if [ -f "$APP_DIR/$ZIP_FILE" ]; then
  rm "$APP_DIR/$ZIP_FILE"
fi

cd "$APP_DIR/dist" || exit 1
zip -r "../$ZIP_FILE" . > /dev/null
cd "$SCRIPT_DIR" || exit 1

echo "Created $ZIP_FILE"

# Step 3: Load credentials from dot file
echo "Step 3: Loading credentials..."
if [ -f "$CREDENTIALS_FILE" ]; then
  source "$CREDENTIALS_FILE"
else
  echo "Warn: Credentials file '$CREDENTIALS_FILE' not found"
  echo "Using default dev credentials (Admin1)"
  USERNAME="Admin1"
  PASSWORD="123123123123"
fi

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Error: USERNAME and PASSWORD must be set in $CREDENTIALS_FILE" or remove the .lombok-credentials file
  exit 1
fi

# Step 4: Login to get authentication token
echo "Step 4: Logging in to Lombok platform..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "Error: Login failed with HTTP status $HTTP_CODE"
  echo "Response: $LOGIN_BODY"
  exit 1
fi

if command -v jq &> /dev/null; then
  TOKEN=$(echo "$LOGIN_BODY" | jq -r '.session.accessToken')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Error: Could not extract token from login response"
  echo "Response: $LOGIN_BODY"
  exit 1
fi

echo "Login successful"

# Step 5: Upload zip file to install endpoint
echo "Step 5: Installing app from zip file..."
INSTALL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/server/apps/install" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$APP_DIR/$ZIP_FILE")

HTTP_CODE=$(echo "$INSTALL_RESPONSE" | tail -n1)
INSTALL_BODY=$(echo "$INSTALL_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "Error: App installation failed with HTTP status $HTTP_CODE"
  echo "Response:"
  if command -v jq &> /dev/null; then
    echo "$INSTALL_BODY" | jq '.' || echo "$INSTALL_BODY"
  else
    echo "$INSTALL_BODY"
  fi
  exit 1
fi

echo "App installed successfully!"
echo "Response: $INSTALL_BODY"

# Step 6: Enable app for all users
echo "Step 6: Enabling app for all users..."
if command -v jq &> /dev/null; then
  APP_IDENTIFIER=$(echo "$INSTALL_BODY" | jq -r '.app.identifier')
else
  echo "Error: jq is required to extract app identifier from install response"
  exit 1
fi

if [ -z "$APP_IDENTIFIER" ] || [ "$APP_IDENTIFIER" = "null" ]; then
  echo "Warning: Could not extract app identifier from install response, skipping enable step"
else
  ENABLE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/api/v1/server/apps/$APP_IDENTIFIER/access-settings" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"userScopeEnabledDefault": true, "folderScopeEnabledDefault": true}')

  HTTP_CODE=$(echo "$ENABLE_RESPONSE" | tail -n1)
  ENABLE_BODY=$(echo "$ENABLE_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
    echo "Warning: Failed to enable app with HTTP status $HTTP_CODE"
    echo "Response: $ENABLE_BODY"
  else
    echo "App '$APP_IDENTIFIER' enabled for all users"
  fi
fi

# Step 7: Run dev scripts (optional)
if [ "$RUN_SCRIPTS" = true ]; then
  DEV_SCRIPTS_DIR="$APP_DIR/dev-scripts"
  if [ -d "$DEV_SCRIPTS_DIR" ]; then
    SCRIPTS=($(find "$DEV_SCRIPTS_DIR" -maxdepth 1 -name '*.ts' | sort))
    if [ ${#SCRIPTS[@]} -gt 0 ]; then
      echo "Step 7: Running ${#SCRIPTS[@]} dev script(s)..."
      for SCRIPT_FILE in "${SCRIPTS[@]}"; do
        SCRIPT_NAME=$(basename "$SCRIPT_FILE")
        echo "  Running $SCRIPT_NAME..."
        (cd "$APP_DIR" && APP_IDENTIFIER="$APP_IDENTIFIER" API_URL="$API_URL" API_TOKEN="$TOKEN" bun run "$SCRIPT_FILE")
        echo "  $SCRIPT_NAME completed"
      done
    else
      echo "Step 7: No dev scripts found in $DEV_SCRIPTS_DIR"
    fi
  else
    echo "Step 7: No dev-scripts/ directory found, skipping"
  fi
fi

# Step 8: Cleanup
echo "Cleaning up temporary zip file..."
rm -f "$APP_DIR/$ZIP_FILE"

echo ""
echo "Dev install completed successfully for $APP_NAME!"
