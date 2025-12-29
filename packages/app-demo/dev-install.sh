#!/bin/bash

# Dev install script for lombok demo app
# This script builds the bundle, zips it, and installs it via the lombok platform API

set -e  # Exit on any error

API_URL="http://localhost:3000"
CREDENTIALS_FILE=".lombok-credentials"
ZIP_FILE="bundle-dist.zip"
BUNDLE_DIR="bundle-dist"

echo "Starting dev install process..."

# Step 1: Build the bundle
echo "Step 1: Building bundle..."
bun build:bundle

# Step 2: Create zip file from bundle-dist
echo "Step 2: Creating zip file from bundle output..."
if [ -f "$ZIP_FILE" ]; then
  rm "$ZIP_FILE"
fi

cd "$BUNDLE_DIR" || exit 1
zip -r "../$ZIP_FILE" . > /dev/null
cd .. || exit 1

echo "Created $ZIP_FILE"

# Step 3: Load credentials from dot file
echo "Step 3: Loading credentials..."
if [ ! -f "$CREDENTIALS_FILE" ]; then
  echo "Error: Credentials file '$CREDENTIALS_FILE' not found in project root"
  echo "Please create a file with the following format:"
  echo "  USERNAME=your-username"
  echo "  PASSWORD=your-password"
  exit 1
fi

# Source the credentials file
# shellcheck source=/dev/null
source "$CREDENTIALS_FILE"

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Error: USERNAME and PASSWORD must be set in $CREDENTIALS_FILE"
  exit 1
fi

# Step 4: Login to get authentication token
echo "Step 4: Logging in to lombok platform..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
# Extract response body (all but last line)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

# Check HTTP status code
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "Error: Login failed with HTTP status $HTTP_CODE"
  echo "Response: $LOGIN_BODY"
  exit 1
fi

# Extract token from session.accessToken
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
  -F "file=@$ZIP_FILE")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$INSTALL_RESPONSE" | tail -n1)
# Extract response body (all but last line)
INSTALL_BODY=$(echo "$INSTALL_RESPONSE" | sed '$d')

# Check HTTP status code
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "Error: App installation failed with HTTP status $HTTP_CODE"
  echo "Response: $INSTALL_BODY"
  exit 1
fi

echo "App installed successfully!"
echo "Response: $INSTALL_BODY"

# Cleanup
echo "Cleaning up temporary zip file..."
rm -f "$ZIP_FILE"

echo "Dev install completed successfully!"

