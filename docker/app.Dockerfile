FROM oven/bun:1.2.19-alpine AS base

WORKDIR /usr/src/app

# Install necessary dependencies
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories && \
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
  apk update && set -eux && apk add --no-cache ffmpeg nginx libheif-tools su-exec zip unzip nsjail && \
  adduser -D -u 1001 stellaris

FROM base AS local

WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install

COPY package.json bun.lock /temp/dev/
COPY packages /temp/dev/packages
COPY apps/core /temp/dev/apps/core
COPY apps/dev /temp/dev/apps/dev
COPY eslint-config /temp/dev/eslint-config

RUN cd /temp/dev && \
  # cp the entrypoint script to the root
  cp ./packages/api/cmd/entrypoint.sh ./entrypoint.sh && \
  # install all dependencies
  bun install --frozen-lockfile && \
  # build the packages
  bun --cwd ./packages/core-worker build && \
  bun --cwd ./packages/stellaris-types build && \
  bun --cwd ./packages/stellaris-utils build && \
  # bun --cwd ./packages/ui-toolkit build && \
  bun --cwd ./packages/api build && \
  rm ./packages/ui/.env.*.local && \
  bun --cwd ./packages/ui build && mv ./packages/ui/dist ./frontend && \
  # copy the sql migration files over (which were ignored by the build... maybe fix that)
  mkdir ./packages/api/dist/src/migrations/ && cp ./packages/api/src/orm/migrations/*.sql ./packages/api/dist/src/migrations/ && \
  mkdir ./packages/api/dist/src/migrations/meta && cp -r ./packages/api/src/orm/migrations/meta ./packages/api/dist/src/migrations/ && \
  # install the production api packages only
  rm -rf ./node_modules && \
  bun install --production --filter ./packages/api && \
  # remove as much unnecessary stuff as possible
  rm -rf ./packages/ui && \
  rm -rf ./packages/api/node_modules && \
  rm -rf ./packages/api/src && \
  rm -rf ./packages/auth-utils && \
  rm -rf ./packages/app-worker-sdk/node_modules && \
  rm -rf ./packages/sdk && \
  rm -rf ./packages/stellaris-types/node_modules && \
  rm -rf ./packages/ui-toolkit && \
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

FROM release AS pgrelease

ENV EMBEDDED_POSTGRES=true
RUN apk add --no-cache postgresql postgresql-contrib

# Set up PostgreSQL data directory
RUN mkdir -p /var/lib/postgresql/data && \
  chown -R postgres:postgres /var/lib/postgresql && \
  mkdir /run/postgresql && \
  chown -R postgres:postgres /run/postgresql && \
  su-exec postgres initdb -D /var/lib/postgresql/data
