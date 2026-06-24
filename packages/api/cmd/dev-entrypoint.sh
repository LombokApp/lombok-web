#!/bin/sh

APP_USER=bun
PLATFORM_HOST="${PLATFORM_HOST:-lombok.localhost}"
APP_UI_HOST="${APP_UI_HOST:-http://127.0.0.1:3001}"

cd /usr/src/app || { echo "Error: Cannot cd to /usr/src/app"; exit 1; }

# Kill background processes on exit.
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

# ── NGINX ──────────────────────────────────────────────────
echo ""
echo "================================================"
echo "NGINX"
echo "================================================"
# Shared with `./dx restart proxies`.
sh ./packages/api/cmd/gen-app-proxies.sh

# ── PostgreSQL ──────────────────────────────────────────────
echo ""
echo "================================================"
echo "PostgreSQL"
echo "================================================"
export PGDATA='/var/lib/postgresql/data'

su-exec postgres mkdir -p "$PGDATA"
su-exec postgres chmod 0700 "$PGDATA"

if ! su-exec postgres test -f "$PGDATA/PG_VERSION"; then
    echo "Initializing PostgreSQL data directory..."
    su-exec postgres initdb -D "$PGDATA" --auth-local=trust --auth-host=md5
    echo "PostgreSQL data directory initialized."
fi

# Allow connections from any IP (dev only). Runs as postgres since DAC_OVERRIDE isn't in cap_add.
su-exec postgres sh -c "grep -q '^host.*0\.0\.0\.0/0' '$PGDATA/pg_hba.conf' || echo 'host all all 0.0.0.0/0 trust' >> '$PGDATA/pg_hba.conf'"

# listen_addresses='*' so host port-mapping works.
su-exec postgres postgres -D "$PGDATA" -c listen_addresses='*' > /dev/stdout 2>&1 &

until su-exec postgres pg_isready -q; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done

USER_EXISTS=$(su-exec postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}';")
if [ "$USER_EXISTS" != "1" ]; then
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres \
      -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEROLE CREATEDB SUPERUSER;"
else
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres \
      -c "ALTER USER ${DB_USER} WITH CREATEROLE CREATEDB SUPERUSER;"
fi

DB_EXISTS=$(su-exec postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';")
if [ "$DB_EXISTS" != "1" ]; then
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres \
      -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

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

# ── Garage (S3) ─────────────────────────────────────────────
echo "================================================"
echo "Garage"
echo "================================================"
APP_USER="$APP_USER" \
GARAGE_S3_ACCESS_KEY_ID="${DEV_S3_ACCESS_KEY_ID}" \
GARAGE_S3_SECRET_KEY="${DEV_S3_SECRET_ACCESS_KEY}" \
GARAGE_S3_BUCKET="${DEV_S3_BUCKET_NAME}" \
GARAGE_S3_KEY_NAME="lombokdev" \
GARAGE_LOG_LEVEL="${DEV_S3_LOG_LEVEL:-error}" \
  sh ./packages/api/cmd/garage-provision.sh
echo ""
echo "================================================"
echo "Install dependencies"
echo "================================================"
su-exec "$APP_USER" bun install
echo ""
echo "================================================"
echo "Database migrations and seed"
echo "================================================"
su-exec "$APP_USER" bun --cwd packages/api db:migrate
su-exec "$APP_USER" bun --cwd packages/api db:seed --exit-0
echo ""
echo "================================================"
echo "Vite frontend dev server"
echo "================================================"
su-exec "$APP_USER" bun --cwd packages/ui dev --host &
echo "Vite dev server starting on port 5173..."
echo ""
echo "================================================"
echo "Backend (foreground)"
echo "================================================"

mkdir -p /var/lib/lombok && chown "$APP_USER" /var/lib/lombok

# Foreground, auto-restart on exit.
while true; do
  su-exec "$APP_USER" bun --cwd packages/api dev
  echo "API process exited, restarting in 1s..."
  sleep 1
done
