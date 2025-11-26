#!/bin/sh

APP_USER="${APP_USER:-bun}"

if [ -z "$PLATFORM_HOST" ]; then
    echo "Error: PLATFORM_HOST environment variable is required but not set"
    exit 1
fi


APP_UI_HOST=${APP_UI_HOST:-"http://127.0.0.1:3001"}

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

DOCKER_HOST="${DOCKER_HOST:-/var/run/docker.sock}"
PROXY_SOCKET="${PROXY_SOCKET:-/tmp/docker-proxy.sock}"

# Check if DOCKER_HOST is an HTTP/HTTPS endpoint (not a socket path)
case "$DOCKER_HOST" in
  http://*|https://*)
    echo "Docker host is an HTTP endpoint: $DOCKER_HOST (skipping socket proxy)"
    ;;
  *)
    # It's a socket path - check if socket exists and set up proxy
    if [ -S "$DOCKER_HOST" ]; then
      echo "Starting Docker socket proxy: $PROXY_SOCKET -> $DOCKER_HOST"

      # Remove stale proxy socket, if any
      rm -f "$PROXY_SOCKET"

      # socat will:
      # - listen on PROXY_SOCKET
      # - forward to DOCKER_HOST
      # - create PROXY_SOCKET owned by APP_USER, mode 660
      socat \
        UNIX-LISTEN:"$PROXY_SOCKET",fork,mode=660,user="$APP_USER",group="$APP_USER" \
        UNIX-CONNECT:"$DOCKER_HOST" &
    else
      echo "Warning: Docker socket $DOCKER_HOST not found."
    fi
    ;;
esac

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
        su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
    fi

    # Check if the database exists before creating it
    DB_EXISTS=$(su-exec postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';")
    if [ "$DB_EXISTS" != "1" ]; then
        su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
        # su-exec postgres createdb --username postgres --owner=${DB_USER} ${DB_NAME}
    fi

    echo "Database setup complete."
else
  echo "Skipping embedded postgres setup."
fi


# Start the backend
su-exec "$APP_USER" bun --cwd packages/api start