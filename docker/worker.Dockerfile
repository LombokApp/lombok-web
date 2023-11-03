FROM node:18-alpine as install

WORKDIR /usr/src/app

COPY .yarn .yarn
COPY packages/worker packages/worker
COPY packages/api-client packages/api-client
COPY packages/shared/packages/api-utils packages/shared/packages/api-utils
COPY packages/shared/packages/stellaris-workers packages/shared/packages/stellaris-workers
COPY packages/shared/packages/stellaris-types packages/shared/packages/stellaris-types
COPY packages/shared/packages/stellaris-utils packages/shared/packages/stellaris-utils
COPY .pnp.cjs .
COPY .pnp.loader.mjs .
COPY .yarnrc.yml .
COPY package.json .
COPY tsconfig.json .
COPY yarn.lock .

FROM install as build

WORKDIR /usr/src/app/packages/shared/packages/stellaris-utils
RUN yarn workspaces focus
RUN yarn clean
RUN yarn build

WORKDIR /usr/src/app/packages/shared/packages/stellaris-workers
RUN yarn workspaces focus
RUN yarn clean
RUN yarn build

WORKDIR /usr/src/app

RUN (cd ./packages/worker && yarn workspaces focus)
RUN yarn workspace @stellariscloud/worker build
RUN yarn workspace @stellariscloud/worker prod-install --pack /usr/src/build

FROM alpine as release

WORKDIR /home/node

RUN apk update && apk upgrade && addgroup -g 1000 node \
  && adduser -u 1000 -G node -s /bin/sh -D node \
  && apk add --no-cache tini libstdc++ ffmpeg

ENV NODE_ENV "production"
ENV NODE_OPTIONS "--require ./.pnp.cjs"

ENV PORT 80

COPY --from=build /usr/local/bin/node /usr/local/bin/

COPY --chown=node:node --from=build /usr/src/build .

USER node

EXPOSE $PORT

VOLUME ["/home/node"]

ENTRYPOINT [ "/sbin/tini", "--", "node", "." ]

FROM install as local

WORKDIR /usr/src/app

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.8.0/wait /wait
RUN chmod +x /wait

RUN apk update && \
    apk upgrade && \
    apk add --no-cache ffmpeg

VOLUME ["/home/node"]
