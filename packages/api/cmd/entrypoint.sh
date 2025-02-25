#!/bin/sh

# Copy the NGINX configuration
cp ./packages/api/nginx/nginx.conf /etc/nginx/http.d/default.conf

# Start or reload NGINX
if [ ! -f /run/nginx/nginx.pid ]; then
    nginx
else
    nginx -s reload
fi

# su-exec postgres postgres 2>&
su-exec postgres postgres -D /var/lib/postgresql/data > /dev/stdout 2>&1 &

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

# Start the backend
su-exec bun bun --cwd packages/api start