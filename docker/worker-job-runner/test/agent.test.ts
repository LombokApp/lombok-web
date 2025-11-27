import Dockerode from 'dockerode'
import path from 'node:path'
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'

// =============================================================================
// Configuration
// =============================================================================

const DOCKER_SOCKET = process.env.DOCKER_HOST ?? '/var/run/docker.sock'
const IMAGE_NAME = 'lombok-worker-agent-test'
const CONTAINER_NAME = 'lombok-worker-agent-test-runner'
const FORCE_REBUILD =
  process.env.REBUILD === '1' ||
  process.env.REBUILD === 'true' ||
  process.argv.includes('--rebuild')

// Go up from docker/worker-job-runner/test to repo root
const REPO_ROOT = path.resolve(import.meta.dir, '..', '..', '..')

// =============================================================================
// Types
// =============================================================================

type InterfaceKind = 'exec_per_job' | 'persistent_http'

interface ListenerConfig {
  type: 'tcp' | 'unix'
  port?: number
  path?: string
}

interface InterfaceConfig {
  kind: InterfaceKind
  listener?: ListenerConfig
}

interface JobPayload {
  job_id: string
  job_class: string
  worker_command: string[]
  interface: InterfaceConfig
  job_input: unknown
}

interface JobResult {
  success: boolean
  job_id?: string
  exit_code?: number
  result?: unknown
  error?: {
    code: string
    message: string
  }
}

interface ExecResult {
  exitCode: number
  stdout: string
  stderr: string
}

// =============================================================================
// Test Fixtures - Define test cases with expected outcomes
// =============================================================================

interface ExecTestCase {
  name: string
  jobClass: string
  workerCommand: string[]
  jobInput: unknown
  expected: {
    success: boolean
    exitCode?: number
    outputContains?: string[]
    stderrContains?: string[]
  }
}

interface HttpTestCase {
  name: string
  jobClass: string
  port: number
  jobInput: unknown
  expected: {
    success: boolean
    result?: Record<string, unknown>
    errorCode?: string
  }
}

const execTestCases: ExecTestCase[] = [
  {
    name: 'simple echo succeeds',
    jobClass: 'echo_job',
    workerCommand: ['echo', 'Hello from worker'],
    jobInput: { message: 'test' },
    expected: {
      success: true,
      exitCode: 0,
    },
  },
  {
    name: 'exit with non-zero code',
    jobClass: 'failing_job',
    workerCommand: ['sh', '-c', 'echo error output >&2; exit 42'],
    jobInput: { should: 'fail' },
    expected: {
      success: false,
      exitCode: 42,
    },
  },
  {
    name: 'command not found fails',
    jobClass: 'notfound_job',
    workerCommand: ['/nonexistent/command'],
    jobInput: {},
    expected: {
      success: false,
    },
  },
  {
    name: 'job input passed as base64 argument',
    jobClass: 'input_test_job',
    workerCommand: [
      'sh',
      '-c',
      'echo Received input: && echo $1 | base64 -d',
      'sh',
    ],
    jobInput: { key: 'value', number: 42 },
    expected: {
      success: true,
      exitCode: 0,
      outputContains: ['Received input:'],
    },
  },
  {
    name: 'stderr captured separately',
    jobClass: 'stderr_test',
    workerCommand: ['sh', '-c', 'echo stdout_message; echo stderr_message >&2'],
    jobInput: {},
    expected: {
      success: true,
      exitCode: 0,
      outputContains: ['stdout_message'],
      stderrContains: ['stderr_message'],
    },
  },
  {
    name: 'multiline output captured',
    jobClass: 'multiline_job',
    workerCommand: ['sh', '-c', 'echo line1; echo line2; echo line3'],
    jobInput: {},
    expected: {
      success: true,
      outputContains: ['line1', 'line2', 'line3'],
    },
  },
]

