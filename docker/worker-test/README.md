# Lombok Docker Worker Test Framework

A TypeScript-based testing framework for Lombok docker workers that automates the full lifecycle of testing during development.

## Features

- **Docker Image Building**: Build images locally or on remote hosts via SSH
- **Container Management**: Deploy containers with full config support (volumes, GPUs, network, etc.)
- **Job Execution**: Dispatch jobs via the worker agent and wait for completion
- **Mock Servers**: Built-in mock platform server and file server for testing
- **Validation**: Custom validation functions using Zod schemas
- **Config-Driven**: JSON configuration files with CLI flag overrides

## Installation

```bash
cd docker/worker-test
bun install
```

## Usage

### Basic Usage

```bash
bun run src/index.ts --config my-worker-config.json
```

### Run Specific Jobs

```bash
bun run src/index.ts --config my-worker-config.json --job-id test-embedding --job-id test-metadata
```

### Build Only

```bash
bun run src/index.ts --config my-worker-config.json --build-only
```

### Options

- `--config <path>` - Path to test configuration JSON file (required)
- `--docker-host <host>` - Docker host (default: local socket)
- `--job-id <id>` - Run only specific job(s) by ID (can be specified multiple times)
- `--no-cleanup` - Do not remove container after test
- `--verbose` - Print detailed logs
- `--build-only` - Only build image, do not run tests
- `--live-logs` - Stream container logs to stdout while tests run
- `--no-cache` - Build Docker image without using the layer cache (local and SSH builds)

## Configuration

### Configuration File Structure

```json
{
  "dockerfile": "Dockerfile",
  "buildContext": ".",
  "imageName": "my-worker:test",
  "buildArgs": {
    "BUILD_ENV": "test"
  },
  "build": {
    "ssh": "user@remote-host",
    "noCache": true,
    "registry": {
      "url": "registry.example.com",
      "username": "myuser",
      "password": "mypassword",
      "push": false
    }
  },
  "container": {
    "dockerHost": "/var/run/docker.sock",
    "name": "my-worker-test",
    "environmentVariables": {
      "ENV": "test"
    },
    "volumes": ["/host/path:/container/path"],
    "gpus": {
      "driver": "nvidia",
      "deviceIds": ["0"]
    },
    "networkMode": "bridge",
    "extraHosts": ["example.com:192.168.1.100"]
  },
  "liveLogs": true,
  "jobs": [
    {
      "id": "test-embedding",
      "payload": {
        "job_class": "generate_text_embeddings",
        "wait_for_completion": true,
        "worker_command": ["./start_worker.sh"],
        "interface": {
          "kind": "persistent_http",
          "port": 8080
        },
        "job_input": {
          "texts": ["hello world"],
          "space": "text-v1"
        }
      },
      "validate": {
        "custom": "./validation/embedding-validator.ts"
      }
    }
  ],
  "mockServer": {
    "platformPort": 3001,
    "fileServerPort": 3002,
    "fileServerRoot": "./test-files"
  }
}
```

### Job Payload

The job payload follows the same structure as the worker agent expects:

- `job_id` - Optional, auto-generated if not provided
- `job_class` - Job class identifier
- `wait_for_completion` - Whether to wait for job completion (default: true)
- `worker_command` - Command to start the worker
- `interface` - Interface configuration (`persistent_http` or `exec_per_job`)
- `job_input` - Job input data
- `platform_url` - Platform URL (auto-set to mock server if not provided)
- `job_token` - Optional JWT token for platform authentication
- `output_location` - Optional output location configuration

### Validation

Validation is done via custom validation functions that can use Zod schemas:

```typescript
// validation/embedding-validator.ts
import { z } from 'zod'

const embeddingResultSchema = z.object({
  embeddings: z.array(
    z.object({
      vector: z.array(z.number()),
    }),
  ),
  space: z.string(),
})

export default function validate(result: unknown) {
  const parseResult = embeddingResultSchema.safeParse(result)
  
  if (parseResult.success) {
    return { valid: true, errors: [] }
  }
  
  return {
    valid: false,
    errors: parseResult.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    ),
  }
}
```

The validation function can be exported as:
- Default export: `export default function validate(...)`
- Named export: `export function validate(...)` or `export function validateJobResult(...)`

It should return:
- `boolean` - Simple pass/fail
- `{ valid: boolean, errors: string[] }` - Detailed validation result

## Mock Servers

The framework includes two mock servers:

### Mock Platform Server

Implements the Lombok API endpoints:
- `POST /api/v1/docker/jobs/:jobId/request-presigned-urls` - Request presigned URLs
- `POST /api/v1/docker/jobs/:jobId/start` - Signal job start
- `POST /api/v1/docker/jobs/:jobId/complete` - Signal job completion

### File Server

Serves input files and handles output uploads:
- `GET /files/:path` - Serve files from the root directory
- `PUT /upload/:folderId/:objectKey` - Handle file uploads (presigned URLs)

Both servers listen on `0.0.0.0` so containers can reach them via `host.docker.internal`.

## Examples

See the `examples/` directory for example configurations and validation functions.

## Architecture

The framework consists of:

- **config.ts** - Configuration schema and loading
- **docker.ts** - Docker operations via dockerode
- **ssh-build.ts** - Remote build via SSH
- **mock-platform.ts** - Mock Lombok API server
- **file-server.ts** - File serving and upload handling
- **job-dispatcher.ts** - Job execution via worker agent
- **validation.ts** - Result validation
- **runner.ts** - Main test orchestration
- **cli.ts** - Command-line interface

## Integration with Lombok

The framework integrates with:
- Worker agent commands (`lombok-worker-agent run-job`, `job-state`, `job-result`, etc.)
- Docker orchestrator container config structure
- Lombok API endpoints for job lifecycle management

## Development

```bash
# Install dependencies
bun install

# Run tests
bun run src/index.ts --config examples/example-config.json

# Build
bun run build
```
