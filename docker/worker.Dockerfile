FROM node:18 as install

WORKDIR /usr/src/app

COPY .yarn .yarn
COPY packages/worker packages/worker
COPY packages/api packages/api
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

ENV LD_LIBRARY_PATH=/usr/local/lib
ENV LIBRARY_PATH=/usr/local/lib

# Run all the things....
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y curl gnupg && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    # end yarn source setup
    # start install necessary packages
    apt-get update && apt-get install -y --fix-missing --no-install-recommends yarn ffmpeg make g++ wget && \
    # end install necessary packages
    # start yarn install
    yarn set version ./.yarn/releases/yarn-3.5.1.cjs && \
    yarn && \
    # end yarn install
    # start tensorflow bindings build
    wget https://storage.googleapis.com/tf-builds/libtensorflow_r2_8_linux_arm64.tar.gz -q && \
    tar -C /usr/local -xzf libtensorflow_r2_8_linux_arm64.tar.gz && \
    rm libtensorflow_r2_8_linux_arm64.tar.gz && \
    cd .yarn/unplugged/@tensorflow-tfjs-node-npm-4.10.0-7a627fcc78/node_modules/@tensorflow/tfjs-node && \
    rm -rf deps && rm -rf lib && \
    yarn dlx node-pre-gyp install --build-from-source && \
    # end tensorflow bindings build
    # start whisper build
    cd ../../../../whisper-node-ts-npm-0.0.16-572b4b5e83/node_modules/whisper-node-ts/lib/whisper.cpp && \
    lines_to_comment="213 214 215 216"; for line_number in $lines_to_comment; do sed -i "${line_number}s/^/#/" Makefile; done && make && \
    cd /usr/src/app && \
    # end whisper build
    # start cleanup
    apt-get remove -y imagemagick gcc g++ make npm curl gnupg wget python3 perl && \
    rm -rf ./packages/stellariscloud-ui ./packages/build-test /usr/local/lib/node_modules && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /usr/local/src/* && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

VOLUME ["/home/node"]
