#!/bin/bash
set -e

BRANCH=$(git rev-parse --symbolic-full-name --abbrev-ref HEAD | sed 's/[^A-Za-z0-9_\.-]/--/g' | head -c100)
SHA1=$(git rev-parse --short HEAD)
VERSION=$BRANCH-$SHA1-$(date +%s)
NAME=stellariscloud-separate-db

echo "Building version: $VERSION"
docker build --platform linux/amd64 --target release -t $NAME:$VERSION -f "../docker/app.Dockerfile" ../
