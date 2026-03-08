#!/bin/sh

APP_USER=bun

# Change to ./app relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/app" || { echo "Error: Cannot cd to $SCRIPT_DIR/app"; exit 1; }

# Clean up background processes on exit
cleanup() {
  kill $(jobs -p) 2>/dev/null
  wait
}
trap cleanup EXIT INT TERM

# Make nsjail setuid root
chown root:root /usr/bin/nsjail
chmod 4755 /usr/bin/nsjail

# ── Docker socket permissions ─────────────────────────────
echo "================================================"
echo "Docker socket permissions"
echo "================================================"
DOCKER_SOCKET="/var/run/docker.sock"
if [ -S "$DOCKER_SOCKET" ]; then
  chmod 666 "$DOCKER_SOCKET"
  echo "Docker socket at $DOCKER_SOCKET made accessible."
else
  echo "Warning: Docker socket $DOCKER_SOCKET not found."
fi

# ── PostgreSQL ──────────────────────────────────────────────
echo ""
echo "================================================"
echo "PostgreSQL"
echo "================================================"
export PGDATA='/var/lib/postgresql/data'

su-exec postgres mkdir -p "$PGDATA"
su-exec postgres chmod 0700 "$PGDATA"

# Initialize PostgreSQL data directory if not already initialized
if ! su-exec postgres test -f "$PGDATA/PG_VERSION"; then
    echo "Initializing PostgreSQL data directory..."
    su-exec postgres initdb -D "$PGDATA" --auth-local=trust --auth-host=md5
    echo "PostgreSQL data directory initialized."
fi

# Allow connections from any IP (dev only — connections come via Docker bridge)
# Must run as postgres because DAC_OVERRIDE is not in cap_add
su-exec postgres sh -c "grep -q '^host.*0\.0\.0\.0/0' '$PGDATA/pg_hba.conf' || echo 'host all all 0.0.0.0/0 trust' >> '$PGDATA/pg_hba.conf'"

# Start PostgreSQL, listening on all interfaces so host port-mapping works
su-exec postgres postgres -D "$PGDATA" -c listen_addresses='*' > /dev/stdout 2>&1 &

# Wait for PostgreSQL to become available
until su-exec postgres pg_isready -q; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done

# Create user if it doesn't exist
USER_EXISTS=$(su-exec postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}';")
if [ "$USER_EXISTS" != "1" ]; then
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres \
      -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEROLE CREATEDB SUPERUSER;"
else
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres \
      -c "ALTER USER ${DB_USER} WITH CREATEROLE CREATEDB SUPERUSER;"
fi

# Create database if it doesn't exist
DB_EXISTS=$(su-exec postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';")
if [ "$DB_EXISTS" != "1" ]; then
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres \
      -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

# Create extensions
su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" \
  -c "CREATE SCHEMA IF NOT EXISTS extensions;"
su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" \
  -c "GRANT USAGE ON SCHEMA extensions TO ${DB_USER};"
su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" \
  -c "CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;"

echo "PostgreSQL setup complete."
echo ""
echo "================================================"
echo "Environment variables"
echo "================================================"
printenv
echo ""

# ── MinIO ───────────────────────────────────────────────────
echo "================================================"
echo "MinIO"
echo "================================================"
export MINIO_DATA='/var/lib/minio/data'
export MINIO_ROOT_USER=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin

mkdir -p "$MINIO_DATA"
chown -R "$APP_USER":"$APP_USER" "$MINIO_DATA"
su-exec "$APP_USER" minio server "$MINIO_DATA" > /dev/stdout 2>&1 &

echo "Waiting for MinIO to be ready..."
until curl -sf http://127.0.0.1:9000/minio/health/live; do
  sleep 1
done
echo "MinIO is ready."

# Create bucket and dev user
mc alias set localminio http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" --quiet
mc mb --ignore-existing "localminio/${DEV_S3_BUCKET_NAME}"
mc admin user add localminio "${DEV_S3_ACCESS_KEY_ID}" "${DEV_S3_SECRET_ACCESS_KEY}" 2>/dev/null || true
mc admin policy attach localminio readwrite --user "${DEV_S3_ACCESS_KEY_ID}" 2>/dev/null || true
echo "MinIO bucket and user setup complete."
echo ""
echo "================================================"
echo "Install dependencies"
echo "================================================"
# ── Install dependencies ────────────────────────────────────
su-exec "$APP_USER" bun install
echo ""
echo "================================================"
echo "Database migrations and seed"
echo "================================================"
# ── Run migrations + idempotent seed ────────────────────────
su-exec "$APP_USER" bun --cwd packages/api db:migrate
su-exec "$APP_USER" bun --cwd packages/api db:seed --exit-0
echo ""
echo "================================================"
echo "Vite frontend dev server"
echo "================================================"
# ── Start Vite frontend dev server ──────────────────────────
su-exec "$APP_USER" bun --cwd packages/ui dev --host &
echo "Vite dev server starting on port 5173..."
echo ""
echo "================================================"
echo "Backend (foreground)"
echo "================================================"
# ── Start the backend (foreground, auto-restart on exit) ────
while true; do
  su-exec "$APP_USER" bun --cwd packages/api dev
  echo "API process exited, restarting in 1s..."
  sleep 1
done
