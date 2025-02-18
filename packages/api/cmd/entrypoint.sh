#!/bin/sh

# Copy the NGINX configuration
cp ./packages/api/nginx/frontend.conf /etc/nginx/http.d/default.conf

# Start or reload NGINX
# nginx nginx -s reload || nginx

if [ ! -f /run/nginx/nginx.pid ]; then
    nginx
else
    nginx -s reload
fi

# Start the backend
su-exec bun bun --cwd packages/api start