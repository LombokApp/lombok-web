# syntax=docker/dockerfile:1.7-labs
FROM oven/bun:1.1

WORKDIR /app

# Copy the mock runner source code into the image
COPY docker/runner/src ./src

EXPOSE 8080

ENTRYPOINT ["bun", "run", "src/server.ts"]
CMD ["--wait-ms", "2000"]

# Example:
# docker build -f docker/runner/runner.Dockerfile -t lombok/mock-runner .
# docker run --rm -p 8080:8080 lombok/mock-runner --wait-ms 5000