const httpTestCases: HttpTestCase[] = [
  // Math operations
  {
    name: 'math_add: sums numbers correctly',
    jobClass: 'math_add',
    port: 8090,
    jobInput: { numbers: [1, 2, 3, 4, 5] },
    expected: {
      success: true,
      result: { sum: 15, operands: [1, 2, 3, 4, 5] },
    },
  },
  {
    name: 'math_multiply: multiplies numbers correctly',
    jobClass: 'math_multiply',
    port: 8091,
    jobInput: { numbers: [2, 3, 4] },
    expected: {
      success: true,
      result: { product: 24, operands: [2, 3, 4] },
    },
  },
  {
    name: 'math_factorial: calculates factorial of 10',
    jobClass: 'math_factorial',
    port: 8092,
    jobInput: { n: 10 },
    expected: {
      success: true,
      result: { factorial: 3628800, n: 10 },
    },
  },
  {
    name: 'math_fibonacci: calculates 20th fibonacci number',
    jobClass: 'math_fibonacci',
    port: 8093,
    jobInput: { n: 20 },
    expected: {
      success: true,
      result: { fibonacci: 6765, n: 20 },
    },
  },
  {
    name: 'math_prime_check: identifies 97 as prime',
    jobClass: 'math_prime_check',
    port: 8094,
    jobInput: { n: 97 },
    expected: {
      success: true,
      result: { isPrime: true, n: 97 },
    },
  },
  {
    name: 'math_prime_check: identifies 100 as not prime',
    jobClass: 'math_prime_check',
    port: 8095,
    jobInput: { n: 100 },
    expected: {
      success: true,
      result: { isPrime: false, n: 100, factor: 2 },
    },
  },
  // String operations
  {
    name: 'string_hash: hashes string with sha256',
    jobClass: 'string_hash',
    port: 8096,
    jobInput: { text: 'hello world', algorithm: 'sha256' },
    expected: {
      success: true,
      result: {
        hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
        algorithm: 'sha256',
        inputLength: 11,
      },
    },
  },
  {
    name: 'string_hash: hashes string with md5',
    jobClass: 'string_hash',
    port: 8097,
    jobInput: { text: 'test', algorithm: 'md5' },
    expected: {
      success: true,
      result: {
        // hash: '098f6bcd4621d373cade4e832627b4f6',
        algorithm: 'md5',
        inputLength: 4,
      },
    },
  },
  {
    name: 'string_reverse: reverses string correctly',
    jobClass: 'string_reverse',
    port: 8098,
    jobInput: { text: 'Hello, World!' },
    expected: {
      success: true,
      result: {
        reversed: '!dlroW ,olleH',
        original: 'Hello, World!',
        length: 13,
      },
    },
  },
  {
    name: 'string_base64: encodes to base64',
    jobClass: 'string_base64',
    port: 8099,
    jobInput: { text: 'Hello, World!', operation: 'encode' },
    expected: {
      success: true,
      result: {
        result: 'SGVsbG8sIFdvcmxkIQ==',
        operation: 'encode',
        inputLength: 13,
      },
    },
  },
  {
    name: 'string_base64: decodes from base64',
    jobClass: 'string_base64',
    port: 8100,
    jobInput: { text: 'SGVsbG8sIFdvcmxkIQ==', operation: 'decode' },
    expected: {
      success: true,
      result: { result: 'Hello, World!', operation: 'decode', inputLength: 20 },
    },
  },
  {
    name: 'string_count: counts substring occurrences',
    jobClass: 'string_count',
    port: 8101,
    jobInput: { text: 'banana', substring: 'an' },
    expected: {
      success: true,
      result: { count: 2, substring: 'an', textLength: 6 },
    },
  },
  // Array operations
  {
    name: 'array_sort: sorts numbers ascending',
    jobClass: 'array_sort',
    port: 8102,
    jobInput: { items: [5, 2, 8, 1, 9], order: 'asc' },
    expected: {
      success: true,
      result: { sorted: [1, 2, 5, 8, 9], order: 'asc', itemCount: 5 },
    },
  },
  {
    name: 'array_sort: sorts numbers descending',
    jobClass: 'array_sort',
    port: 8103,
    jobInput: { items: [5, 2, 8, 1, 9], order: 'desc' },
    expected: {
      success: true,
      result: { sorted: [9, 8, 5, 2, 1], order: 'desc', itemCount: 5 },
    },
  },
  {
    name: 'array_stats: calculates statistics correctly',
    jobClass: 'array_stats',
    port: 8104,
    jobInput: { numbers: [1, 2, 3, 4, 5] },
    expected: {
      success: true,
      result: { sum: 15, min: 1, max: 5, mean: 3, median: 3, count: 5 },
    },
  },
  // Error handling
  {
    name: 'unknown job class returns error',
    jobClass: 'nonexistent_job_class',
    port: 8105,
    jobInput: {},
    expected: {
      success: false,
      errorCode: 'UNKNOWN_JOB_CLASS',
    },
  },
  {
    name: 'invalid input returns error',
    jobClass: 'math_add',
    port: 8106,
    jobInput: { numbers: 'not an array' },
    expected: {
      success: false,
      errorCode: 'JOB_EXECUTION_ERROR',
    },
  },
  // Verbose logging tests
  {
    name: 'verbose_log: runs through multiple steps',
    jobClass: 'verbose_log',
    port: 8107,
    jobInput: { steps: 5 },
    expected: {
      success: true,
      result: {
        stepsCompleted: 5,
        hadWarning: false,
        hadError: false,
      },
    },
  },
  {
    name: 'verbose_log: with simulated warning and error',
    jobClass: 'verbose_log',
    port: 8108,
    jobInput: { steps: 4, simulateWarning: true, simulateError: true },
    expected: {
      success: true,
      result: {
        stepsCompleted: 4,
        hadWarning: true,
        hadError: true,
      },
    },
  },
]

