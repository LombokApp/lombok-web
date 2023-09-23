#!/bin/bash
set -e

# Set vars that typically do not vary by app
BRANCH=$(git rev-parse --symbolic-full-name --abbrev-ref HEAD | sed 's/[^A-Za-z0-9_\.-]/--/g' | head -c100)
SHA1=$(git rev-parse --short HEAD)
VERSION=$BRANCH-$SHA1-$(date +%s)
NAME=stellariscloud-worker
DOCKER_REGISTRY="docker.wasteofpaper.com"

echo "Logging into docker registry: $DOCKER_REGISTRY"
cat ./.docker-credentials | docker login $DOCKER_REGISTRY -u steven_peertjelabs --password-stdin

echo "Building version: $VERSION"
docker build --platform linux/amd64 --target release -t $NAME:$VERSION -f "../docker/worker.Dockerfile" ../
docker tag $NAME:$VERSION $DOCKER_REGISTRY/$NAME:$VERSION

echo "Pushing: $NAME:$VERSION"
docker push $DOCKER_REGISTRY/$NAME:$VERSION
