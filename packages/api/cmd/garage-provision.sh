#!/bin/sh
# Start a single-node Garage daemon and provision a key + bucket for local
# dev/e2e. Shared by dev-entrypoint.sh and test-entrypoint.sh. Idempotent so it
# survives the persisted dev data volume.
#
# Inputs (env):
#   GARAGE_CONFIG_FILE       path to garage.toml (default /etc/garage.toml)
#   APP_USER                 user that owns the data dirs / runs the daemon (default bun)
#   GARAGE_S3_ACCESS_KEY_ID  fixed access key to import
#   GARAGE_S3_SECRET_KEY     fixed secret for that key
#   GARAGE_S3_BUCKET         bucket to create + grant the key on
#   GARAGE_S3_KEY_NAME       key label (default lombok)
#   GARAGE_S3_ENDPOINT       S3 endpoint for the CORS step (default http://127.0.0.1:9000)
#   GARAGE_KEY_CREATE_BUCKET set to 1 to also grant the key createBucket (e2e harness)
#   GARAGE_LOG_LEVEL         daemon+CLI log verbosity (RUST_LOG; default "error")
set -e

export GARAGE_CONFIG_FILE="${GARAGE_CONFIG_FILE:-/etc/garage.toml}"
# Quiet by default so Garage doesn't flood dev/e2e output; raise to info/debug
# via GARAGE_LOG_LEVEL when diagnosing. Applies to the daemon and the CLI calls.
export RUST_LOG="${GARAGE_LOG_LEVEL:-error}"
APP_USER="${APP_USER:-bun}"
GARAGE_S3_KEY_NAME="${GARAGE_S3_KEY_NAME:-lombok}"
GARAGE_S3_ENDPOINT="${GARAGE_S3_ENDPOINT:-http://127.0.0.1:9000}"
GARAGE_DATA_ROOT='/var/lib/garage'
LAYOUT_SENTINEL="${GARAGE_DATA_ROOT}/.lombok-layout-applied"

mkdir -p "$GARAGE_DATA_ROOT"
chown -R "$APP_USER":"$APP_USER" "$GARAGE_DATA_ROOT"

# Daemon runs as APP_USER (owns the data dirs); CLI runs as the current user and
# reaches the daemon over RPC using the secret in the config file.
su-exec "$APP_USER" garage server > /dev/stdout 2>&1 &

echo "Waiting for Garage to be ready..."
until garage status > /dev/null 2>&1; do
  sleep 1
done
echo "Garage daemon is up."

# Cluster layout: assign this lone node a role once, then never again (the
# next apply would be a new version). Sentinel persists on the dev volume.
if [ ! -f "$LAYOUT_SENTINEL" ]; then
  NODE_ID=$(garage node id -q 2>/dev/null | head -1 | cut -d@ -f1)
  garage layout assign -z dc1 -c 1G "$NODE_ID"
  garage layout apply --version 1
  touch "$LAYOUT_SENTINEL"
  echo "Garage cluster layout applied."
fi

# Wait for the node to be ready to serve data after layout.
until garage status > /dev/null 2>&1; do
  sleep 1
done

# Key: import the fixed dev/test credentials (idempotent).
if ! garage key info "$GARAGE_S3_ACCESS_KEY_ID" > /dev/null 2>&1; then
  garage key import --yes -n "$GARAGE_S3_KEY_NAME" \
    "$GARAGE_S3_ACCESS_KEY_ID" "$GARAGE_S3_SECRET_KEY"
fi

if [ "${GARAGE_KEY_CREATE_BUCKET:-0}" = "1" ]; then
  garage key allow --create-bucket "$GARAGE_S3_ACCESS_KEY_ID"
fi

# Bucket: create + grant the key full access (idempotent).
if ! garage bucket info "$GARAGE_S3_BUCKET" > /dev/null 2>&1; then
  garage bucket create "$GARAGE_S3_BUCKET"
fi
garage bucket allow --read --write --owner "$GARAGE_S3_BUCKET" \
  --key "$GARAGE_S3_ACCESS_KEY_ID"

# CORS: Garage (unlike MinIO) is not permissive by default. Browser-direct
# presigned uploads/downloads need an explicit rule on the bucket.
GARAGE_S3_ACCESS_KEY_ID="$GARAGE_S3_ACCESS_KEY_ID" \
GARAGE_S3_SECRET_KEY="$GARAGE_S3_SECRET_KEY" \
GARAGE_S3_BUCKET="$GARAGE_S3_BUCKET" \
GARAGE_S3_ENDPOINT="$GARAGE_S3_ENDPOINT" \
  su-exec "$APP_USER" bun /usr/src/app/packages/api/cmd/garage-set-cors.ts

echo "Garage key, bucket and CORS setup complete."
