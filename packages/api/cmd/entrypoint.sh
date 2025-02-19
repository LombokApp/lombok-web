#!/bin/sh

# Copy the NGINX configuration
cp ./packages/api/nginx/nginx.conf /etc/nginx/http.d/default.conf

# Start or reload NGINX
if [ ! -f /run/nginx/nginx.pid ]; then
    nginx
else
    nginx -s reload
fi

# Start the Next.js server in the frontend directory
# cd packages/ui && NODE_ENV=production bunx next start -p 8080 &
# NODE_ENV=production bun --cwd packages/ui next start -p 8080 &
NODE_ENV=production bun --cwd packages/ui start &

# Start the backend
su-exec bun bun --cwd packages/api start