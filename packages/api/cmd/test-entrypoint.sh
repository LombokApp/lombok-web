#!/bin/sh

APP_USER=bun

# Change to ./app relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/app" || { echo "Error: Cannot cd to $SCRIPT_DIR/app"; exit 1; }

# Database configuration (used for tests and migrations)
export DB_HOST=localhost
export DB_USER=lombok_test
export DB_PORT=5432
export DB_NAME=lombok_test
export DB_PASSWORD=XXXXXXXXXXXXXXXXXXXXXXXX
export POSTGRES_USER="$DB_USER"
export POSTGRES_PASSWORD="$DB_PASSWORD"
export DOCKER_HOST_CONFIG='{"hosts":{"local":{"type":"docker_endpoint","host":"/var/run/docker.sock","gpus":{"testapp:dummy_profile":{"driver":"nvidia","deviceIds":["0"]}},"volumes":{"testapp:dummy_profile":["/app/model_cache:/mnt/user/appdata/somepath"]}}}}'
export PLATFORM_HOST="localhost"
export PLATFORM_HTTPS="false"
export PLATFORM_PORT="3000"
export AUTH_EMAIL_VERIFICATION_JWT_SECRET="00000000000000000000000000000000"
export AUTH_JWT_SECRET="00000000000000000000000000000000"
export CREATE_DATABASE="true"
export RUN_MIGRATIONS="true"
export PRINT_CORE_WORKER_OUTPUT="true"
export PRINT_CORE_WORKER_NSJAIL_VERBOSE_OUTPUT="true"
export APP_BUNDLES_PATH="/tmp/lombok-apps"
export LOG_LEVEL=""


if [ -z "$PLATFORM_HOST" ]; then
    echo "Error: PLATFORM_HOST environment variable is required but not set"
    exit 1
fi


APP_UI_HOST=${APP_UI_HOST:-"http://127.0.0.1:3001"}

# ── NGINX ──────────────────────────────────────────────────
echo "================================================"
echo "NGINX"
echo "================================================"
# Copy the NGINX configuration and replace the domain placeholder
sed -e "s|{{PLATFORM_HOST}}|$PLATFORM_HOST|g" -e "s|{{APP_UI_HOST}}|$APP_UI_HOST|g" ./packages/api/nginx/nginx.conf > /etc/nginx/http.d/default.conf

# Make nsjail setuid root
chown root:root /usr/bin/nsjail
chmod 4755 /usr/bin/nsjail

# Start or reload NGINX
if [ -f /run/nginx/nginx.pid ] && kill -0 $(cat /run/nginx/nginx.pid) 2>/dev/null; then
    nginx -s reload
else
    nginx
fi

# ── PostgreSQL ──────────────────────────────────────────────
echo ""
echo "================================================"
echo "PostgreSQL"
echo "================================================"
export PGDATA='/var/lib/postgresql/data'
mkdir -p "$PGDATA"
chown -R postgres:postgres "$PGDATA"
chmod -R 0700 "$PGDATA"

# Initialize PostgreSQL data directory if it's empty
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL data directory..."
    su-exec postgres initdb -D "$PGDATA" --auth-local=trust --auth-host=md5
    echo "PostgreSQL data directory initialized."
fi

# Start PostgreSQL
su-exec postgres postgres -D "$PGDATA" > /dev/stdout 2>&1 &

# Wait for PostgreSQL to become available
until su-exec postgres pg_isready -q; do
echo "Waiting for PostgreSQL to start..."
sleep 2
done

# Check if the user exists before creating it
USER_EXISTS=$(su-exec postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}';")
if [ "$USER_EXISTS" != "1" ]; then
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEROLE CREATEDB SUPERUSER;"
else
    # Ensure existing user has full privileges (tests create isolated DBs and extensions per test)
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -c "ALTER USER ${DB_USER} WITH CREATEROLE CREATEDB SUPERUSER;"
fi

# Check if the database exists before creating it
DB_EXISTS=$(su-exec postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';")
if [ "$DB_EXISTS" != "1" ]; then
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
    # su-exec postgres createdb --username postgres --owner=${DB_USER} ${DB_NAME}
fi

# Create extensions schema and vector extension as superuser
# This is required because extension creation typically needs superuser privileges
su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" -c "CREATE SCHEMA IF NOT EXISTS extensions;"
su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" -c "GRANT USAGE ON SCHEMA extensions TO ${DB_USER};"
su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;"

echo "Database setup complete."

echo ""
echo "================================================"
echo "Environment variables"
echo "================================================"
printenv
echo ""

# ── MinIO ───────────────────────────────────────────────────
echo ""
echo "================================================"
echo "MinIO"
echo "================================================"
export MINIO_DATA='/var/lib/minio/data'
export MINIO_BROWSER='off'
export MINIO_ROOT_USER=lomboktestadmin
export MINIO_ROOT_PASSWORD=lomboktestadmin

mkdir -p "$MINIO_DATA"
chmod -R 777 "$MINIO_DATA"
su-exec "$APP_USER" minio server "$MINIO_DATA" > /dev/stdout 2>&1 &
echo "Minio started."

echo "Waiting for MinIO to be ready..."
until curl -sf http://127.0.0.1:9000/minio/health/live; do
  echo "MinIO not ready yet, waiting..."
  sleep 2
done
echo "MinIO is ready."

# ── Tests ───────────────────────────────────────────────────
echo ""
echo "================================================"
echo "Tests"
echo "================================================"
# Start the tests
su-exec "$APP_USER" bun --env --cwd packages/api ./test/e2e.run.ts "$@"
