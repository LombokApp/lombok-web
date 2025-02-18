FROM oven/bun:1.2.2-alpine AS base

WORKDIR /usr/src/app

# Install necessary dependencies
RUN set -eux && apk add --no-cache ffmpeg nginx su-exec

FROM base AS local

WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install

COPY package.json bun.lock /temp/dev/
COPY packages /temp/dev/packages
COPY eslint-config /temp/dev/eslint-config

RUN cd /temp/dev && \
  cp ./packages/api/cmd/entrypoint.sh ./entrypoint.sh && \
  bun install --frozen-lockfile && \
  bun --cwd ./packages/api build && \
  bun --cwd ./packages/ui build && \
  bun --cwd ./packages/api-client build && \
  bun --cwd ./packages/core-worker build && \
  bun --cwd ./packages/stellaris-types build && \
  bun --cwd ./packages/stellaris-utils build && \
  cp ./packages/api/src/orm/migrations/*.sql ./packages/api/dist/src/orm/migrations/ && \
  mv ./packages/ui/out ./frontend && \
  bun remove next && \
  rm -rf ./node_modules && \
  bun install --production --filter ./packages/api && \
  rm -rf ./packages/api/node_modules && \
  rm -rf ./packages/api/src && \
  rm -rf ./packages/auth-utils && \
  rm -rf ./packages/app-worker-sdk/node_modules && \
  rm -rf ./packages/app-browser-sdk && \
  rm -rf ./packages/stellaris-types/node_modules && \
  rm -rf ./packages/app-worker-example && \
  rm -rf ./packages/ui-toolkit && \
  rm -rf ./packages/ui && \
  rm -rf ./packages/stellaris-utils/node_modules/ && \
  rm -rf ./packages/core-worker/node_modules/ && \
  rm -rf ./eslint-config && \
  mkdir /usr/src/app/apps

FROM base AS release

# copy in all the compiled application
COPY --from=install /temp/dev ./

# run the app
EXPOSE 80/tcp
ENTRYPOINT ["sh", "./entrypoint.sh"]
