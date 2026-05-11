#!/bin/bash
set -e

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>   (e.g. $0 1.2.1-beta-rc3)" >&2
    exit 1
fi

SHA1=$(git rev-parse --short HEAD)
BUILD_ID="$VERSION-$SHA1"
NAME=lombok

echo "Building build ID: $BUILD_ID"
docker build --platform linux/amd64 --no-cache --build-arg LOMBOK_BUILD_ID=$BUILD_ID --target release -t $NAME:$BUILD_ID -t $NAME:latest -f "../docker/app.Dockerfile" ../