// =============================================================================
// Docker Utilities
// =============================================================================

let docker: Dockerode
let container: Dockerode.Container | null = null

async function initDocker(): Promise<void> {
  docker = new Dockerode({ socketPath: DOCKER_SOCKET })
  // Test connection
  await docker.ping()
}

async function imageExists(imageName: string): Promise<boolean> {
  try {
    await docker.getImage(imageName).inspect()
    return true
  } catch {
    return false
  }
}

async function buildImage(): Promise<void> {
  const exists = await imageExists(IMAGE_NAME)

  if (exists && !FORCE_REBUILD) {
    console.log(
      `Image '${IMAGE_NAME}' already exists. Use --rebuild to force rebuild.`,
    )
    return
  }

  console.log(`Building image '${IMAGE_NAME}' from ${REPO_ROOT}...`)

  // Only include the directories needed by the Dockerfile to avoid sending
  // the entire repo (which could be huge with node_modules)
  const stream = await docker.buildImage(
    {
      context: REPO_ROOT,
      src: [
        'docker/worker-job-runner/mock-worker.Dockerfile',
        'docker/worker-job-runner/src',
        'docker/worker-agent',
      ],
    },
    {
      t: IMAGE_NAME,
      dockerfile: 'docker/worker-job-runner/mock-worker.Dockerfile',
    },
  )

  // Wait for build to complete
  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, output) => {
        if (err) {
          reject(err)
        } else {
          // Check for build errors in output
          const errorStep = output.find((step) => step.error)
          if (errorStep) {
            reject(new Error(errorStep.error))
          } else {
            resolve()
          }
        }
      },
      (event) => {
        if (event.stream) {
          process.stdout.write(event.stream)
        }
      },
    )
  })

  console.log('Image built successfully')
}

async function startContainer(): Promise<void> {
  // Remove existing container if present
  try {
    const existing = docker.getContainer(CONTAINER_NAME)
    await existing.remove({ force: true })
  } catch {
    // Container doesn't exist, that's fine
  }

  container = await docker.createContainer({
    Image: IMAGE_NAME,
    name: CONTAINER_NAME,
    Cmd: ['sleep', 'infinity'],
    Tty: false,
  })

  await container.start()
  console.log(`Container started: ${container.id.slice(0, 12)}`)
}

