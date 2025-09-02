#!/bin/sh

# Make nsjail setuid root
chown root:root /usr/bin/nsjail
chmod 4755 /usr/bin/nsjail
 
CALLER=1000            # whatever your app runs as in dev
TARGET=1001            # the uid you pass to --user
mkdir -p /tmp/nsjail.$CALLER.root /tmp/nsjail.$CALLER.tmp
chown -R $TARGET:$TARGET /tmp/nsjail.$CALLER.root /tmp/nsjail.$CALLER.tmp
chmod 0700 /tmp/nsjail.$CALLER.root /tmp/nsjail.$CALLER.tmp
chmod 1777 /tmp   # ensure sticky/writable

# Start the backend
su-exec bun bun --cwd ./packages/api dev