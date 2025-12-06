#!/bin/sh

# Make nsjail setuid root
chown root:root /usr/bin/nsjail
chmod 4755 /usr/bin/nsjail

APP_USER="bun"

PROXY_SOCKET="${PROXY_SOCKET:-/tmp/docker-proxy.sock}"
if [ -n "$LOCAL_DOCKER_SOCKET" ]; then
  # It's a socket path - check if socket exists and set up proxy
  if [ -S "$LOCAL_DOCKER_SOCKET" ]; then
    echo "Starting Docker socket proxy: $PROXY_SOCKET -> $LOCAL_DOCKER_SOCKET"

    # Remove stale proxy socket, if any
    rm -f "$PROXY_SOCKET"

    # socat will:
    # - listen on PROXY_SOCKET
    # - forward to LOCAL_DOCKER_SOCKET
    # - create PROXY_SOCKET owned by APP_USER, mode 660
    socat \
      UNIX-LISTEN:"$PROXY_SOCKET",fork,mode=660,user="$APP_USER",group="$APP_USER" \
      UNIX-CONNECT:"$LOCAL_DOCKER_SOCKET" &
  else
    echo "Warning: Docker socket $LOCAL_DOCKER_SOCKET not found."
  fi
fi

# Start the backend
su-exec "$APP_USER" bun --cwd ./packages/api dev