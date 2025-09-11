#!/bin/sh

# Make nsjail setuid root
chown root:root /usr/bin/nsjail
chmod 4755 /usr/bin/nsjail

# Start the backend
su-exec bun bun --cwd ./packages/api dev