async function stopContainer(): Promise<void> {
  if (container) {
    try {
      await container.remove({ force: true })
      console.log('Container stopped')
    } catch {
      // Ignore errors during cleanup
    }
  }
}

async function execInContainer(
  command: string[],
  env?: string[],
): Promise<ExecResult> {
  if (!container) {
    throw new Error('Container not started')
  }

  const exec = await container.exec({
    Cmd: command,
    AttachStdout: true,
    AttachStderr: true,
    Env: env,
  })

  return new Promise((resolve, reject) => {
    exec.start({ Tty: false }, (err, stream) => {
      if (err) {
        return reject(err)
      }
      if (!stream) {
        return reject(new Error('No stream returned from exec.start'))
      }

      const stdout: Buffer[] = []
      const stderr: Buffer[] = []

      // Create writable streams for demuxing
      const stdoutStream = {
        write: (chunk: Buffer) => {
          stdout.push(chunk)
          return true
        },
        end: () => {},
      }
      const stderrStream = {
        write: (chunk: Buffer) => {
          stderr.push(chunk)
          return true
        },
        end: () => {},
      }

      // Demux the stream (Docker multiplexes stdout/stderr with headers)
      docker.modem.demuxStream(stream, stdoutStream as any, stderrStream as any)

      stream.on('end', async () => {
        try {
          const inspect = await exec.inspect()
          resolve({
            exitCode: inspect.ExitCode ?? 0,
            stdout: Buffer.concat(stdout).toString('utf-8'),
            stderr: Buffer.concat(stderr).toString('utf-8'),
          })
        } catch (inspectErr) {
          reject(inspectErr)
        }
      })

      stream.on('error', reject)
    })
  })
}

