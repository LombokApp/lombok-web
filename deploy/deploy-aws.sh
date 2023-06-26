#!/bin/bash
set -e

# Set vars that typically do not vary by app
BRANCH=$(git rev-parse --symbolic-full-name --abbrev-ref HEAD | sed 's/[^A-Za-z0-9_\.-]/--/g' | head -c100)
SHA1=$(git rev-parse --short HEAD)
VERSION=$BRANCH-$SHA1-$(date +%s)
# VERSION=latest
ZIP=$VERSION.zip

aws configure set default.region $AWS_REGION

# Authenticate against our Docker registry
aws ecr get-login-password --profile stellariscloud --region $AWS_REGION | docker login \
    --username AWS \
    --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push the image
docker build "${DOCKER_BUILD_ARGS[@]}" --target release -t $NAME:$VERSION ../ -f "../docker/$PACKAGE.Dockerfile"
docker tag $NAME:$VERSION $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$NAME:$VERSION
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$NAME:$VERSION
