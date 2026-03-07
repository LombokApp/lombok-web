#!/bin/bash

# Generic dev install script for demo apps
# Usage: ./dev-install.sh [--install-deps] <app-name>

set -euo pipefail

RUN_INSTALL=false

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-deps)
      RUN_INSTALL=true
      shift
      ;;
    -*)
      echo "Unknown flag: $1"
      echo "Usage: $0 [--install-deps] <app-name>"
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

# Check for app name argument
if [ $# -eq 0 ]; then
  echo "Usage: $0 [--install-deps] <app-name>"
  echo "Example: $0 --install-deps simple-demo"
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

# Step 6: Cleanup
echo "Cleaning up temporary zip file..."
rm -f "$APP_DIR/$ZIP_FILE"

echo "Dev install completed successfully for $APP_NAME!"
