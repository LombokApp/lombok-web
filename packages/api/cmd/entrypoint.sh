#!/bin/sh
set -e

APP_USER="${APP_USER:-bun}"

if [ -z "$PLATFORM_HOST" ]; then
    echo "Error: PLATFORM_HOST environment variable is required but not set"
    exit 1
fi

# Garage daemon env + launch helpers. Single source of truth shared by boot and
# the watchdog relaunch so the two can't drift. su-exec execs in place, so $! is
# the daemon PID, not a wrapper. Garage has no native pidfile — record our own.
export GARAGE_CONFIG_FILE='/var/lib/garage/garage.runtime.toml'
export RUST_LOG="${GARAGE_LOG_LEVEL:-error}"
GARAGE_PIDFILE='/var/lib/garage/.garage.pid'

start_garage() {
  su-exec "$APP_USER" garage server > /dev/stdout 2>&1 &
  echo $! > "$GARAGE_PIDFILE"
}
start_postgres() {
  su-exec postgres postgres -D "$PGDATA" > /dev/stdout 2>&1 &
}


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
    start_postgres

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

    # Create the extensions schema + vector extension as superuser, then hand
    # ownership to DB_USER so it can re-grant USAGE to the per-app roles the API
    # creates later. A plain GRANT USAGE can't be re-granted onward, so app
    # migrations would silently fail to resolve the vector type.
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" -c "CREATE SCHEMA IF NOT EXISTS extensions;"
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;"
    su-exec postgres psql -v ON_ERROR_STOP=1 --username postgres -d "${DB_NAME}" -c "ALTER SCHEMA extensions OWNER TO ${DB_USER};"

    echo "Database setup complete."
else
  echo "Skipping embedded postgres setup."
fi

# ── Garage (S3) ─────────────────────────────────────────────
echo ""
echo "================================================"
echo "Garage (S3)"
echo "================================================"
# Always-embedded builtin S3. No access key is supplied, so the provisioner
# auto-generates one on first boot and persists it to the data volume. The
# provisioner creates the three system buckets (server-storage / provisions /
# uploads); their names come from coreConfig, not from env.
APP_USER="$APP_USER" \
GARAGE_S3_KEY_NAME="lombok-builtin" \
  sh ./packages/api/cmd/garage-provision.sh

# Hand the builtin credentials to the foreground backend so it can derive the
# virtual builtin server-storage + storage-provision (see storage/embedded-s3.ts).
# Bucket names are coreConfig defaults, so only the credentials are exported.
. /var/lib/garage/.lombok-builtin-key
export EMBEDDED_S3_ACCESS_KEY_ID EMBEDDED_S3_SECRET_ACCESS_KEY
export EMBEDDED_S3_REGION="auto"

mkdir -p /var/lib/lombok && chown "$APP_USER" /var/lib/lombok

# ── Process supervision ─────────────────────────────────────
echo ""
echo "================================================"
echo "Process supervision"
echo "================================================"
# Garage and (embedded) Postgres run as background children; if either crashes
# the instance loses storage/DB with no recovery. A lightweight watchdog polls
# their health and relaunches whichever went down. Both relaunches are
# idempotent — data dirs, cluster layout and keys all persist on disk.
#
# The watchdog tracks each daemon's PID so it can kill a wedged-but-alive
# instance (still holding its ports) before relaunching, requires two consecutive
# failures before acting (transient-blip guard), and rate-limits relaunches with
# per-service exponential backoff. It never exits — a crash-looping dep is
# retried forever at the capped cadence rather than masked or fatal.
SUPERVISOR_INTERVAL_SECONDS="${SUPERVISOR_INTERVAL_SECONDS:-10}"
SUPERVISOR_FAIL_THRESHOLD="${SUPERVISOR_FAIL_THRESHOLD:-2}"
SUPERVISOR_MAX_BACKOFF_SECONDS="${SUPERVISOR_MAX_BACKOFF_SECONDS:-60}"