async function readFileInContainer(filePath: string): Promise<string> {
  const result = await execInContainer(['cat', filePath])
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read file ${filePath}: ${result.stderr}`)
  }
  return result.stdout
}

async function fileExistsInContainer(filePath: string): Promise<boolean> {
  const result = await execInContainer(['test', '-f', filePath])
  return result.exitCode === 0
}

// =============================================================================
// Agent Utilities
// =============================================================================

function makePayloadBase64(payload: JobPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

function generateJobId(prefix: string): string {
  return `${prefix}-${Date.now()}`
}

async function runJob(
  payload: JobPayload,
  env?: string[],
): Promise<{ result: JobResult; exitCode: number; rawOutput: string }> {
  const payloadB64 = makePayloadBase64(payload)

  const execResult = await execInContainer(
    ['lombok-worker-agent', 'run-job', '--payload-base64', payloadB64],
    env,
  )

  // Parse the JSON result from the last line
  const lines = execResult.stdout.trim().split('\n')
  const lastLine = lines[lines.length - 1]

  let result: JobResult
  try {
    result = JSON.parse(lastLine)
  } catch {
    // Try to find JSON in the output (might be pretty-printed)
    const jsonMatch = execResult.stdout.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0])
      } catch {
        result = {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: `Could not parse output: ${execResult.stdout}`,
          },
        }
      }
    } else {
      result = {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: `Could not parse output: ${execResult.stdout}`,
        },
      }
    }
  }

  return {
    result,
    exitCode: execResult.exitCode,
    rawOutput: execResult.stdout + execResult.stderr,
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Platform Agent', () => {
  beforeAll(async () => {
    await initDocker()
    await buildImage()
    await startContainer()
  }, 120_000) // 2 minute timeout for build

  afterAll(async () => {
    await stopContainer()
  })

  describe('exec_per_job interface', () => {
    for (const testCase of execTestCases) {
      test(testCase.name, async () => {
        const jobId = generateJobId(testCase.jobClass)

        const payload: JobPayload = {
          job_id: jobId,
          job_class: testCase.jobClass,
          worker_command: testCase.workerCommand,
          interface: { kind: 'exec_per_job' },
          job_input: testCase.jobInput,
        }

        const { result, exitCode, rawOutput } = await runJob(payload)

        expect(result.success).toBe(testCase.expected.success)

        // Check success/failure
        expect(result.success).toBe(testCase.expected.success)

        // Check exit code if specified
        if (testCase.expected.exitCode !== undefined) {
          expect(exitCode).toBe(testCase.expected.exitCode)
        }

        // Check output contains expected strings
        if (testCase.expected.outputContains) {
          const jobOut = await readFileInContainer(
            `/var/log/lombok-worker-agent/jobs/${jobId}.out.log`,
          )
          for (const expected of testCase.expected.outputContains) {
            expect(jobOut).toContain(expected)
          }
        }

        // Check stderr contains expected strings
        if (testCase.expected.stderrContains) {
          const jobErr = await readFileInContainer(
            `/var/log/lombok-worker-agent/jobs/${jobId}.err.log`,
          )
          for (const expected of testCase.expected.stderrContains) {
            expect(jobErr).toContain(expected)
          }
        }

        // Verify job state file was created
        const stateExists = await fileExistsInContainer(
          `/var/lib/lombok-worker-agent/jobs/${jobId}.json`,
        )
        expect(stateExists).toBe(true)

        // Verify job state status
        const jobState = JSON.parse(
          await readFileInContainer(
            `/var/lib/lombok-worker-agent/jobs/${jobId}.json`,
          ),
        )
        expect(jobState.status).toBe(
          testCase.expected.success ? 'success' : 'failed',
        )
      })
    }
  })

  describe('persistent_http interface', () => {
    for (const testCase of httpTestCases) {
      test(testCase.name, async () => {
        const jobId = generateJobId(testCase.jobClass)

        const payload: JobPayload = {
          job_id: jobId,
          job_class: testCase.jobClass,
          worker_command: ['bun', 'run', 'src/mock-worker.ts'],
          interface: {
            kind: 'persistent_http',
            listener: { type: 'tcp', port: testCase.port },
          },
          job_input: testCase.jobInput,
        }

        // Set APP_PORT env for the mock worker
        const { result } = await runJob(payload, [`APP_PORT=${testCase.port}`])

        // console.log('output:', {
        //   result,
        //   jobLog: await readFileInContainer(
        //     `/var/log/lombok-worker-agent/jobs/${jobId}.out.log`,
        //   ),
        //   workerLog: await readFileInContainer(
        //     `/var/log/lombok-worker-agent/workers/${testCase.jobClass}.out.log`,
        //   ),
        //   workerErrLog: await readFileInContainer(
        //     `/var/log/lombok-worker-agent/workers/${testCase.jobClass}.err.log`,
        //   ),
        //   workerState: JSON.parse(
        //     await readFileInContainer(
        //       `/var/lib/lombok-worker-agent/workers/${testCase.jobClass}.json`,
        //     ),
        //   ),
        //   jobState: JSON.parse(
        //     await readFileInContainer(
        //       `/var/lib/lombok-worker-agent/jobs/${jobId}.json`,
        //     ),
        //   ),
        // })

        expect(result.success).toBe(testCase.expected.success)

        // Verify the exact result matches expected values
        if (testCase.expected.result && result.success) {
          const resultObj = result.result as Record<string, unknown>
          for (const [key, expectedValue] of Object.entries(
            testCase.expected.result,
          )) {
            expect(resultObj[key]).toEqual(expectedValue)
          }
        }

        // Verify error code for failure cases
        if (testCase.expected.errorCode && !result.success) {
          expect(result.error?.code).toBe(testCase.expected.errorCode)
        }

        // Verify worker state file
        const workerStateExists = await fileExistsInContainer(
          `/var/lib/lombok-worker-agent/workers/${testCase.jobClass}.json`,
        )
        expect(workerStateExists).toBe(true)

        const workerState = JSON.parse(
          await readFileInContainer(
            `/var/lib/lombok-worker-agent/workers/${testCase.jobClass}.json`,
          ),
        )
        expect(workerState.state).toBe('ready')
        expect(workerState.kind).toBe('persistent_http')
      })
    }

    test('multiple jobs reuse same worker', async () => {
      const jobClass = 'reuse_test'
      const port = 8200

      // First job - simple math operation
      const jobId1 = generateJobId(`${jobClass}-1`)
      const payload1: JobPayload = {
        job_id: jobId1,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [1, 2, 3] },
      }

      // Use math_add as the actual job class sent to worker
      await runJob({ ...payload1, job_class: 'math_add' }, [`APP_PORT=${port}`])

      const workerState1 = JSON.parse(
        await readFileInContainer(
          `/var/lib/lombok-worker-agent/workers/math_add.json`,
        ),
      )
      const pid1 = workerState1.pid

      // Second job - should reuse same worker
      await new Promise((r) => setTimeout(r, 200))

      const jobId2 = generateJobId(`${jobClass}-2`)
      const payload2: JobPayload = {
        job_id: jobId2,
        job_class: 'math_add',
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [4, 5, 6] },
      }

      await runJob(payload2, [`APP_PORT=${port}`])

      const workerState2 = JSON.parse(
        await readFileInContainer(
          `/var/lib/lombok-worker-agent/workers/math_add.json`,
        ),
      )
      const pid2 = workerState2.pid

      // Same PID means worker was reused
      expect(pid1).toBe(pid2)
    })

    test('worker logs are captured', async () => {
      const jobClass = 'log_capture_test'
      const port = 8201

      const jobId = generateJobId(jobClass)
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [1, 2] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Check worker log files exist
      const outLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/workers/${jobClass}.out.log`,
      )
      const errLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/workers/${jobClass}.err.log`,
      )

      expect(outLogExists).toBe(true)
      expect(errLogExists).toBe(true)

      // Check worker logged startup message
      const workerOut = await readFileInContainer(
        `/var/log/lombok-worker-agent/workers/${jobClass}.out.log`,
      )
      expect(workerOut).toContain('Mock runner listening')
    })

    test('job logs contain handler output', async () => {
      const jobClass = 'math_add'
      const port = 8203

      const jobId = generateJobId('job-log-content-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [10, 20, 30] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Check job log file exists and contains expected content
      const jobLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.out.log`,
      )
      expect(jobLogExists).toBe(true)

      const jobLog = await readFileInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.out.log`,
      )

      // Verify job log contains expected log messages from the handler
      expect(jobLog).toContain('Job accepted')
      expect(jobLog).toContain('Adding 3 numbers')
      expect(jobLog).toContain('Result: 60')
      expect(jobLog).toContain('Job completed successfully')
    })

    test('verbose_log job writes to both stdout and stderr logs', async () => {
      const jobClass = 'verbose_log'
      const port = 8204

      const jobId = generateJobId('verbose-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { steps: 3, simulateWarning: true, simulateError: true },
      }

      const { result } = await runJob(payload, [`APP_PORT=${port}`])
      expect(result.success).toBe(true)

      // Check stdout log
      const jobOutLog = await readFileInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.out.log`,
      )
      expect(jobOutLog).toContain('Starting verbose logging job')
      expect(jobOutLog).toContain('Step 1/3')
      expect(jobOutLog).toContain('Step 2/3')
      expect(jobOutLog).toContain('Step 3/3')
      expect(jobOutLog).toContain('Completed 3 steps successfully')

      // Check stderr log (for errors/warnings)
      const jobErrLog = await readFileInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.err.log`,
      )
      expect(jobErrLog).toContain('Warning at step')
      expect(jobErrLog).toContain('Simulated error condition detected')
    })

    test('async protocol handles delayed jobs via polling', async () => {
      const jobClass = 'verbose_log'
      const port = 8205

      const jobId = generateJobId('async-delay-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        // Job with 5 steps, each delayed by 500ms = 2.5 seconds total
        job_input: { steps: 5, delayMs: 500 },
      }

      const startTime = Date.now()
      const { result } = await runJob(payload, [`APP_PORT=${port}`])
      const elapsed = Date.now() - startTime

      expect(result.success).toBe(true)

      // Verify the job took at least 2 seconds (5 steps * 500ms delay)
      expect(elapsed).toBeGreaterThan(2000)

      // Verify the result contains expected data
      const resultObj = result.result as Record<string, unknown>
      expect(resultObj.stepsCompleted).toBe(5)

      // Verify job logs show all steps
      const jobOutLog = await readFileInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.out.log`,
      )
      expect(jobOutLog).toContain('Step 1/5')
      expect(jobOutLog).toContain('Step 5/5')
      expect(jobOutLog).toContain('Completed 5 steps successfully')
    })
  })

  describe('error handling', () => {
    test('invalid interface kind returns error', async () => {
      const jobId = generateJobId('invalid-interface')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'invalid_job',
        worker_command: ['echo', 'test'],
        interface: { kind: 'invalid_kind' as InterfaceKind },
        job_input: {},
      }

      const { result, exitCode } = await runJob(payload)

      expect(exitCode).not.toBe(0)
      expect(result.success).toBe(false)
    })

    test('invalid base64 payload returns error', async () => {
      const execResult = await execInContainer([
        'lombok-worker-agent',
        'run-job',
        '--payload-base64',
        'not-valid-base64!!!',
      ])

      expect(execResult.exitCode).not.toBe(0)
      expect(execResult.stderr).toContain('failed to decode base64')
    })

    test('invalid JSON payload returns error', async () => {
      const invalidJson = 'not valid json'
      const invalidB64 = Buffer.from(invalidJson).toString('base64')

      const execResult = await execInContainer([
        'lombok-worker-agent',
        'run-job',
        '--payload-base64',
        invalidB64,
      ])

      expect(execResult.exitCode).not.toBe(0)
      expect(execResult.stderr).toContain('failed to parse JSON')
    })

    test('empty worker command returns error', async () => {
      const jobId = generateJobId('empty-cmd')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'empty_cmd_job',
        worker_command: [],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      const { exitCode, rawOutput } = await runJob(payload)

      expect(exitCode).not.toBe(0)
      expect(rawOutput).toContain('worker_command is empty')
    })
  })

  describe('CLI commands', () => {
    test('--help shows usage', async () => {
      const result = await execInContainer(['lombok-worker-agent', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('lombok-worker-agent')
      expect(result.stdout).toContain('run-job')
    })

    test('run-job requires --payload-base64 flag', async () => {
      const result = await execInContainer(['lombok-worker-agent', 'run-job'])

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('required')
    })

    test('job-log reads job stdout', async () => {
      // First create a job with output
      const jobId = generateJobId('job-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'log_test',
        worker_command: ['sh', '-c', 'echo test_log_content'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Read the log using job-log command
      const result = await execInContainer([
        'lombok-worker-agent',
        'job-log',
        '--job-id',
        jobId,
      ])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test_log_content')
    })

    test('job-log --err reads job stderr', async () => {
      const jobId = generateJobId('job-log-err-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'log_err_test',
        worker_command: ['sh', '-c', 'echo stderr_content >&2'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const result = await execInContainer([
        'lombok-worker-agent',
        'job-log',
        '--job-id',
        jobId,
        '--err',
      ])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('stderr_content')
    })

    test('job-log --tail returns last N lines', async () => {
      const jobId = generateJobId('job-log-tail-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'log_tail_test',
        worker_command: [
          'sh',
          '-c',
          'echo line1; echo line2; echo line3; echo line4; echo line5',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const result = await execInContainer([
        'lombok-worker-agent',
        'job-log',
        '--job-id',
        jobId,
        '--tail',
        '2',
      ])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('line4')
      expect(result.stdout).toContain('line5')
    })

    test('worker-log reads worker stdout', async () => {
      const jobClass = 'worker-log-test'
      const port = 8202
      const jobId = generateJobId(jobClass)

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [10, 20] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const result = await execInContainer([
        'lombok-worker-agent',
        'worker-log',
        '--job-class',
        jobClass,
      ])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock runner listening')
    })
  })
})
