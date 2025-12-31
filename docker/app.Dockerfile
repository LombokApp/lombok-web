FROM oven/bun:1.3.5-alpine AS base

WORKDIR /usr/src/app

# Install necessary dependencies
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories && \
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
  apk update && set -eux && apk add --no-cache ffmpeg nginx libheif-tools exiv2 su-exec zip unzip nsjail socat

FROM base AS local

WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install

COPY package.json bun.lock /temp/dev/
COPY packages /temp/dev/packages
COPY bunfig.toml /temp/dev/bunfig.toml
COPY eslint-config /temp/dev/eslint-config

RUN cd /temp/dev && \
  # cp the entrypoint script to the root
  cp ./packages/api/cmd/entrypoint.sh ./entrypoint.sh && \
  # install all dependencies
  bun install --frozen-lockfile && \
  # build the packages
  bun --cwd ./packages/types build && \
  bun --cwd ./packages/utils build && \
  bun --cwd ./packages/auth-utils build && \
  bun --cwd ./packages/sdk build && \
  bun --cwd ./packages/core-worker-utils build && \
  bun --cwd ./packages/core-worker build && \
  bun --cwd ./packages/app-worker-sdk build && \
  bun --cwd ./packages/app-browser-sdk build && \
  bun --cwd ./packages/api build && \
  bun --cwd ./packages/ui build && mv ./packages/ui/dist ./frontend && \
  # copy the sql migration files over (which were ignored by the build... maybe fix that)
  mkdir ./packages/api/dist/src/migrations/ && cp ./packages/api/src/orm/migrations/*.sql ./packages/api/dist/src/migrations/ && \
  mkdir ./packages/api/dist/src/migrations/meta && cp -r ./packages/api/src/orm/migrations/meta ./packages/api/dist/src/migrations/ && \
  # remove all but production deps
  rm -rf ./node_modules && \
  bun install --production --filter ./packages/api && \
  # remove as much unnecessary stuff as possible
  rm -rf ./packages/ui && \
  rm -rf ./packages/ui-toolkit && \
  rm -rf ./packages/app-demo && \
  rm -rf ./packages/auth-utils && \
  rm -rf ./packages/app-browser-sdk && \
  rm -rf ./packages/api/src && \
  rm -rf ./packages/sdk && \
  rm -rf ./packages/types/src && \
  rm -rf ./packages/utils/src/ && \
  rm -rf ./packages/core-worker/src/ && \
  rm -rf ./packages/core-worker-utils/src/ && \
  rm -rf ./eslint-config && \
  rm -rf ./node_modules/.bun/swagger-ui-dist* && \
  rm -rf ./node_modules/.bun/bun-types* && \
  rm -rf ./node_modules/.bun/@types+node* && \
  rm -rf ./node_modules/.bun/@microsoft+tsdoc* && \
  rm -rf ./node_modules/.bun/@babel+runtime* && \
  mkdir /usr/src/app/apps

FROM base AS release

# copy in all the compiled application
COPY --from=install /temp/dev ./

# run the app
EXPOSE 8080/tcp
ENTRYPOINT ["sh", "./entrypoint.sh"]

FROM release AS standalone-release

ENV EMBEDDED_POSTGRES=true
RUN apk add --no-cache postgresql postgresql-contrib

# Set up PostgreSQL data directory
RUN mkdir -p /var/lib/postgresql/data && \
  chown -R postgres:postgres /var/lib/postgresql && \
  mkdir /run/postgresql && \
  chown -R postgres:postgres /run/postgresql && \
  su-exec postgres initdb -D /var/lib/postgresql/data
