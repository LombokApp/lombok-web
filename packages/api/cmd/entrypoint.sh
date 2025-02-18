#!/bin/sh

# Copy the NGINX configuration
cp ./packages/api/nginx/frontend.conf /etc/nginx/conf.d/

# Start or reload NGINX
nginx -s reload || nginx

# Start the backend
exec bun --cwd packages/api start