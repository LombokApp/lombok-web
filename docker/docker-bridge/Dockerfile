FROM oven/bun:1 AS builder
WORKDIR /build
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY src/ src/
RUN bun build src/index.ts --compile --outfile docker-bridge --external dockerode

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /build/docker-bridge /usr/local/bin/docker-bridge
COPY --from=builder /build/node_modules/ /app/node_modules/
EXPOSE 3100 3101
CMD ["docker-bridge"]
