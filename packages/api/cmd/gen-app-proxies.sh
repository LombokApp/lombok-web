#!/bin/sh
# Build /etc/nginx/app_frontend_proxies.json from LOMBOK_APP_FRONTEND_PROXY_HOST_*
# entries in packages/ui/.env.development.local, then reload nginx. app_router.js
# reads this file to override the per-app UI proxy target in dev. Run as root —
# the nginx master is root-owned, so `nginx -s reload` needs root.

cd /usr/src/app || { echo "Error: Cannot cd to /usr/src/app"; exit 1; }

PLATFORM_HOST="${PLATFORM_HOST:-lombok.localhost}"
APP_UI_HOST="${APP_UI_HOST:-http://127.0.0.1:3001}"

# Template the nginx conf + copy the njs router so config edits apply on reload.
sed -e "s|{{PLATFORM_HOST}}|$PLATFORM_HOST|g" -e "s|{{APP_UI_HOST}}|$APP_UI_HOST|g" ./packages/api/nginx/dev-nginx.conf > /etc/nginx/http.d/default.conf
cp ./packages/api/nginx/app_router.js /etc/nginx/app_router.js

APP_FRONTEND_PROXIES_ENV="./packages/ui/.env.development.local"

# Active (uncommented) overrides as lowercase `key=url` lines, e.g.
#   homicle_7d940475=http://host.docker.internal:5177
if [ -f "$APP_FRONTEND_PROXIES_ENV" ]; then
  PAIRS=$(grep -v '^\s*#' "$APP_FRONTEND_PROXIES_ENV" \
    | grep 'LOMBOK_APP_FRONTEND_PROXY_HOST_' \
    | sed 's/LOMBOK_APP_FRONTEND_PROXY_HOST_//' \
    | awk -F= '{printf "%s=%s\n", tolower($1), $2}')
else
  PAIRS=""
fi

if [ -n "$PAIRS" ]; then
  # Join the pairs into a JSON object. One pair per line is required so paste
  # has lines to join — without the newline the commas are dropped (invalid JSON).
  ENTRIES=$(printf '%s\n' "$PAIRS" | awk -F= '{printf "\"%s\": \"%s\"\n", $1, $2}' | paste -sd, -)
  echo "{${ENTRIES}}" > /etc/nginx/app_frontend_proxies.json
  echo "App frontend proxy overrides:"
  cat /etc/nginx/app_frontend_proxies.json

  # Probe each override; warn (don't fail) if nothing is listening on the port.
  printf '%s\n' "$PAIRS" | while IFS='=' read -r key url; do
    [ -z "$url" ] && continue
    if ! curl -s -o /dev/null --connect-timeout 2 "$url"; then
      echo "WARNING: ${key} -> ${url} not reachable (is the app's dev server running on that port?)"
    fi
  done
else
  echo "{}" > /etc/nginx/app_frontend_proxies.json
  echo "No app frontend proxy overrides (${APP_FRONTEND_PROXIES_ENV} not found or has no active entries)"
fi

if [ -f /run/nginx/nginx.pid ] && kill -0 $(cat /run/nginx/nginx.pid) 2>/dev/null; then
    nginx -s reload
else
    nginx
fi
echo "NGINX started on port 8080"
