# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.2-alpine AS base

WORKDIR /usr/src/app

# Install necessary dependencies
RUN set -eux && apk add --no-cache ffmpeg

FROM base AS local

WORKDIR /usr/src/app

FROM local AS test

WORKDIR /usr/src/app/packages/api
RUN set -eux \
  & apk add \
  --update \
  --no-cache \
  --update-cache \
  --repository http://dl-cdn.alpinelinux.org/alpine/edge/main \
  --repository http://dl-cdn.alpinelinux.org/alpine/edge/community \
  --allow-untrusted \
  ffmpeg \
  nodejs \
  nsjail \
  yarn \
  && yarn set version berry

ENTRYPOINT yarn test:e2e

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
# RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY packages /temp/dev/packages

# COPY package.json bun.lock /temp/dev/
# COPY packages/api /temp/dev/packages/api
# COPY packages/api-client/package.json /temp/dev/packages/api-client/
# COPY packages/core-worker/package.json /temp/dev/packages/core-worker/
# COPY packages/app-worker-sdk/package.json /temp/dev/packages/app-worker-sdk/
# COPY packages/app-browser-sdk/package.json /temp/dev/packages/app-browser-sdk/
# COPY packages/app-worker-example/package.json /temp/dev/packages/app-worker-example/
# COPY packages/auth-utils/package.json /temp/dev/packages/auth-utils/
# COPY packages/stellaris-types/package.json /temp/dev/packages/stellaris-types/
# COPY packages/stellaris-utils/package.json /temp/dev/packages/stellaris-utils/
# COPY packages/ui/package.json /temp/dev/packages/ui/
# COPY packages/ui-toolkit/package.json /temp/dev/packages/ui-toolkit/

# RUN cd /temp/dev && bun install --filter packages/api --force
RUN cd /temp/dev && BUN_INSTALL_DEPENDENCIES_ONLY=1 bun install --filter ./packages/api --frozen-lockfile && bun --cwd ./packages/api build


# FROM base AS prerelease
# ENV NODE_ENV=production

# # copy from install image
# COPY --from=install /temp/dev/node_modules ./node_modules
# COPY --from=install /temp/dev/bun.lock /temp/dev/package.json ./

# # copy source files in
# COPY packages/api ./packages/api
# COPY packages/core-worker ./packages/core-worker
# COPY packages/stellaris-types ./packages/stellaris-types
# COPY packages/stellaris-utils ./packages/stellaris-utils
# COPY packages/api-client ./packages/api-client

FROM base AS release

# copy in package.json and bun.lock
COPY --from=install /temp/dev/bun.lock /temp/dev/package.json ./
COPY --from=install /temp/dev/node_modules ./node_modules
COPY --from=install /temp/dev/packages/api ./packages/api

# build the src
# RUN bun --cwd ./packages/api build && rm -rf ./packages/api/src ./packages/core-worker ./packages/api-client ./packages/stellaris-types ./packages/stellaris-utils
# RUN find . -mindepth 1 -not -path './packages/api' -exec rm -rf {} +
# RUN find . -mindepth 1 -maxdepth 1 -type d -not -path './packages/api' -exec rm -rf {} +

# run the app
USER bun
EXPOSE 3001/tcp
ENTRYPOINT ["bun", "--cwd", "packages/api", "start"]