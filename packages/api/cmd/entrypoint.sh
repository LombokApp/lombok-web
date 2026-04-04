#!/bin/sh

APP_USER="${APP_USER:-bun}"

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

# ── Docker socket permissions ─────────────────────────────
echo ""
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
if [ "$EMBEDDED_POSTGRES" = "true" ]; then
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
        su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEROLE;"
    else
        # Ensure existing user has CREATEROLE privilege
        su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -c "ALTER USER ${DB_USER} WITH CREATEROLE;"
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
else
  echo "Skipping embedded postgres setup."
fi

mkdir -p /var/lib/lombok && chown "$APP_USER" /var/lib/lombok

# ── Backend (foreground) ────────────────────────────────────
echo ""
echo "================================================"
echo "Backend (foreground)"
echo "================================================"
# Start the backend
su-exec "$APP_USER" bun --cwd packages/api start