# Stop a wedged/dead instance, then relaunch via $relaunch.
#   $1 pid (may be empty/stale)   $2 relaunch fn
#   $3 stop signal (default TERM)   $4 escalation signal (default KILL)
# Sequence: stop-sig, 10s grace, escalation-sig, 5s grace, KILL (last resort),
# then reap.
#
# The signals are per-service because a bare TERM→KILL is wrong for Postgres:
# TERM is "smart shutdown" (the postmaster waits indefinitely for the API's
# pooled connections to close, so it never exits in the grace window), and
# SIGKILL of the postmaster orphans its backends — they keep the shared-memory
# segment, which makes the *relaunch* refuse to start. Postgres is therefore
# stopped with INT (fast shutdown) escalating to QUIT (immediate); both
# propagate to the backends and free shared memory. Garage keeps TERM/KILL.
recover() {
  _pid=$1; _relaunch=$2; _stop=${3:-TERM}; _esc=${4:-KILL}
  if [ -n "$_pid" ] && kill -0 "$_pid" 2>/dev/null; then
    kill -"$_stop" "$_pid" 2>/dev/null
    _n=0
    while kill -0 "$_pid" 2>/dev/null && [ "$_n" -lt 10 ]; do sleep 1; _n=$((_n + 1)); done
    if kill -0 "$_pid" 2>/dev/null; then
      kill -"$_esc" "$_pid" 2>/dev/null
      _n=0
      while kill -0 "$_pid" 2>/dev/null && [ "$_n" -lt 5 ]; do sleep 1; _n=$((_n + 1)); done
      kill -KILL "$_pid" 2>/dev/null   # absolute last resort
    fi
    wait "$_pid" 2>/dev/null   # reaps it when the relaunch made it our child
  fi
  "$_relaunch"
}

supervise() {
  set +e   # a watchdog must never die on a failed check
  garage_fails=0; garage_cooldown=0; garage_backoff=$SUPERVISOR_INTERVAL_SECONDS
  pg_fails=0;     pg_cooldown=0;     pg_backoff=$SUPERVISOR_INTERVAL_SECONDS

  while true; do
    sleep "$SUPERVISOR_INTERVAL_SECONDS"

    # ── Garage ──
    if [ "$garage_cooldown" -gt 0 ]; then
      garage_cooldown=$((garage_cooldown - SUPERVISOR_INTERVAL_SECONDS))
    elif garage status > /dev/null 2>&1; then
      garage_fails=0; garage_backoff=$SUPERVISOR_INTERVAL_SECONDS   # healthy → reset
    else
      garage_fails=$((garage_fails + 1))
      if [ "$garage_fails" -ge "$SUPERVISOR_FAIL_THRESHOLD" ]; then
        echo "[supervisor] Garage unhealthy ${garage_fails}x — recovering (next check in ${garage_backoff}s)."
        recover "$(cat "$GARAGE_PIDFILE" 2>/dev/null)" start_garage
        garage_fails=0
        garage_cooldown=$garage_backoff
        garage_backoff=$((garage_backoff * 2))
        if [ "$garage_backoff" -gt "$SUPERVISOR_MAX_BACKOFF_SECONDS" ]; then
          garage_backoff=$SUPERVISOR_MAX_BACKOFF_SECONDS
        fi
      fi
    fi

    # ── Postgres (embedded only) ──
    if [ "$EMBEDDED_POSTGRES" = "true" ]; then
      if [ "$pg_cooldown" -gt 0 ]; then
        pg_cooldown=$((pg_cooldown - SUPERVISOR_INTERVAL_SECONDS))
      elif su-exec postgres pg_isready -q > /dev/null 2>&1; then
        pg_fails=0; pg_backoff=$SUPERVISOR_INTERVAL_SECONDS
      else
        pg_fails=$((pg_fails + 1))
        if [ "$pg_fails" -ge "$SUPERVISOR_FAIL_THRESHOLD" ]; then
          echo "[supervisor] PostgreSQL unhealthy ${pg_fails}x — recovering (next check in ${pg_backoff}s)."
          recover "$(head -1 "$PGDATA/postmaster.pid" 2>/dev/null)" start_postgres INT QUIT
          pg_fails=0
          pg_cooldown=$pg_backoff
          pg_backoff=$((pg_backoff * 2))
          if [ "$pg_backoff" -gt "$SUPERVISOR_MAX_BACKOFF_SECONDS" ]; then
            pg_backoff=$SUPERVISOR_MAX_BACKOFF_SECONDS
          fi
        fi
      fi
    fi
  done
}
supervise &
echo "Supervisor watching Garage${EMBEDDED_POSTGRES:+ + PostgreSQL} (interval ${SUPERVISOR_INTERVAL_SECONDS}s, confirm ${SUPERVISOR_FAIL_THRESHOLD}x, backoff cap ${SUPERVISOR_MAX_BACKOFF_SECONDS}s)."

# ── Backend (foreground) ────────────────────────────────────
echo ""
echo "================================================"
echo "Backend (foreground)"
echo "================================================"
# Start the backend
su-exec "$APP_USER" bun --cwd packages/api start