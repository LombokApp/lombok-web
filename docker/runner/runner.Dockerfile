# syntax=docker/dockerfile:1.7-labs

# Stage 1: Build the platform-agent Go binary
FROM golang:1.23-alpine AS agent-builder

WORKDIR /build

# Copy Go module files first for better caching
COPY docker/agent/go.mod docker/agent/go.sum ./
RUN go mod download

# Copy the rest of the agent source code
COPY docker/agent/ ./

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o platform-agent .

# Stage 2: Final image with Bun and the agent
FROM oven/bun:1.1

WORKDIR /app

# Copy the platform-agent binary from the builder stage
COPY --from=agent-builder /build/platform-agent /usr/local/bin/platform-agent

# Create directories for agent logs and state
RUN mkdir -p /var/log/platform-agent/jobs /var/log/platform-agent/workers \
  /var/lib/platform-agent/jobs /var/lib/platform-agent/workers

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
# platform-agent --help
