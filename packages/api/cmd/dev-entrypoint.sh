#!/bin/sh

# Make nsjail setuid root
chown root:root /usr/bin/nsjail
chmod 4755 /usr/bin/nsjail

APP_USER="bun"

# Check if DOCKER_HOST is an HTTP/HTTPS endpoint (not a socket path)
DOCKER_HOST="${DOCKER_HOST:-/var/run/docker.sock}"
PROXY_SOCKET="${PROXY_SOCKET:-/tmp/docker-proxy.sock}"
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

# Start the backend
su-exec "$APP_USER" bun --cwd ./packages/api dev