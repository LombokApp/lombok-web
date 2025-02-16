# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.2-alpine AS base

WORKDIR /usr/src/app

# Install necessary dependencies
RUN set -eux && apk add --no-cache ffmpeg

FROM base AS local

WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install

COPY package.json bun.lock /temp/dev/
COPY packages /temp/dev/packages

# RUN cd /temp/dev && bun install --filter packages/api --force
RUN cd /temp/dev && \
  BUN_INSTALL_DEPENDENCIES_ONLY=1 bun install --filter ./packages/api --frozen-lockfile && \
  bun --cwd ./packages/api build && \
  bun --cwd ./packages/api-client build && \
  bun --cwd ./packages/core-worker build && \
  bun --cwd ./packages/stellaris-types build && \
  bun --cwd ./packages/stellaris-utils build && \
  rm -rf ./packages/api/node_modules && \
  rm -rf ./packages/api/src && \
  rm -rf ./packages/auth-utils && \
  rm -rf ./packages/app-browser-sdk && \
  rm -rf ./packages/app-worker-sdk && \
  rm -rf ./packages/ui-toolkit

FROM base AS release

# copy in all the compiled application
COPY --from=install /temp/dev ./

# run the app
USER bun
EXPOSE 3001/tcp
ENTRYPOINT ["bun", "--cwd", "packages/api", "start"]