# syntax=docker/dockerfile:1.7-labs

# Stage 1: Build the lombok-worker-agent Go binary
FROM golang:1.23-alpine AS agent-builder

WORKDIR /build

# Copy Go module files first for better caching
COPY docker/agent/go.mod docker/agent/go.sum ./
RUN go mod download

# Copy the rest of the agent source code
COPY docker/agent/ ./

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o lombok-worker-agent .

# Stage 2: Final image with Bun and the agent
FROM oven/bun:1.1

WORKDIR /app

# Copy the lombok-worker-agent binary from the builder stage
COPY --from=agent-builder /build/lombok-worker-agent /usr/local/bin/lombok-worker-agent

# Create directories for agent logs and state
RUN mkdir -p /var/log/lombok-worker-agent/jobs /var/log/lombok-worker-agent/workers \
  /var/lib/lombok-worker-agent/jobs /var/lib/lombok-worker-agent/workers

# Copy the mock worker source code into the image
COPY docker/runner/src ./src

EXPOSE 8080

CMD ["sleep", "infinity"]

# Example:
# docker build -f docker/runner/runner.Dockerfile -t lombok/mock-runner .
# docker run --rm -p 8080:8080 lombok/mock-runner
#
# Test the agent inside:
# docker run --rm -it lombok/mock-runner sh
# lombok-worker-agent --help
