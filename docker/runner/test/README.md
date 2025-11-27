# Platform Agent Test Suite

This directory contains the test suite for the Go platform-agent binary.

## Prerequisites

- Docker running with access to `/var/run/docker.sock`
- Bun installed

## Setup

```bash
cd docker/runner/test
bun install
```

## Running Tests

```bash
# Run all tests
bun test

# Force rebuild the Docker image (use REBUILD env var)
REBUILD=1 bun test

# Run with verbose output
bun test --verbose

# Filter by test name pattern (regex supported)
bun test -t "math_add"
bun test -t "string_hash"
bun test -t "array_.*"

# Filter by describe block
bun test -t "persistent_http"
bun test -t "exec_per_job"
bun test -t "error handling"
bun test -t "CLI commands"

# Combine filter with rebuild
REBUILD=1 bun test -t "math_factorial"
```

## Test Structure

The tests use [Dockerode](https://github.com/apocas/dockerode) to:
1. Build the test Docker image (from `runner.Dockerfile`)
2. Start a container
3. Execute the platform-agent commands inside the container
4. Verify expected outcomes

### Test Categories

#### exec_per_job Interface Tests
- Simple command execution
- Exit code handling
- Job input passed as base64 argument
- stdout/stderr capture
- Multiline output

#### persistent_http Interface Tests
- HTTP worker startup
- Job input passed to HTTP endpoint
- Worker process reuse
- Worker log capture

#### Error Handling Tests
- Invalid interface kind
- Invalid base64 payload
- Invalid JSON payload
- Empty worker command

#### CLI Command Tests
- Help command
- Required flag validation
- job-log command (stdout, stderr, tail)
- worker-log command

## Adding New Tests

Test cases are defined as typed fixtures at the top of `agent.test.ts`:

```typescript
// For exec_per_job tests
const execTestCases: ExecTestCase[] = [
  {
    name: 'my new test',
    jobClass: 'my_job_class',
    workerCommand: ['echo', 'hello'],
    jobInput: { some: 'data' },
    expected: {
      success: true,
      exitCode: 0,
      outputContains: ['hello'],
    },
  },
]

// For persistent_http tests (uses mock-worker.ts job classes)
const httpTestCases: HttpTestCase[] = [
  {
    name: 'math_add: sums numbers',
    jobClass: 'math_add',
    port: 8095,
    jobInput: { numbers: [1, 2, 3] },
    expected: {
      success: true,
      result: { sum: 6, operands: [1, 2, 3] },
    },
  },
]

// Available job classes in mock-worker.ts:
// - math_add, math_multiply, math_factorial, math_fibonacci, math_prime_check
// - string_hash, string_reverse, string_base64, string_count
// - array_sort, array_stats
```

## Legacy Bash Script

The `test.sh` file is a legacy bash test script. Use the TypeScript tests instead.
