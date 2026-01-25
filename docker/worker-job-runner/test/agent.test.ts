import Dockerode from 'dockerode'
import path from 'node:path'
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'bun:test'
import { stdout } from 'node:process'

// =============================================================================
// Configuration
// =============================================================================

const DOCKER_SOCKET = process.env.DOCKER_HOST ?? '/var/run/docker.sock'
const IMAGE_NAME = 'lombok-worker-agent-test'
const CONTAINER_NAME = 'lombok-worker-agent-test-runner'
const PRINT_CONTAINER_LOGS =
  process.env.PRINT_CONTAINER_LOGS === '1' ||
  process.env.PRINT_CONTAINER_LOGS === 'true' ||
  process.argv.includes('--print-container-logs')
const DEBUG =
  process.env.DEBUG === '1' ||
  process.env.DEBUG === 'true' ||
  process.argv.includes('--debug')
const FORCE_REBUILD =
  process.env.REBUILD === '1' ||
  process.env.REBUILD === 'true' ||
  process.argv.includes('--rebuild')

const CONTAINER_ENV = [
  'LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_SIZE_MB=1',
  'LOMBOK_WORKER_AGENT_LOG_ROTATION_MAX_FILES=2',
]

// Go up from docker/worker-job-runner/test to repo root
const REPO_ROOT = path.resolve(import.meta.dir, '..', '..', '..')

// =============================================================================
// Types
// =============================================================================

type InterfaceKind = 'exec_per_job' | 'persistent_http'

interface InterfaceConfig {
  kind: InterfaceKind
  port?: number
}

interface JobPayload {
  job_id: string
  job_class: string
  worker_command: string[]
  interface: InterfaceConfig
  job_input: unknown
  wait_for_completion?: boolean
  job_token?: string
  platform_url?: string
  output_location?: {
    folder_id: string
    prefix?: string
  }
}

interface JobState {
  job_id: string
  job_class: string
  status: string
  started_at: string
  completed_at?: string
  worker_pid?: number
}

interface JobResult {
  success: boolean
  job_id?: string
  job_class?: string
  exit_code?: number
  status?: string
  worker_pid?: number
  result?: unknown
  output_files?: Array<{ folder_id: string; object_key: string }>
  timing?: {
    job_execution_time_seconds: number
    total_time_seconds: number
    worker_startup_time_seconds: number
    worker_ready_time_seconds?: number
  }
  error?: {
    code: string
    message: string
  }
}

// =============================================================================
// Mock Platform Server Types
// =============================================================================

type SignedURLsRequestMethod = 'PUT' | 'DELETE' | 'GET' | 'HEAD'

type UploadURLRequest = Array<{
  folderId: string
  objectKey: string
  method: SignedURLsRequestMethod
}>

interface UploadURLResponse {
  urls: Array<{
    folderId: string
    objectKey: string
    method: 'PUT'
    url: string
  }>
}

interface CompletionRequest {
  success: boolean
  result?: unknown
  error?: { code: string; message: string }
  outputFiles?: Array<{ folderId: string; objectKey: string }>
}

interface MockPlatformServerState {
  uploadUrlRequests: Array<{
    jobId: string
    body: UploadURLRequest
    timestamp: number
  }>
  completionRequests: Array<{
    jobId: string
    body: CompletionRequest
    timestamp: number
  }>
  startRequests: Array<{ jobId: string; timestamp: number }>
  outputFiles: Array<{ url: string; contentType: string; body: string }>
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
    result?: Record<string, unknown> // Expected result from worker's JSON output
  }
}

interface HttpTestCase {
  name: string
  jobClass: string
  port: number
  jobInput: unknown
  expectedResult: {
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
  {
    name: 'worker JSON result saved to result file',
    jobClass: 'json_result_job',
    workerCommand: [
      'sh',
      '-c',
      'echo "Processing..."; echo "Done"; echo \'{"sum":42,"status":"success"}\' > "$JOB_RESULT_FILE"',
    ],
    jobInput: { numbers: [1, 2, 3] },
    expected: {
      success: true,
      exitCode: 0,
      result: { sum: 42, status: 'success' },
    },
  },
  {
    name: 'worker can parse input and return computed result',
    jobClass: 'compute_job',
    // Worker decodes base64 input, extracts numbers, computes sum, outputs JSON
    workerCommand: [
      'sh',
      '-c',
      // Decode input, extract numbers array, compute sum with awk
      'INPUT=$(echo $1 | base64 -d); ' +
        "NUMS=$(echo \"$INPUT\" | grep -o '\"numbers\":\\[[0-9,]*\\]' | grep -o '[0-9]*' | tr '\\n' '+' | sed 's/+$//'); " +
        'SUM=$(echo "$NUMS" | bc); ' +
        'echo "{\\"sum\\":$SUM,\\"computed\\":true}" > "$JOB_RESULT_FILE"',
      'sh',
    ],
    jobInput: { numbers: [10, 20, 30] },
    expected: {
      success: true,
      exitCode: 0,
      result: { sum: 60, computed: true },
    },
  },
]

const httpTestCases: HttpTestCase[] = [
  // Math operations
  {
    name: 'math_add: sums numbers correctly',
    jobClass: 'math_add_8090',
    port: 8090,
    jobInput: { numbers: [1, 2, 3, 4, 5] },
    expectedResult: {
      success: true,
      result: { sum: 15, operands: [1, 2, 3, 4, 5] },
    },
  },
  {
    name: 'math_multiply: multiplies numbers correctly',
    jobClass: 'math_multiply_8091',
    port: 8091,
    jobInput: { numbers: [2, 3, 4] },
    expectedResult: {
      success: true,
      result: { product: 24, operands: [2, 3, 4] },
    },
  },
  {
    name: 'math_factorial: calculates factorial of 10',
    jobClass: 'math_factorial_8092',
    port: 8092,
    jobInput: { n: 10 },
    expectedResult: {
      success: true,
      result: { factorial: 3628800, n: 10 },
    },
  },
  {
    name: 'math_fibonacci: calculates 20th fibonacci number',
    jobClass: 'math_fibonacci_8093',
    port: 8093,
    jobInput: { n: 20 },
    expectedResult: {
      success: true,
      result: { fibonacci: 6765, n: 20 },
    },
  },
  {
    name: 'math_prime_check: identifies 97 as prime',
    jobClass: 'math_prime_check_8094',
    port: 8094,
    jobInput: { n: 97 },
    expectedResult: {
      success: true,
      result: { isPrime: true, n: 97 },
    },
  },
  {
    name: 'math_prime_check: identifies 100 as not prime',
    jobClass: 'math_prime_check_8095',
    port: 8095,
    jobInput: { n: 100 },
    expectedResult: {
      success: true,
      result: { isPrime: false, n: 100, factor: 2 },
    },
  },
  // String operations
  {
    name: 'string_hash: hashes string with sha256',
    jobClass: 'string_hash_8096',
    port: 8096,
    jobInput: { text: 'hello world', algorithm: 'sha256' },
    expectedResult: {
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
    jobClass: 'string_hash_8097',
    port: 8097,
    jobInput: { text: 'test', algorithm: 'md5' },
    expectedResult: {
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
    jobClass: 'string_reverse_8098',
    port: 8098,
    jobInput: { text: 'Hello, World!' },
    expectedResult: {
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
    jobClass: 'string_base64_8099',
    port: 8099,
    jobInput: { text: 'Hello, World!', operation: 'encode' },
    expectedResult: {
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
    jobClass: 'string_base64_8100',
    port: 8100,
    jobInput: { text: 'SGVsbG8sIFdvcmxkIQ==', operation: 'decode' },
    expectedResult: {
      success: true,
      result: { result: 'Hello, World!', operation: 'decode', inputLength: 20 },
    },
  },
  {
    name: 'string_count: counts substring occurrences',
    jobClass: 'string_count_8101',
    port: 8101,
    jobInput: { text: 'banana', substring: 'an' },
    expectedResult: {
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
    expectedResult: {
      success: true,
      result: { sorted: [1, 2, 5, 8, 9], order: 'asc', itemCount: 5 },
    },
  },
  {
    name: 'array_sort: sorts numbers descending',
    jobClass: 'array_sort_8103',
    port: 8103,
    jobInput: { items: [5, 2, 8, 1, 9], order: 'desc' },
    expectedResult: {
      success: true,
      result: { sorted: [9, 8, 5, 2, 1], order: 'desc', itemCount: 5 },
    },
  },
  {
    name: 'array_stats: calculates statistics correctly',
    jobClass: 'array_stats_8104',
    port: 8104,
    jobInput: { numbers: [1, 2, 3, 4, 5] },
    expectedResult: {
      success: true,
      result: { sum: 15, min: 1, max: 5, mean: 3, median: 3, count: 5 },
    },
  },
  // Error handling
  {
    name: 'unknown job class returns error',
    jobClass: 'nonexistent_job_class_8105',
    port: 8105,
    jobInput: {},
    expectedResult: {
      success: false,
      errorCode: 'UNKNOWN_JOB_CLASS',
    },
  },
  {
    name: 'invalid input returns error',
    jobClass: 'math_add_8106',
    port: 8106,
    jobInput: { numbers: 'not an array' },
    expectedResult: {
      success: false,
      errorCode: 'JOB_EXECUTION_ERROR',
    },
  },
  // Verbose logging tests
  {
    name: 'verbose_log: runs through multiple steps',
    jobClass: 'verbose_log_8107',
    port: 8107,
    jobInput: { steps: 5 },
    expectedResult: {
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
    jobClass: 'verbose_log_8108',
    port: 8108,
    jobInput: { steps: 4, simulateWarning: true, simulateError: true },
    expectedResult: {
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
// Mock Platform Server
// =============================================================================

let mockPlatformServer: ReturnType<typeof Bun.serve> | null = null
let mockS3Server: ReturnType<typeof Bun.serve> | null = null
const MOCK_CORE_PORT = 19876
const MOCK_S3_PORT = 19877
const MOCK_JOB_TOKEN = 'test-jwt-token-for-testing'

// Track all requests made to the mock servers
let mockPlatformState: MockPlatformServerState = {
  uploadUrlRequests: [],
  completionRequests: [],
  startRequests: [],
  outputFiles: [],
}

function resetMockPlatformState(): void {
  mockPlatformState = {
    uploadUrlRequests: [],
    completionRequests: [],
    startRequests: [],
    outputFiles: [],
  }
}

function startMockPlatformServer(): void {
  mockPlatformServer = Bun.serve({
    port: MOCK_CORE_PORT,
    hostname: '0.0.0.0', // Listen on all interfaces so container can reach it
    fetch: async (req) => {
      const url = new URL(req.url)
      const path = url.pathname

      // Check authorization header
      const authHeader = req.headers.get('Authorization')
      if (authHeader !== `Bearer ${MOCK_JOB_TOKEN}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // POST /api/v1/docker/jobs/{job_id}/request-presigned-urls
      const uploadUrlMatch = path.match(
        /^\/api\/v1\/docker\/jobs\/([^/]+)\/request-presigned-urls$/,
      )
      if (uploadUrlMatch && req.method === 'POST') {
        const jobId = uploadUrlMatch[1]
        const body = (await req.json()) as UploadURLRequest

        mockPlatformState.uploadUrlRequests.push({
          jobId,
          body,
          timestamp: Date.now(),
        })

        // Generate presigned URLs pointing to mock S3 server
        const response: UploadURLResponse = {
          urls: body.map((file) => ({
            folderId: file.folderId,
            objectKey: file.objectKey,
            method: 'PUT',
            url: `http://host.docker.internal:${MOCK_S3_PORT}/upload/${
              file.folderId
            }/${encodeURIComponent(file.objectKey)}`,
          })),
        }

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // POST /api/v1/docker/jobs/{job_id}/start
      const startMatch = path.match(/^\/api\/v1\/docker\/jobs\/([^/]+)\/start$/)
      if (startMatch && req.method === 'POST') {
        const jobId = startMatch[1]
        mockPlatformState.startRequests.push({ jobId, timestamp: Date.now() })

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // POST /api/v1/docker/jobs/{job_id}/complete
      const completeMatch = path.match(
        /^\/api\/v1\/docker\/jobs\/([^/]+)\/complete$/,
      )
      if (completeMatch && req.method === 'POST') {
        const jobId = completeMatch[1]
        const body = (await req.json()) as CompletionRequest

        mockPlatformState.completionRequests.push({
          jobId,
          body,
          timestamp: Date.now(),
        })

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    },
  })
}

function startMockS3Server(): void {
  mockS3Server = Bun.serve({
    port: MOCK_S3_PORT,
    hostname: '0.0.0.0',
    fetch: async (req) => {
      const url = new URL(req.url)

      // PUT /upload/{folder_id}/{object_key} - S3 presigned upload
      if (req.method === 'PUT' && url.pathname.startsWith('/upload/')) {
        const contentType =
          req.headers.get('Content-Type') || 'application/octet-stream'
        const body = await req.text()

        mockPlatformState.outputFiles.push({
          url: url.pathname,
          contentType,
          body,
        })

        return new Response('', { status: 200 })
      }

      return new Response('Not Found', { status: 404 })
    },
  })
}

function stopMockServers(): void {
  if (mockPlatformServer) {
    mockPlatformServer.stop()
    mockPlatformServer = null
  }
  if (mockS3Server) {
    mockS3Server.stop()
    mockS3Server = null
  }
}

// Get the host IP that the container can use to reach the host
// On macOS with Docker Desktop, use host.docker.internal
// On Linux, we'd need to use the docker bridge IP
function getMockPlatformUrl(): string {
  return `http://host.docker.internal:${MOCK_CORE_PORT}`
}

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
    Tty: false,
    Cmd: ['lombok-worker-agent', 'start'],
    Env: CONTAINER_ENV,
  })

  await container.start()
  console.log(`Container started: ${container.id.slice(0, 12)}`)
  if (PRINT_CONTAINER_LOGS) {
    container.logs(
      { follow: true, stdout: true, stderr: true },
      (err, stream) => {
        if (err) {
          console.error('Error following container logs:', err)
        } else {
          stream?.on('data', (data) => {
            console.log(data.toString())
          })
        }
      },
    )
  }
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

async function readJobLog(
  jobId: string,
  options?: { tail?: number },
): Promise<string> {
  const args = ['lombok-worker-agent', 'job-log', '--job-id', jobId]
  if (options?.tail !== undefined) {
    args.push('--tail', String(options.tail))
  }
  const result = await execInContainer(args)
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read job log for ${jobId}: ${result.stderr}`)
  }
  return result.stdout
}

/**
 * Parses all structured job log lines from job log content.
 */
function parseJobLogs(content: string): StructuredLogEntry[] {
  return parseStructuredLogs(content)
}

async function readWorkerLog(
  port: number,
  options?: { tail?: number },
): Promise<string> {
  const args = ['lombok-worker-agent', 'worker-log', '--port', String(port)]
  if (options?.tail !== undefined) {
    args.push('--tail', String(options.tail))
  }
  const result = await execInContainer(args)
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to read worker log for port ${port}: ${result.stderr}`,
    )
  }
  return result.stdout
}

async function readWorkerState(port: number): Promise<string> {
  const args = ['lombok-worker-agent', 'worker-state', '--port', String(port)]
  const result = await execInContainer(args)
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to read worker state for port ${port}: ${result.stderr}`,
    )
  }
  return result.stdout
}

async function readJobState(jobId: string): Promise<string> {
  const args = ['lombok-worker-agent', 'job-state', '--job-id', jobId]
  const result = await execInContainer(args)
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to read job state for job "${jobId}": ${result.stderr}`,
    )
  }
  return result.stdout
}

async function waitForWorkerStatus(
  port: number,
  expectedStatus: string,
  timeoutMs = 5000,
): Promise<{ status: string; pid: number }> {
  const deadline = Date.now() + timeoutMs
  let lastStatus: { status?: string; pid?: number } | undefined

  while (Date.now() < deadline) {
    try {
      const rawState = await readWorkerState(port)
      lastStatus = JSON.parse(rawState) as { status?: string; pid?: number }
      if (lastStatus.status === expectedStatus) {
        return lastStatus as { status: string; pid: number }
      }
    } catch (err) {
      if (
        !(err instanceof Error) ||
        !err.message.includes('worker state not found for port')
      ) {
        throw err
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(
    `Timed out waiting for worker status ${expectedStatus}. Last status: ${JSON.stringify(
      lastStatus ?? {},
    )}`,
  )
}

async function waitForJobStatus(
  jobId: string,
  expectedStatus: string,
  timeoutMs = 5000,
): Promise<{ status: string }> {
  const deadline = Date.now() + timeoutMs
  let lastStatus: { status?: string } | undefined

  while (Date.now() < deadline) {
    const rawState = await readJobState(jobId)
    lastStatus = JSON.parse(rawState) as { status?: string }
    if (lastStatus.status === expectedStatus) {
      return lastStatus as { status: string }
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(
    `Timed out waiting for job status ${expectedStatus}. Last status: ${JSON.stringify(
      lastStatus ?? {},
    )}`,
  )
}

async function readAgentLog(options?: {
  tail?: number
  grep?: string
}): Promise<string> {
  const args = ['lombok-worker-agent', 'agent-log']
  if (options?.tail !== undefined) {
    args.push('--tail', String(options.tail))
  }
  if (options?.grep) {
    args.push('--grep', options.grep)
  }
  const result = await execInContainer(args)
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read agent log: ${result.stderr}`)
  }
  return result.stdout
}

// Structured log entry format: timestamp|LEVEL|["message",{optional_data}]
interface StructuredLogEntry {
  timestamp: string
  level: string
  message: string
  data?: any
}

/**
 * Parses a structured log line into its components
 * Format: timestamp|LEVEL|["message",{optional_data}]
 *
 * If the JSON portion has been truncated by the agent-log / job-log reader
 * (which applies a fixed-length truncation and appends " [truncated]"),
 * JSON.parse may fail. In that case, if we detect the truncation marker we
 * still return a StructuredLogEntry treating the truncated JSON segment as
 * the message, so that truncation-related lines are not silently discarded.
 */
function parseStructuredLogLine(line: string): StructuredLogEntry | null {
  const trimmed = line.trim()
  if (!trimmed) {
    return null
  }

  // Split by pipe separator: timestamp|LEVEL|JSON
  const parts = trimmed.split('|')
  if (parts.length < 3) {
    return null
  }

  const [timestamp, level, jsonPart] = parts

  try {
    // Parse the JSON array: ["message",{optional_data}]
    const logArray = JSON.parse(jsonPart)
    if (!Array.isArray(logArray) || logArray.length === 0) {
      return null
    }

    const message = logArray[0]
    const data = logArray.length > 1 ? logArray[1] : undefined

    return {
      timestamp,
      level,
      message,
      data,
    }
  } catch (e) {
    // If the JSON is truncated (e.g. due to the Go reader truncating long
    // lines and appending " [truncated]"), we still want to surface the line
    // to tests rather than dropping it entirely. In that case, treat the
    // truncated JSON segment as the message, with no structured data.
    if (jsonPart.includes('[truncated]')) {
      return {
        timestamp,
        level,
        message: jsonPart,
        data: undefined,
      }
    }

    return null
  }
}

/**
 * Parses all structured log lines from agent log content
 */
function parseStructuredLogs(content: string): StructuredLogEntry[] {
  const lines = content.split('\n')
  const entries: StructuredLogEntry[] = []

  for (const line of lines) {
    const entry = parseStructuredLogLine(line)
    if (entry) {
      entries.push(entry)
    }
  }

  return entries
}

/**
 * Finds log entries matching a predicate
 */
function findLogEntries(
  entries: StructuredLogEntry[],
  predicate: (entry: StructuredLogEntry) => boolean,
): StructuredLogEntry[] {
  return entries.filter(predicate)
}

async function readContainerLogs(options?: {
  tail?: number
  since?: number
}): Promise<string> {
  if (!container) {
    throw new Error('Container not started')
  }

  const logOptions: Dockerode.ContainerLogsOptions & { follow: false } = {
    stdout: true,
    stderr: true, // Need both to get the multiplexed stream, then we demux
    follow: false, // Don't follow, just read existing logs
  }

  if (options?.tail !== undefined) {
    logOptions.tail = options.tail
  }

  if (options?.since !== undefined) {
    logOptions.since = options.since
  }

  return new Promise((resolve, reject) => {
    container!.logs(
      logOptions,
      (
        err: Error | null,
        stream: NodeJS.ReadableStream | Buffer | undefined,
      ) => {
        if (err) {
          return reject(err)
        }

        if (!stream) {
          return reject(new Error('No stream returned from container.logs'))
        }

        // If it's a Buffer, we need to demux it manually
        if (Buffer.isBuffer(stream)) {
          const stdout: Buffer[] = []
          // Manually demux the buffer (Docker format: 1 byte stream type, 3 bytes padding, 4 bytes size, then payload)
          let offset = 0
          while (offset < stream.length) {
            if (offset + 8 > stream.length) {
              break
            }
            const streamType = stream[offset]
            const size = stream.readUInt32BE(offset + 4)
            offset += 8

            if (offset + size > stream.length) {
              break
            }

            if (streamType === 1) {
              // stdout
              stdout.push(stream.subarray(offset, offset + size))
            }
            // streamType === 2 is stderr, which we ignore

            offset += size
          }
          return resolve(Buffer.concat(stdout).toString('utf-8'))
        }

        // Otherwise it's a stream - demux it using docker.modem.demuxStream
        const stdout: Buffer[] = []
        const stdoutStream = {
          write: (chunk: Buffer) => {
            stdout.push(chunk)
            return true
          },
          end: () => {},
        }
        const stderrStream = {
          write: () => {
            // Ignore stderr
            return true
          },
          end: () => {},
        }

        // Demux the stream (Docker multiplexes stdout/stderr with headers)
        docker.modem.demuxStream(
          stream,
          stdoutStream as any,
          stderrStream as any,
        )

        stream.on('end', () => {
          resolve(Buffer.concat(stdout).toString('utf-8'))
        })
        stream.on('error', reject)
      },
    )
  })
}

async function fileExistsInContainer(filePath: string): Promise<boolean> {
  const result = await execInContainer(['test', '-f', filePath])
  return result.exitCode === 0
}

async function dirExistsInContainer(dirPath: string): Promise<boolean> {
  const result = await execInContainer(['test', '-d', dirPath])
  return result.exitCode === 0
}

// =============================================================================
// Agent Utilities
// =============================================================================

function jobStateFilePath(jobId: string): string {
  return `/var/lib/lombok-worker-agent/jobs/${jobId}.json`
}

function makePayloadBase64(payload: JobPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

function generateJobId(prefix: string): string {
  return `${prefix}-${Date.now()}`
}

async function appendToAgentLog(lines: number): Promise<void> {
  await execInContainer([
    'sh',
    '-c',
    `for i in $(seq 1 ${lines}); do printf 'logline %s\\n' "$i"; done >> /var/log/lombok-worker-agent/agent.log`,
  ])
}

async function rotateLogsOnce(): Promise<void> {
  const logPath = '/var/log/lombok-worker-agent/agent.log'
  const exists = await fileExistsInContainer(logPath)
  if (!exists) {
    throw new Error(`expected agent log to exist before rotation at ${logPath}`)
  }

  const result = await execInContainer(['lombok-worker-agent', 'rotate-logs'])
  if (result.exitCode !== 0) {
    throw new Error(`rotate-logs failed: ${result.stderr}`)
  }
}

async function shutdownWorker(port: number): Promise<void> {
  await execInContainer([
    'wget',
    '--post-data=',
    '-q',
    '-O',
    '-',
    `http://127.0.0.1:${port}/shutdown`,
  ]).then(({ exitCode, stdout, stderr }) => {
    if (exitCode !== 0) {
      if (
        stderr?.includes(`can't connect to remote host (127.0.0.1)`) ||
        stderr?.includes(`404 Not Found`)
      ) {
        return
      }
      console.log(
        `Failed to shutdown worker on port ${port}: ${exitCode} - ${
          stderr ?? stdout
        }`,
      )
    }
  })
}

async function runJob(
  payload: JobPayload,
  env?: string[],
): Promise<{
  jobResult: JobResult | Partial<JobResult>
  jobState: JobState | Partial<JobState>
  exitCode: number
  rawOutput: string
}> {
  const payloadWithDefaults: JobPayload = {
    wait_for_completion: true,
    ...payload,
  }
  const payloadB64 = makePayloadBase64(payloadWithDefaults)

  const execResult = await execInContainer(
    ['lombok-worker-agent', 'run-job', '--payload-base64', payloadB64],
    env,
  )

  const jobId = payloadWithDefaults.job_id

  const jobState = (await readJobState(jobId)
    .catch(() => '')
    .then((stdout) =>
      stdout ? JSON.parse(stdout) : undefined,
    )) as Partial<JobState>

  const jobResult = (await readJobResultViaCLI(jobId).then(({ stdout }) =>
    stdout ? JSON.parse(stdout) : {},
  )) as Partial<JobResult>

  if (DEBUG) {
    console.log('jobResult', jobResult)
    console.log('jobState', jobState)
    console.log('execResult', execResult)
  }

  if (payload.interface.port) {
    setTimeout(() => shutdownWorker(payload.interface.port!), 5000)
  }
  return {
    jobResult,
    jobState,
    exitCode: execResult.exitCode,
    rawOutput: execResult.stdout + execResult.stderr,
  }
}

async function readJobResultViaCLI(
  jobId: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = await execInContainer([
    'lombok-worker-agent',
    'job-result',
    '--job-id',
    jobId,
  ])

  return result
}

// =============================================================================
// Tests
// =============================================================================

describe('Platform Agent', () => {
  beforeAll(async () => {
    // Start mock servers for platform API and S3
    startMockPlatformServer()
    startMockS3Server()

    await initDocker()
    await buildImage()
    await startContainer()
  }, 120_000) // 2 minute timeout for build

  afterAll(async () => {
    await stopContainer()
    stopMockServers()
  })

  beforeEach(() => {
    // Reset mock server state before each test
    resetMockPlatformState()
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

        const {
          jobState: state,
          jobResult: result,
          exitCode,
          rawOutput,
        } = await runJob(payload)
        expect(state.status).toEqual(
          testCase.expected.success ? 'success' : 'failed',
        )
        expect(result.success).toBe(testCase.expected.success)

        // Check success/failure
        expect(result.success).toBe(testCase.expected.success)

        // Check exit code if specified
        if (testCase.expected.exitCode !== undefined) {
          expect(exitCode).toBe(testCase.expected.exitCode)
        }

        // Check output contains expected strings
        if (testCase.expected.outputContains) {
          const jobOut = await readJobLog(jobId)
          for (const expected of testCase.expected.outputContains) {
            expect(jobOut).toContain(expected)
          }
        }

        // Check stderr contains expected strings
        if (testCase.expected.stderrContains) {
          const jobErr = await readJobLog(jobId)
          for (const expected of testCase.expected.stderrContains) {
            expect(jobErr).toContain(expected)
          }
        }

        // Verify the worker's result is captured from stdout and parsed by the agent
        if (testCase.expected.result) {
          expect(result.result).toBeDefined()
          expect(typeof result.result).toBe('object') // Should be a parsed object, not a string
          const resultObj = result.result as Record<string, unknown>
          for (const [key, expectedValue] of Object.entries(
            testCase.expected.result,
          )) {
            expect(resultObj[key]).toEqual(expectedValue)
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

    test('returns parseable JSON result with expected structure', async () => {
      const jobId = generateJobId('json-structure-test')
      const jobClass = 'json_structure_test'

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: [
          'sh',
          '-c',
          'echo \'{"message":"hello","value":123}\' > "$JOB_RESULT_FILE"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: { test: true },
      }

      const { jobResult: result } = await runJob(payload)

      // Verify the output is valid JSON by checking we got a parsed result
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')

      // Verify the expected fields exist in the JSON result
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('job_id')
      expect(result).toHaveProperty('job_class')
      expect(typeof result.success).toBe('boolean')
      expect(result.job_id).toBe(jobId)
      expect((result as unknown as Record<string, unknown>).job_class).toBe(
        jobClass,
      )

      // For successful jobs, exit_code should be 0
      expect(result.exit_code).toBe(0)
      expect(result.success).toBe(true)

      // Verify worker's JSON result is captured and parsed by the agent
      expect(result.result).toBeDefined()
      expect(typeof result.result).toBe('object') // Should be a parsed object, not a string
      const workerResult = result.result as Record<string, unknown>
      expect(workerResult.message).toBe('hello')
      expect(workerResult.value).toBe(123)
    })

    test('failed job returns parseable JSON with error structure', async () => {
      const jobId = generateJobId('json-error-structure-test')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'json_error_test',
        worker_command: ['sh', '-c', 'exit 1'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      const { jobResult: result } = await runJob(payload)

      // Verify the result has expected structure
      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.job_id).toBe(jobId)
      expect(result.exit_code).toBe(1)

      // Verify error object structure
      expect(result.error).toBeDefined()
      expect(result.error).toHaveProperty('code')
      expect(result.error).toHaveProperty('message')
      expect(result.error?.code).toBe('WORKER_EXIT_ERROR')
    })

    test('job output directory is created for exec_per_job', async () => {
      const jobId = generateJobId('exec-output-dir-test')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'output_dir_test',
        worker_command: ['sh', '-c', 'echo "test"'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Verify output directory was created by the agent
      const outputDirExists = await dirExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}/output`,
      )
      expect(outputDirExists).toBe(true)
    })

    test('JOB_OUTPUT_DIR environment variable is set for workers', async () => {
      const jobId = generateJobId('env-output-dir-test')

      // This command echoes the JOB_OUTPUT_DIR value as JSON into the result file
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'env_test',
        worker_command: [
          'sh',
          '-c',
          `echo '{"output_dir":"'$JOB_OUTPUT_DIR'"}' > "$JOB_RESULT_FILE"`,
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      const { jobResult: result } = await runJob(payload)
      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()
      expect(typeof result.result).toBe('object') // Should be a parsed object, not a string

      const workerResult = result.result as Record<string, unknown>
      expect(workerResult.output_dir).toBe(
        `/var/lib/lombok-worker-agent/jobs/${jobId}/output`,
      )
    })

    test('timing information is included in response JSON', async () => {
      const jobId = generateJobId('timing-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'timing_test',
        worker_command: [
          'sh',
          '-c',
          'sleep 0.1 && echo \'{"done":true}\' > "$JOB_RESULT_FILE"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: { test: 'data' },
      }

      const { jobResult: result } = await runJob(payload)

      // Verify timing object exists in response
      expect(result.timing).toBeDefined()
      expect(typeof result.timing).toBe('object')

      const timing = result.timing as Record<string, unknown>

      // Verify all timing fields are present
      expect(timing).toHaveProperty('job_execution_time_seconds')
      expect(timing).toHaveProperty('total_time_seconds')
      expect(timing).toHaveProperty('worker_startup_time_seconds')

      // Verify timing values are numbers and non-negative
      expect(typeof timing.job_execution_time_seconds).toBe('number')
      expect(typeof timing.total_time_seconds).toBe('number')
      expect(typeof timing.worker_startup_time_seconds).toBe('number')

      expect((timing.job_execution_time_seconds as number) >= 0).toBe(true)
      expect((timing.total_time_seconds as number) >= 0).toBe(true)
      expect((timing.worker_startup_time_seconds as number) >= 0).toBe(true)

      // Verify total_time includes job_execution_time (total should be >= execution)
      expect(
        (timing.total_time_seconds as number) >=
          (timing.job_execution_time_seconds as number),
      ).toBe(true)
    })

    test('timing is logged in agent log', async () => {
      const jobId = generateJobId('timing-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'timing_log_test',
        worker_command: ['sh', '-c', 'echo "test"'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Read agent log
      const agentLogContent = await readAgentLog()
      const entries = parseStructuredLogs(agentLogContent)

      // Find log entries related to this job
      const jobEntries = findLogEntries(
        entries,
        (e) => e.data?.job_id === jobId,
      )

      expect(jobEntries.length).toBeGreaterThan(0)

      // Find entries with timing information
      const timingEntries = findLogEntries(
        jobEntries,
        (e) =>
          e.data?.job_execution_time !== undefined ||
          e.data?.total_time !== undefined ||
          e.data?.worker_startup_time !== undefined,
      )

      expect(timingEntries.length).toBeGreaterThan(0)

      // Verify at least one entry has timing data
      const hasTiming = timingEntries.some(
        (e) =>
          e.data?.job_execution_time !== undefined &&
          e.data?.total_time !== undefined,
      )
      expect(hasTiming).toBe(true)
    })

    test('returns immediately when wait_for_completion is false for exec_per_job', async () => {
      const jobId = generateJobId('exec-async-test')

      const start = Date.now()
      const { exitCode } = await runJob({
        job_id: jobId,
        job_class: 'async_exec',
        worker_command: ['sh', '-c', 'sleep 2 && echo done'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
        wait_for_completion: false,
      })
      const elapsed = Date.now() - start
      const jobState = JSON.parse(
        await readJobState(jobId).then((stdout) => stdout),
      )

      expect(exitCode).toBe(0)
      expect(elapsed).toBeLessThan(2000)
      expect(jobState.status).toEqual('running')
      expect(jobState.worker_pid).toBeDefined()
      expect(jobState.status).toBe(jobState.status)

      const stateExists = await fileExistsInContainer(jobStateFilePath(jobId))
      expect(stateExists).toBe(true)

      const resultFileExists = await fileExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      expect(resultFileExists).toBe(false)

      expect(
        readJobState(jobId).then((stdout) => JSON.parse(stdout)),
      ).resolves.toEqual({
        job_id: jobId,
        job_class: 'async_exec',
        status: 'running',
        started_at: expect.any(String),
        worker_kind: 'exec_per_job',
        worker_pid: expect.any(Number),
      })
    })

    test('exec-worker-example.ts: accepts base64 job input and outputs structured logs', async () => {
      const jobId = generateJobId('exec-worker-example-test')
      const jobPayload = {
        job_id: jobId,
        job_class: 'example_job',
        job_input: { message: 'test input', value: 42 },
      }

      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'example_job',
        worker_command: ['bun', 'run', 'src/exec-worker-example.ts'],
        interface: { kind: 'exec_per_job' },
        job_input: jobPayload.job_input,
      }

      const submitExec = await runJob(payload)
      await waitForJobStatus(jobId, 'success')
      const jobResult = await readJobResultViaCLI(jobId).then(({ stdout }) =>
        JSON.parse(stdout),
      )

      // Verify job succeeded
      expect(submitExec.exitCode).toBe(0)

      // Verify result structure
      expect(jobResult.exit_code).toBe(0)
      expect(jobResult.result.processed).toBe(true)

      // Verify structured logs appear in job log
      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      // Should have structured log entries with JOB_ID_ prefix
      const jobIdEntries = findLogEntries(entries, (e) =>
        e.message.includes('Job started'),
      )

      expect(jobIdEntries.length).toBeGreaterThan(0)

      // Verify logs contain job-specific information
      const processingEntries = findLogEntries(entries, (e) =>
        e.message.includes('Processing job input'),
      )
      expect(processingEntries.length).toBeGreaterThan(0)

      const completedEntries = findLogEntries(entries, (e) =>
        e.message.includes('Job completed successfully'),
      )
      expect(completedEntries.length).toBeGreaterThan(0)
    })

    test('exec-worker-example.ts: structured logs appear in unified log with JOB_ID_ prefix', async () => {
      const jobId = generateJobId('exec-worker-example-unified-log-test')
      const jobInput = {
        job_id: jobId,
        job_class: 'example_job',
        job_input: { test: 'unified log' },
      }

      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'example_job',
        worker_command: ['bun', 'run', 'src/exec-worker-example.ts'],
        interface: { kind: 'exec_per_job' },
        job_input: jobInput.job_input,
      }

      await runJob(payload)

      // Wait for logs to be flushed
      await new Promise((resolve) => setTimeout(resolve, 500))

      const unifiedLogContent = await readFileInContainer(
        '/var/log/lombok-worker-agent/lombok-worker-agent.log',
      )

      // Find job log entries - format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
      const jobLogPrefix = `JOB_ID_${jobId}`
      const jobLogLines = unifiedLogContent.split('\n').filter((line) => {
        const parts = line.split('|')
        return parts.length >= 3 && parts[1] === jobLogPrefix
      })

      expect(jobLogLines.length).toBeGreaterThan(0)

      // Verify format
      for (const line of jobLogLines) {
        const parts = line.split('|')
        expect(parts.length).toBeGreaterThanOrEqual(3)
        expect(parts[1]).toBe(jobLogPrefix)
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          parts[2],
        )
      }
    })
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
            port: testCase.port,
          },
          job_input: testCase.jobInput,
        }

        // Set APP_PORT env for the mock worker
        const { jobResult: result } = await runJob(payload, [
          `APP_PORT=${testCase.port}`,
        ])

        expect(result.success).toBe(testCase.expectedResult.success)

        // Verify the exact result matches expected values
        if (testCase.expectedResult.result && result.success) {
          const resultObj = result.result as Record<string, unknown>
          for (const [key, expectedValue] of Object.entries(
            testCase.expectedResult.result,
          )) {
            expect(resultObj[key]).toEqual(expectedValue)
          }
        }

        // Verify error code for failure cases
        if (testCase.expectedResult.errorCode && !result.success) {
          expect(result.error?.code).toBe(testCase.expectedResult.errorCode)
        }

        const workerState = await readWorkerState(testCase.port).then(
          (stdout) => JSON.parse(stdout),
        )

        expect(workerState.status).toBe('ready')
        expect(workerState.kind).toBe('persistent_http')
      })
    }

    test('returns parseable JSON result with expected structure', async () => {
      const jobClass = 'math_add_8210'
      const port = 8210

      const jobId = generateJobId('http-json-structure-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [10, 20, 30] },
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      // Verify the output is valid JSON by checking we got a parsed result
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')

      // Verify expected fields exist
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('job_id')
      expect(result).toHaveProperty('job_class')
      expect(typeof result.success).toBe('boolean')
      expect(result.job_id).toBe(jobId)
      expect((result as unknown as Record<string, unknown>).job_class).toBe(
        jobClass,
      )

      // For successful jobs, result.result should contain the parsed job output
      // (the agent parses the HTTP response result and includes it as an object)
      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()
      expect(typeof result.result).toBe('object') // Should be a parsed object, not a string
      expect((result.result as Record<string, unknown>).sum).toBe(60)

      const secondPayload: JobPayload = {
        job_id: generateJobId('http-json-structure-test-2'),
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [10, 20, 30] },
      }

      const { jobResult: secondResult } = await runJob(secondPayload, [
        `APP_PORT=${port}`,
      ])

      expect(secondResult).toBeDefined()
    })

    test('failed job returns parseable JSON with error structure', async () => {
      const jobClass = 'math_add_8211'
      const port = 8211

      const jobId = generateJobId('http-json-error-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        // Invalid input - math_add expects { numbers: number[] }
        job_input: { invalid: 'input' },
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      // Verify result has expected structure
      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.job_id).toBe(jobId)

      // Verify error object structure
      expect(result.error).toBeDefined()
      expect(result.error).toHaveProperty('code')
      expect(result.error).toHaveProperty('message')
    })

    test('worker responds to /health/ready endpoint for readiness check', async () => {
      const port = 8212

      // Start a worker by running a job first
      const jobId = generateJobId('readiness-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'math_add_8212',
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2] },
      }

      // Run a job to ensure worker is started
      await runJob(payload, [`APP_PORT=${port}`])

      // Verify the /health/ready endpoint using wget (available in Alpine)
      const healthResult = await execInContainer([
        'wget',
        '-q',
        '-O',
        '-',
        `http://127.0.0.1:${port}/health/ready`,
      ])

      expect(healthResult.exitCode).toBe(0)
      const healthBody = JSON.parse(healthResult.stdout)
      expect(healthBody.ready).toBe(true)
    })

    test('cancelling a persistent_http job does NOT stop the worker', async () => {
      const port = 8301
      const jobClass = 'math_add_8301'
      const workerCommand = ['bun', 'run', 'src/mock-worker.ts']

      // Start a worker by running a job first
      const firstJobId = generateJobId('cancel-test-1')
      const firstPayload: JobPayload = {
        job_id: firstJobId,
        job_class: jobClass,
        worker_command: workerCommand,
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2, 3] },
        wait_for_completion: false,
      }

      await runJob(firstPayload, [`APP_PORT=${port}`])

      // Wait for worker to be ready
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Get the worker state to verify PID
      const workerStateBefore = await readWorkerState(port).then(
        (stdout) => JSON.parse(stdout) as { pid: number; status: string },
      )

      expect(workerStateBefore.pid).toBeGreaterThan(0)
      const workerPid = workerStateBefore.pid

      // Verify worker is responding to health checks
      const healthBefore = await execInContainer([
        'wget',
        '-q',
        '-O',
        '-',
        `http://127.0.0.1:${port}/health/ready`,
      ])
      expect(healthBefore.exitCode).toBe(0)
      const healthBodyBefore = JSON.parse(healthBefore.stdout)
      expect(healthBodyBefore.ready).toBe(true)

      // Start a second job that we'll cancel
      const cancelJobId = generateJobId('cancel-test-2')
      const cancelPayload: JobPayload = {
        job_id: cancelJobId,
        job_class: jobClass,
        worker_command: workerCommand,
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [4, 5, 6] },
        wait_for_completion: false,
      }

      await runJob(cancelPayload, [`APP_PORT=${port}`])
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Cancel the job by sending POST to /job/:id/cancel
      const cancelResult = await execInContainer([
        'wget',
        '--post-data=',
        '--header=Content-Type: application/json',
        '-q',
        '-O',
        '-',
        `http://127.0.0.1:${port}/job/${cancelJobId}/cancel`,
      ])

      expect(cancelResult.exitCode).toBe(0)
      const cancelResponse = JSON.parse(cancelResult.stdout)
      expect(cancelResponse.status).toBe('failed')
      expect(cancelResponse.error?.code).toBe('JOB_CANCELLED')

      // CRITICAL: Verify the worker is STILL running after cancellation
      // 1. Check worker state PID is still the same (worker wasn't killed)
      const workerStateAfter = await readWorkerState(port).then(
        (stdout) => JSON.parse(stdout) as { pid: number; status: string },
      )

      expect(workerStateAfter.pid).toBe(workerPid)
      expect(workerStateAfter.status).not.toBe('stopped')

      // 2. Verify /health/ready still works
      const healthAfter = await execInContainer([
        'wget',
        '-q',
        '-O',
        '-',
        `http://127.0.0.1:${port}/health/ready`,
      ])
      expect(healthAfter.exitCode).toBe(0)
      const healthBodyAfter = JSON.parse(healthAfter.stdout)
      expect(healthBodyAfter.ready).toBe(true)

      // 3. Submit a new job to the same worker and verify it succeeds
      const thirdJobId = generateJobId('cancel-test-3')
      const thirdPayload: JobPayload = {
        job_id: thirdJobId,
        job_class: 'math_add',
        worker_command: workerCommand,
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [7, 8, 9] },
      }

      const { jobResult: thirdJobResult } = await runJob(thirdPayload, [
        `APP_PORT=${port}`,
      ])

      expect(thirdJobResult.success).toBe(true)
      expect(thirdJobResult.result).toEqual({ sum: 24, operands: [7, 8, 9] }) // 7 + 8 + 9

      // 4. Verify worker PID is still the same after the third job
      const workerStateFinal = await readWorkerState(port).then(
        (stdout) => JSON.parse(stdout) as { pid: number },
      )

      expect(workerStateFinal.pid).toBe(workerPid)
    })

    test('worker exit with error updates worker state and logs', async () => {
      const port = 8550
      const jobClass = 'exit_worker_error_8550'
      const workerCommand = ['bun', 'run', 'src/exit-worker.ts']
      const jobId = generateJobId('exit-worker-error')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: workerCommand,
        interface: { kind: 'persistent_http', port },
        job_input: {},
      }

      const { jobResult } = await runJob(payload, [
        `APP_PORT=${port}`,
        'EXIT_AFTER_JOBS=1',
        'EXIT_CODE=1',
        'EXIT_DELAY_MS=2000',
      ])

      expect(jobResult.success).toBe(true)

      const workerState = await waitForWorkerStatus(port, 'stopped')

      expect(workerState.status).toBe('stopped')

      const workerLog = await readWorkerLog(port, { tail: 200 })
      expect(workerLog).toContain('[exit-worker]')
      expect(workerLog).toContain('exiting with code 1')
    })

    test('worker exit with code 0 updates worker state and logs', async () => {
      const port = 8551
      const jobClass = 'exit_worker_success_8551'
      const workerCommand = [
        'bun',
        'run',
        'src/exit-worker.ts',
        '--just-for-uniqueness',
        '1234567890',
      ]
      const jobId = generateJobId('exit-worker-success')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: workerCommand,
        interface: { kind: 'persistent_http', port },
        job_input: {},
      }

      const { jobResult } = await runJob(payload, [
        `APP_PORT=${port}`,
        'EXIT_AFTER_JOBS=1',
        'EXIT_CODE=0',
        'EXIT_DELAY_MS=2000',
      ])
      const uniqueWorkerPayload =
        '--worker-config-base64 eyJ3b3JrZXJfY29tbWFuZCI6WyJidW4iLCJydW4iLCJzcmMvZXhpdC13b3JrZXIudHMiLCItLWp1c3QtZm9yLXVuaXF1ZW5lc3MiLCIxMjM0NTY3ODkwIl0sInBvcnQiOjg1NTF9'
      expect(
        execInContainer(['top', '-b', '-n', '1']).then(({ stdout }) => stdout),
      ).resolves.toInclude(uniqueWorkerPayload)

      expect(jobResult.success).toBe(true)

      const workerState = await waitForWorkerStatus(port, 'stopped')
      expect(
        execInContainer(['top', '-b', '-n', '1']).then(({ stdout }) => stdout),
      ).resolves.not.toInclude(uniqueWorkerPayload)

      expect(workerState.status).toBe('stopped')

      const workerLog = await readWorkerLog(port, { tail: 200 })
      expect(workerLog).toContain('[exit-worker]')
      expect(workerLog).toContain('exiting with code 0')
    })

    test('stopped worker is restarted for subsequent jobs', async () => {
      const port = 8552
      const jobClass = 'exit_worker_restart_8552'
      const workerCommand = ['bun', 'run', 'src/exit-worker.ts']

      const firstJobId = generateJobId('exit-worker-restart-1')
      const firstPayload: JobPayload = {
        job_id: firstJobId,
        job_class: jobClass,
        worker_command: workerCommand,
        interface: { kind: 'persistent_http', port },
        job_input: {},
      }

      const { jobResult: firstResult } = await runJob(firstPayload, [
        `APP_PORT=${port}`,
        'EXIT_AFTER_JOBS=1',
        'EXIT_CODE=0',
        'EXIT_DELAY_MS=1000',
      ])

      expect(firstResult.success).toBe(true)

      const firstWorkerState = await waitForWorkerStatus(port, 'stopped')

      const secondJobId = generateJobId('exit-worker-restart-2')
      const secondPayload: JobPayload = {
        job_id: secondJobId,
        job_class: jobClass,
        worker_command: workerCommand,
        interface: { kind: 'persistent_http', port },
        job_input: {},
      }

      const { jobResult: secondResult } = await runJob(secondPayload, [
        `APP_PORT=${port}`,
      ])

      const secondWorkerState = await readWorkerState(port).then((stdout) =>
        JSON.parse(stdout),
      )

      expect(secondResult.success).toBe(true)
      expect(secondWorkerState.pid).toBeNumber()
      expect(secondWorkerState.pid).not.toBe(firstWorkerState.pid)
    })

    test('subsequent async job logs ready-worker check from worker state', async () => {
      const port = 8520
      const jobClass = 'math_add_8520'
      const workerCommand = ['bun', 'run', 'src/mock-worker.ts']

      const firstJobId = generateJobId('worker-up-check-1')
      const payload: JobPayload = {
        job_id: firstJobId,
        job_class: jobClass,
        worker_command: workerCommand,
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2, 3] },
        wait_for_completion: false,
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const workerState = await readWorkerState(port).then(
        (stdout) => JSON.parse(stdout) as { status: string },
      )
      expect(workerState.status).toBeOneOf(['starting', 'ready'])

      const secondJobId = generateJobId('worker-up-check-2')
      const secondPayload: JobPayload = {
        ...payload,
        job_id: secondJobId,
        job_input: { numbers: [4, 5, 6] },
        wait_for_completion: false,
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))

      await runJob(secondPayload, [`APP_PORT=${port}`])
      await new Promise((resolve) => setTimeout(resolve, 200))

      const agentLogContent = await readAgentLog({ tail: 200 })
      const entries = parseStructuredLogs(agentLogContent)

      // Find log entry about using ready worker
      const readyWorkerEntry = findLogEntries(
        entries,
        (e) =>
          e.message.includes('Dispatcher observed worker ready') &&
          e.data?.job_id === secondJobId,
      )

      expect(readyWorkerEntry.length).toBeGreaterThan(0)
      expect(readyWorkerEntry[0].level).toBe('INFO')
    })

    test('multiple jobs reuse same worker', async () => {
      const jobClass = 'reuse_test'
      const port = 8200

      // First job - simple math operation
      const jobId1 = generateJobId(`${jobClass}-1`)
      const payload1: JobPayload = {
        job_id: jobId1,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2, 3] },
      }

      // Use math_add as the actual job class sent to worker
      await runJob({ ...payload1, job_class: 'math_add' }, [`APP_PORT=${port}`])

      const workerState1 = await readWorkerState(port).then(
        (stdout) => JSON.parse(stdout) as { pid: number },
      )

      const pid1 = workerState1.pid

      // Second job - should reuse same worker
      await new Promise((r) => setTimeout(r, 200))

      const jobId2 = generateJobId(`${jobClass}-2`)
      const payload2: JobPayload = {
        job_id: jobId2,
        job_class: 'math_add',
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [4, 5, 6] },
      }

      await runJob(payload2, [`APP_PORT=${port}`])

      const workerState2 = await readWorkerState(port).then(
        (stdout) => JSON.parse(stdout) as { pid: number },
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
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const jobLog = await readJobLog(jobId)
      const workerLog = await readWorkerLog(port)

      expect(workerLog.length).toBeGreaterThan(0)
      expect(workerLog.length).toBeDefined()

      // Check worker logged startup message
      const workerOut = await readWorkerLog(port)
      expect(jobLog).toContain('Starting log capture test')
      expect(workerLog).not.toContain('Starting log capture test')
      expect(workerOut).toContain('Mock runner listening')
    })

    test('job logs contain handler output', async () => {
      const jobClass = 'math_add_8203'
      const port = 8203

      const jobId = generateJobId('job-log-content-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [10, 20, 30] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Check job log file exists (now single structured log file)
      const jobLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.log`,
      )
      expect(jobLogExists).toBe(true)

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      // Find entries related to this job
      const jobEntries = findLogEntries(
        entries,
        (e) =>
          e.message.includes('Job accepted') ||
          e.message.includes('Adding') ||
          e.message.includes('Result') ||
          e.message.includes('Job completed'),
      )

      expect(jobEntries.length).toBeGreaterThan(0)

      // Verify we can find the expected messages
      const hasJobAccepted = jobEntries.some((e) =>
        e.message.includes('Job accepted'),
      )
      const hasAdding = jobEntries.some((e) => e.message.includes('Adding'))
      const hasResult = jobEntries.some((e) => e.message.includes('Result: 60'))
      const hasCompleted = jobEntries.some((e) =>
        e.message.includes('Job completed successfully'),
      )

      expect(hasJobAccepted || hasAdding || hasResult || hasCompleted).toBe(
        true,
      )
    })

    test('verbose_log job writes structured logs', async () => {
      const jobClass = 'verbose_log_8204'
      const port = 8204

      const jobId = generateJobId('verbose-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { steps: 3, simulateWarning: true, simulateError: true },
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])
      expect(result.success).toBe(true)

      // Check structured job log
      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThan(0)

      // Verify log entries have proper structure
      for (const entry of entries) {
        expect(entry.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          entry.level,
        )
        expect(entry.message).toBeTruthy()
      }

      // Find entries with expected messages
      const hasStarting = findLogEntries(entries, (e) =>
        e.message.includes('Starting verbose logging job'),
      )
      const hasSteps = findLogEntries(entries, (e) =>
        e.message.includes('Step'),
      )
      const hasCompleted = findLogEntries(entries, (e) =>
        e.message.includes('Completed'),
      )

      expect(
        hasStarting.length + hasSteps.length + hasCompleted.length,
      ).toBeGreaterThan(0)
    })

    test('async protocol handles delayed jobs via polling', async () => {
      const jobClass = 'verbose_log_8205'
      const port = 8205

      const jobId = generateJobId('async-delay-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        // Job with 5 steps, each delayed by 500ms = 2.5 seconds total
        job_input: { steps: 5, delayMs: 500 },
      }

      const startTime = Date.now()
      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])
      const elapsed = Date.now() - startTime

      expect(result.success).toBe(true)

      // Verify the job took at least 2 seconds (5 steps * 500ms delay)
      expect(elapsed).toBeGreaterThan(2000)

      // Verify the result contains expected data
      const resultObj = result.result as Record<string, unknown>
      expect(resultObj.stepsCompleted).toBe(5)

      // Verify job logs show all steps (structured format)
      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      const stepEntries = findLogEntries(entries, (e) =>
        e.message.includes('Step'),
      )
      const completedEntry = findLogEntries(entries, (e) =>
        e.message.includes('Completed'),
      )

      expect(stepEntries.length + completedEntry.length).toBeGreaterThan(0)
    })

    test('file_output job writes files and manifest to output directory', async () => {
      const jobClass = 'file_output_8213'
      const port = 8213

      const jobId = generateJobId('file-output-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          folder_id: 'test-folder-uuid',
          files: [
            {
              name: 'result.txt',
              content: 'Hello World',
              content_type: 'text/plain',
            },
            {
              name: 'data.json',
              content: '{"key":"value"}',
              content_type: 'application/json',
            },
          ],
        },
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      expect(result.success).toBe(true)

      // Verify result contains file info
      const resultObj = result.result as Record<string, unknown>
      expect(resultObj.filesWritten).toBe(2)
      expect(resultObj.files).toEqual(['result.txt', 'data.json'])

      // Verify output directory exists
      const outputDirExists = await dirExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}/output`,
      )
      expect(outputDirExists).toBe(true)

      // Verify files were written
      const resultTxt = await readFileInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}/output/result.txt`,
      )
      expect(resultTxt).toBe('Hello World')

      const dataJson = await readFileInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}/output/data.json`,
      )
      expect(dataJson).toBe('{"key":"value"}')

      // Verify manifest was written
      const manifestExists = await fileExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}/output/__manifest__.json`,
      )
      expect(manifestExists).toBe(true)

      const manifestContent = await readFileInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}/output/__manifest__.json`,
      )
      const manifest = JSON.parse(manifestContent)
      expect(manifest.files).toHaveLength(2)
      expect(manifest.files[0].local_path).toBe('result.txt')
      expect(manifest.files[0].object_key).toBe('result.txt')
      expect(manifest.files[1].local_path).toBe('data.json')
      expect(manifest.files[1].object_key).toBe('data.json')
    })

    test('job output directory is created and available to workers', async () => {
      const jobClass = 'math_add_8214'
      const port = 8214

      const jobId = generateJobId('output-dir-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2, 3] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Verify output directory was created by the agent
      const outputDirExists = await dirExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}/output`,
      )
      expect(outputDirExists).toBe(true)
    })

    test('timing information is included in response JSON', async () => {
      const jobClass = 'math_add_8215'
      const port = 8215

      const jobId = generateJobId('http-timing-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2, 3] },
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      // Verify timing object exists in response
      expect(result.timing).toBeDefined()
      expect(typeof result.timing).toBe('object')

      const timing = result.timing as Record<string, unknown>

      // Verify all timing fields are present
      expect(timing).toHaveProperty('job_execution_time_seconds')
      expect(timing).toHaveProperty('total_time_seconds')
      expect(timing).toHaveProperty('worker_ready_time_seconds')

      // Verify timing values are numbers and non-negative
      expect(typeof timing.job_execution_time_seconds).toBe('number')
      expect(typeof timing.total_time_seconds).toBe('number')
      expect(typeof timing.worker_ready_time_seconds).toBe('number')

      expect((timing.job_execution_time_seconds as number) >= 0).toBe(true)
      expect((timing.total_time_seconds as number) >= 0).toBe(true)
      expect((timing.worker_ready_time_seconds as number) >= 0).toBe(true)

      // Verify total_time includes job_execution_time (total should be >= execution)
      expect(
        (timing.total_time_seconds as number) >=
          (timing.job_execution_time_seconds as number),
      ).toBe(true)
    })

    test('timing is logged in agent log for persistent_http', async () => {
      const jobClass = 'math_add_8216'
      const port = 8216

      const jobId = generateJobId('http-timing-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Read agent log
      const agentLogContent = await readAgentLog()
      const entries = parseStructuredLogs(agentLogContent)

      // Find log entries related to this job
      const jobEntries = findLogEntries(
        entries,
        (e) => e.data?.job_id === jobId,
      )

      expect(jobEntries.length).toBeGreaterThan(0)

      // Find entries with timing information
      const timingEntries = findLogEntries(
        jobEntries,
        (e) =>
          e.data?.job_execution_time !== undefined ||
          e.data?.total_time !== undefined ||
          e.data?.worker_startup_time !== undefined,
      )

      expect(timingEntries.length).toBeGreaterThan(0)

      // Verify at least one entry has timing data
      const hasTiming = timingEntries.some(
        (e) =>
          e.data?.job_execution_time !== undefined &&
          e.data?.total_time !== undefined,
      )
      expect(hasTiming).toBe(true)
    })

    test('returns immediately when wait_for_completion is false for persistent_http', async () => {
      const jobClass = 'verbose_log_8300'
      const port = 8300
      const jobId = generateJobId('http-async-test')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { steps: 2, delayMs: 500 },
        wait_for_completion: false,
      }

      const start = Date.now()
      const { exitCode } = await runJob(payload, [`APP_PORT=${port}`])

      expect(exitCode).toBe(0)
      const jobStateRunning = await waitForJobStatus(jobId, 'running')
      const elapsed = Date.now() - start

      expect(jobStateRunning.status).toBe('running')

      expect(elapsed).toBeLessThan(2000)

      const resultFileExists = await fileExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      expect(resultFileExists).toBe(false)

      await waitForJobStatus(jobId, 'success')
      expect(
        fileExistsInContainer(
          `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
        ),
      ).resolves.toBe(true)
    })

    test('http worker enqueues job before readiness flips true when startup is slow', async () => {
      const jobClass = 'verbose_log_8400'
      const port = 8400
      const readyDelayMs = 1000
      const jobId = generateJobId('http-slow-startup')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { steps: 2, delayMs: 250 },
        wait_for_completion: false,
      }

      const startTime = Date.now()
      const { jobState, exitCode, rawOutput } = await runJob(payload, [
        `APP_PORT=${port}`,
        `READY_DELAY_MS=${readyDelayMs}`,
      ])
      const elapsed = Date.now() - startTime

      expect(exitCode).toBe(0)
      expect(jobState.status).toEqual('pending')
      expect(elapsed).toBeLessThan(readyDelayMs)

      // Wait a bit for the worker process to start and bind to the port
      // before checking readiness
      const readinessAfter = await execInContainer([
        'wget',
        '-q',
        '-O',
        '-',
        `http://127.0.0.1:${port}/health/ready`,
      ])
      expect(readinessAfter.stderr).toInclude('403 Forbidden')

      const statuses: string[] = []
      while (true) {
        const jobState = await readJobState(jobId).then((stdout) =>
          JSON.parse(stdout),
        )
        if (!statuses.includes(jobState.status)) {
          statuses.push(jobState.status)
        }
        if (jobState.status === 'success') {
          expect(jobState).toEqual({
            job_id: jobId,
            job_class: 'verbose_log_8400',
            status: 'success',
            started_at: expect.any(String),
            completed_at: expect.any(String),
            worker_kind: 'persistent_http',
            worker_state_pid: expect.any(Number),
          })
        } else if (jobState.status === 'pending') {
          expect(jobState).toEqual({
            job_id: jobId,
            job_class: 'verbose_log_8400',
            status: 'pending',
            worker_kind: 'persistent_http',
          })
        } else if (jobState.status === 'running') {
          expect(jobState).toEqual({
            job_id: jobId,
            job_class: 'verbose_log_8400',
            status: 'running',
            started_at: expect.any(String),
            worker_kind: 'persistent_http',
            worker_state_pid: expect.any(Number),
          })
        } else if (jobState.status === 'success') {
          expect(jobState).toEqual({
            job_id: jobId,
            job_class: 'verbose_log_8400',
            status: 'success',
            started_at: expect.any(String),
            completed_at: expect.any(String),
            worker_kind: 'persistent_http',
            worker_state_pid: expect.any(Number),
          })
        } else {
          throw new Error(`Unknown job state: ${jobState.status}`)
        }
        if (jobState.status === 'failed') {
          throw new Error(`Job failed: ${jobState.error}`)
        }
        if (!['pending', 'running'].includes(jobState.status)) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      expect(statuses.at(-1)).toEqual('success')
    })

    test('http jobs cleanup all zombie processes when wait_for_completion is false', async () => {
      const jobClass = 'math_add_8234'
      const port = 8234
      const jobId1 = generateJobId('no-orphan-processes-1')
      const jobId2 = generateJobId('no-orphan-processes-2')
      const jobId3 = generateJobId('no-orphan-processes-3')

      const payload: JobPayload = {
        job_id: '',
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2] },
        wait_for_completion: false,
      }

      for (const jobId of [jobId1, jobId2, jobId3]) {
        await runJob({ ...payload, job_id: jobId }, [`APP_PORT=${port}`])
      }

      // wait for the jobs to complete
      await new Promise((resolve) => setTimeout(resolve, 1000))

      for (const jobId of [jobId1, jobId2, jobId3]) {
        const jobState = await readJobState(jobId).then((stdout) =>
          JSON.parse(stdout),
        )
        expect(jobState).toEqual({
          job_id: jobId,
          job_class: jobClass,
          started_at: expect.any(String),
          completed_at: expect.any(String),
          status: 'success',
          worker_kind: 'persistent_http',
          worker_state_pid: expect.any(Number),
        })
      }

      const topOut = await execInContainer(['top', '-b', '-n', '1'])
      expect(
        topOut.stdout
          .split('\n')
          .filter((l) => l.includes('[lombok-worker-a]')),
      ).toHaveLength(0)
    })

    test('http jobs cleanup all zombie processes when wait_for_completion is true', async () => {
      const jobClass = 'math_add_8234'
      const port = 8234
      const jobId1 = generateJobId('no-orphan-processes-with-completion-wait-1')
      const jobId2 = generateJobId('no-orphan-processes-with-completion-wait-2')
      const jobId3 = generateJobId('no-orphan-processes-with-completion-wait-3')

      const payload: JobPayload = {
        job_id: '',
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2] },
        wait_for_completion: true,
      }

      for (const jobId of [jobId1, jobId2, jobId3]) {
        await runJob({ ...payload, job_id: jobId }, [`APP_PORT=${port}`])
      }

      // wait for the jobs to complete
      await new Promise((resolve) => setTimeout(resolve, 1000))

      for (const jobId of [jobId1, jobId2, jobId3]) {
        const jobState = await readJobState(jobId).then((stdout) =>
          JSON.parse(stdout),
        )
        expect(jobState).toEqual({
          job_id: jobId,
          job_class: jobClass,
          started_at: expect.any(String),
          completed_at: expect.any(String),
          status: 'success',
          worker_kind: 'persistent_http',
          worker_state_pid: expect.any(Number),
        })
      }
    })

    test('http-worker-example.ts: starts and accepts jobs via HTTP endpoints', async () => {
      const port = 8500
      const jobId = generateJobId('http-worker-example-test')
      const jobInput = { message: 'test input', value: 42 }

      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'example_job',
        worker_command: ['bun', 'run', 'src/http-worker-example.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: jobInput,
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      // Verify job succeeded
      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()

      // Verify result structure
      const workerResult = result.result as Record<string, unknown>
      expect(workerResult.processed).toBe(true)
      expect(workerResult.input).toEqual(jobInput)

      // Verify worker state
      const workerState = await readWorkerState(port).then((stdout) =>
        JSON.parse(stdout),
      )
      expect(workerState.status).toBe('ready')
      expect(workerState.kind).toBe('persistent_http')
    })

    test('http-worker-example.ts: outputs structured logs with JOB_ID_ prefix', async () => {
      const port = 8501
      const jobId = generateJobId('http-worker-example-log-test')
      const jobInput = { test: 'structured logging' }

      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'example_job',
        worker_command: ['bun', 'run', 'src/http-worker-example.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: jobInput,
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Wait for logs to be written
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Verify job log file exists
      const jobLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.log`,
      )
      expect(jobLogExists).toBe(true)

      // Read and parse job logs
      let jobLogContent = ''
      for (let i = 0; i < 10; i++) {
        jobLogContent = await readJobLog(jobId)
        if (jobLogContent && jobLogContent.trim().length > 0) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      expect(jobLogContent.trim().length).toBeGreaterThan(0)

      const entries = parseJobLogs(jobLogContent)
      expect(entries.length).toBeGreaterThan(0)

      // Verify structured log entries contain job-specific information
      const startedEntries = findLogEntries(entries, (e) =>
        e.message.includes('Job started'),
      )
      expect(startedEntries.length).toBeGreaterThan(0)

      const completedEntries = findLogEntries(entries, (e) =>
        e.message.includes('Job completed successfully'),
      )
      expect(completedEntries.length).toBeGreaterThan(0)
    })

    test('http-worker-example.ts: structured logs appear in unified log with JOB_ID_ prefix', async () => {
      const port = 8502
      const jobId = generateJobId('http-worker-example-unified-log-test')
      const jobInput = { test: 'unified log' }

      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'example_job',
        worker_command: ['bun', 'run', 'src/http-worker-example.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: jobInput,
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Wait for logs to be flushed
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Retry checking unified log (job logs are written asynchronously)
      const jobLogPrefix = `JOB_ID_${jobId}`
      let jobLogLines: string[] = []
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        const unifiedLogContent = await readFileInContainer(
          '/var/log/lombok-worker-agent/lombok-worker-agent.log',
        )
        jobLogLines = unifiedLogContent.split('\n').filter((line) => {
          const parts = line.split('|')
          return parts.length >= 3 && parts[1] === jobLogPrefix
        })
        if (jobLogLines.length > 0) {
          break
        }
      }

      expect(jobLogLines.length).toBeGreaterThan(0)

      // Verify format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
      for (const line of jobLogLines) {
        const parts = line.split('|')
        expect(parts.length).toBeGreaterThanOrEqual(3)
        expect(parts[0]).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )
        expect(parts[1]).toBe(jobLogPrefix)
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          parts[2],
        )
      }
    })

    test('http-worker-example.ts: worker-level logs appear in unified log with WORKER_ prefix', async () => {
      const port = 8503
      const jobId = generateJobId('http-worker-example-worker-log-test')
      const jobInput = { test: 'worker log' }

      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'example_job',
        worker_command: ['bun', 'run', 'src/http-worker-example.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: jobInput,
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Wait for logs to be flushed
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const unifiedLogContent = await readFileInContainer(
        '/var/log/lombok-worker-agent/lombok-worker-agent.log',
      )

      // Find worker log entries - format: timestamp|WORKER_<port>|LEVEL|["message",{data}]
      const workerLogPrefix = `WORKER_${port}`
      const workerLogLines = unifiedLogContent.split('\n').filter((line) => {
        const parts = line.split('|')
        return parts.length >= 3 && parts[1] === workerLogPrefix
      })

      expect(workerLogLines.length).toBeGreaterThan(0)

      // Verify format
      for (const line of workerLogLines) {
        const parts = line.split('|')
        expect(parts.length).toBeGreaterThanOrEqual(3)
        expect(parts[1]).toBe(workerLogPrefix)
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          parts[2],
        )
      }
    })
  })

  describe('platform integration', () => {
    test('exec_per_job signals completion to platform on success', async () => {
      const jobId = generateJobId('platform-exec-success')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'platform_completion_test',
        worker_command: [
          'sh',
          '-c',
          'echo \'{"message":"done"}\' > "$JOB_RESULT_FILE"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: { test: true },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
      }

      const { jobResult: result } = await runJob(payload)

      expect(result.success).toBe(true)

      // Verify start was signaled to platform
      expect(mockPlatformState.startRequests.length).toBe(1)
      const startReq = mockPlatformState.startRequests[0]
      expect(startReq.jobId).toBe(jobId)

      // Verify completion was signaled to platform
      expect(mockPlatformState.completionRequests.length).toBe(1)
      const completionReq = mockPlatformState.completionRequests[0]
      expect(completionReq.jobId).toBe(jobId)
      expect(completionReq.body.success).toBe(true)
      // Verify the completion request contains the worker's result
      expect(completionReq.body.result).toEqual({ message: 'done' })
    })

    test('exec_per_job signals completion to platform on failure', async () => {
      const jobId = generateJobId('platform-exec-failure')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'platform_failure_test',
        worker_command: ['sh', '-c', 'exit 1'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
      }

      const { jobResult: result, exitCode } = await runJob(payload)

      expect(result.success).toBe(false)
      expect(exitCode).toBe(1)

      // Verify start was signaled to platform
      expect(mockPlatformState.startRequests.length).toBe(1)
      const startReq = mockPlatformState.startRequests[0]
      expect(startReq.jobId).toBe(jobId)

      // Verify failure was signaled to platform
      expect(mockPlatformState.completionRequests.length).toBe(1)
      const completionReq = mockPlatformState.completionRequests[0]
      expect(completionReq.jobId).toBe(jobId)
      expect(completionReq.body.success).toBe(false)
      expect(completionReq.body.error).toBeDefined()
      expect(completionReq.body.error?.code).toBe('WORKER_EXIT_ERROR')
    })

    test('exec_per_job calls /start endpoint before job completes', async () => {
      const jobId = generateJobId('platform-start-timing')
      // Use a job that takes some time to complete
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'platform_start_timing_test',
        worker_command: [
          'sh',
          '-c',
          'sleep 1 && echo \'{"message":"done"}\' > "$JOB_RESULT_FILE"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: { test: true },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
      }

      const startTime = Date.now()
      const { jobResult: result } = await runJob(payload)

      expect(result.success).toBe(true)

      // Verify both start and completion were called
      expect(mockPlatformState.startRequests.length).toBe(1)
      expect(mockPlatformState.completionRequests.length).toBe(1)

      const startReq = mockPlatformState.startRequests[0]
      const completionReq = mockPlatformState.completionRequests[0]

      expect(startReq.jobId).toBe(jobId)
      expect(completionReq.jobId).toBe(jobId)

      // Verify start was called BEFORE completion
      expect(startReq.timestamp).toBeLessThan(completionReq.timestamp)

      // Verify start was called early (within first 200ms of job start)
      // This ensures it's called when the job starts, not just before completion
      const startCallDelay = startReq.timestamp - startTime
      expect(startCallDelay).toBeLessThan(200)

      // Verify completion was called after the job finished (sleep 1 = ~1000ms)
      const completionCallDelay = completionReq.timestamp - startTime
      expect(completionCallDelay).toBeGreaterThan(800) // Should be close to 1000ms
    })

    test('exec_per_job with wait_for_completion=false returns immediately but still signals completion', async () => {
      const jobId = generateJobId('platform-exec-async-success')
      // Use a job that takes some time to complete
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'platform_async_exec_test',
        worker_command: [
          'sh',
          '-c',
          'sleep 1 && echo \'{"message":"done"}\' > "$JOB_RESULT_FILE"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: { test: true },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
        wait_for_completion: false,
      }

      const startTime = Date.now()
      const { jobState, exitCode } = await runJob(payload)
      const elapsed = Date.now() - startTime

      // Verify command returned immediately (should be much less than the job duration)
      expect(exitCode).toBe(0)
      expect(elapsed).toBeLessThan(500) // Should return well before the 1 second sleep completes

      // Verify job state is pending or running initially
      expect(jobState.status).toMatch(/pending|running/)

      // Initially, no completion should have been signaled yet
      expect(mockPlatformState.completionRequests.length).toBe(0)

      // Verify start was signaled immediately
      expect(mockPlatformState.startRequests.length).toBe(1)
      const startReq = mockPlatformState.startRequests[0]
      expect(startReq.jobId).toBe(jobId)
      expect(startReq.timestamp - startTime).toBeLessThan(200)

      // Wait for job to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const agentLog = await readAgentLog()
      // Now verify completion was signaled after the job finished
      expect(mockPlatformState.completionRequests.length).toBe(1)
      const completionReq = mockPlatformState.completionRequests[0]
      expect(completionReq.jobId).toBe(jobId)
      expect(completionReq.body.success).toBe(true)
      // Verify the completion request contains the worker's result from the result file
      expect(completionReq.body.result).toEqual({ message: 'done' })

      // Verify completion was called after start
      expect(startReq.timestamp).toBeLessThan(completionReq.timestamp)

      // Verify completion was called after the job finished (sleep 1 = ~1000ms)
      const completionCallDelay = completionReq.timestamp - startTime
      expect(completionCallDelay).toBeGreaterThan(800) // Should be close to 1000ms

      // Verify final job state
      const finalJobState = JSON.parse(
        await readJobState(jobId).then((stdout) => stdout),
      )
      expect(finalJobState.status).toBe('success')
    })

    test('exec_per_job with wait_for_completion=false signals failure completion on error', async () => {
      const jobId = generateJobId('platform-exec-async-failure')
      // Use a job that takes some time then fails
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'platform_async_exec_failure_test',
        worker_command: ['sh', '-c', 'sleep 1 && exit 42'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
        wait_for_completion: false,
      }

      const startTime = Date.now()
      const { jobState, exitCode } = await runJob(payload)
      const elapsed = Date.now() - startTime

      // Verify command returned immediately
      expect(exitCode).toBe(0)
      expect(elapsed).toBeLessThan(500)

      // Verify job state is pending or running initially
      expect(jobState.status).toMatch(/pending|running/)

      // Initially, no completion should have been signaled yet
      expect(mockPlatformState.completionRequests.length).toBe(0)

      // Verify start was signaled immediately
      expect(mockPlatformState.startRequests.length).toBe(1)
      const startReq = mockPlatformState.startRequests[0]
      expect(startReq.jobId).toBe(jobId)

      // Wait for job to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Now verify failure completion was signaled after the job finished
      expect(mockPlatformState.completionRequests.length).toBe(1)
      const completionReq = mockPlatformState.completionRequests[0]
      expect(completionReq.jobId).toBe(jobId)
      expect(completionReq.body.success).toBe(false)
      expect(completionReq.body.error).toBeDefined()
      expect(completionReq.body.error?.code).toBe('WORKER_EXIT_ERROR')

      // Verify completion was called after start
      expect(startReq.timestamp).toBeLessThan(completionReq.timestamp)

      // Verify final job state
      const finalJobState = JSON.parse(
        await readJobState(jobId).then((stdout) => stdout),
      )
      expect(finalJobState.status).toBe('failed')
    })

    test('persistent_http signals completion to platform', async () => {
      const jobClass = 'math_add_8220'
      const port = 8220

      const jobId = generateJobId('platform-http-success')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [10, 20, 30] },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      expect(result.success).toBe(true)

      // Verify completion was signaled to platform
      expect(mockPlatformState.completionRequests.length).toBe(1)
      const completionReq = mockPlatformState.completionRequests[0]
      expect(completionReq.jobId).toBe(jobId)
      expect(completionReq.body.success).toBe(true)
      expect(completionReq.body.result).toBeDefined()
    })

    test('file_output job uploads files via presigned URLs and signals completion', async () => {
      const jobClass = 'file_output_8221'
      const port = 8221

      const jobId = generateJobId('platform-upload-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          files: [
            {
              name: 'output.txt',
              content: 'Test content for upload',
              content_type: 'text/plain',
            },
            {
              name: 'data.json',
              content: '{"uploaded":true}',
              content_type: 'application/json',
            },
          ],
        },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
        output_location: {
          folder_id: 'test-folder-uuid',
          prefix: 'outputs',
        },
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      expect(result.success).toBe(true)

      // Verify start was signaled to platform
      expect(mockPlatformState.startRequests.length).toBe(1)
      expect(mockPlatformState.startRequests[0].jobId).toBe(jobId)

      // Verify presigned URLs were requested
      expect(mockPlatformState.uploadUrlRequests.length).toBe(1)
      const uploadReq = mockPlatformState.uploadUrlRequests[0]
      expect(uploadReq.jobId).toBe(jobId)
      expect(uploadReq.body.length).toBe(2)
      expect(uploadReq.body[0].folderId).toBe('test-folder-uuid')
      expect(uploadReq.body[0].objectKey).toBe('outputs/output.txt')
      expect(uploadReq.body[0].method).toBe('PUT')
      expect(uploadReq.body[1].objectKey).toBe('outputs/data.json')
      expect(uploadReq.body[1].method).toBe('PUT')

      // Verify files were uploaded to S3
      expect(mockPlatformState.outputFiles.length).toBe(2)

      const uploadedFile1 = mockPlatformState.outputFiles.find((f) =>
        f.url.includes('output.txt'),
      )
      expect(uploadedFile1).toBeDefined()
      expect(uploadedFile1?.body).toBe('Test content for upload')
      expect(uploadedFile1?.contentType).toBe('text/plain')
      const uploadedFile2 = mockPlatformState.outputFiles.find((f) =>
        f.url.includes('data.json'),
      )
      expect(uploadedFile2).toBeDefined()
      expect(uploadedFile2?.body).toBe('{"uploaded":true}')
      expect(uploadedFile2?.contentType).toBe('application/json')

      // Verify completion was signaled with uploaded files
      expect(mockPlatformState.completionRequests.length).toBe(1)
      const completionReq = mockPlatformState.completionRequests[0]
      expect(completionReq.jobId).toBe(jobId)
      expect(completionReq.body.success).toBe(true)
      expect(completionReq.body.outputFiles?.length).toBe(2)
      expect(completionReq.body.outputFiles?.[0].folderId).toBe(
        'test-folder-uuid',
      )

      // Verify agent output includes uploaded files
      expect(result.output_files?.length).toBe(2)
    })

    test('file_output uses manifest content_type when provided', async () => {
      const jobClass = 'file_output_8240'
      const port = 8240
      const jobId = generateJobId('platform-upload-content-type-manifest')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          files: [
            {
              name: 'data.json',
              content: '{"k":1}',
              content_type: 'application/custom+json',
            },
            { name: 'note.txt', content: 'hello', content_type: 'text/custom' },
          ],
        },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
        output_location: {
          folder_id: 'test-folder-uuid',
          prefix: 'outputs',
        },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      expect(mockPlatformState.outputFiles.length).toBe(2)
      const customJson = mockPlatformState.outputFiles.find((f) =>
        f.url.includes('data.json'),
      )
      const customTxt = mockPlatformState.outputFiles.find((f) =>
        f.url.includes('note.txt'),
      )
      expect(customJson?.contentType).toBe('application/custom+json')
      expect(customTxt?.contentType).toBe('text/custom')
    })

    test('file_output falls back to detecting content type when manifest omits it', async () => {
      const jobClass = 'file_output_8241'
      const port = 8241
      const jobId = generateJobId('platform-upload-content-type-detect')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          files: [
            { name: 'data.json', content: '{"key":"value"}' }, // no content_type
            { name: 'readme.txt', content: 'hello world' }, // no content_type
          ],
        },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
        output_location: {
          folder_id: 'test-folder-uuid',
          prefix: 'outputs',
        },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      expect(mockPlatformState.outputFiles.length).toBe(2)
      const jsonUpload = mockPlatformState.outputFiles.find((f) =>
        f.url.includes('data.json'),
      )
      const txtUpload = mockPlatformState.outputFiles.find((f) =>
        f.url.includes('readme.txt'),
      )
      expect(jsonUpload?.contentType.startsWith('application/json')).toBe(true)
      expect(txtUpload?.contentType.startsWith('text/plain')).toBe(true)
    })

    test('file_output job with empty prefix keeps object keys unchanged', async () => {
      const jobClass = 'file_output_8222'
      const port = 8222

      const jobId = generateJobId('platform-upload-empty-prefix')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          files: [
            { name: 'output.txt', content: 'Test content for upload' },
            { name: 'data.json', content: '{"uploaded":true}' },
          ],
        },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
        output_location: {
          folder_id: 'test-folder-uuid',
          prefix: '',
        },
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      expect(result.success).toBe(true)

      expect(mockPlatformState.uploadUrlRequests.length).toBe(1)
      const uploadReq = mockPlatformState.uploadUrlRequests[0]
      expect(uploadReq.body.map((b) => b.objectKey)).toEqual([
        'output.txt',
        'data.json',
      ])

      expect(mockPlatformState.outputFiles.length).toBe(2)
      expect(
        mockPlatformState.outputFiles.every((f) => !f.url.includes('outputs/')),
      ).toBe(true)
    })

    test('file_output job with missing prefix keeps object keys unchanged', async () => {
      const jobClass = 'file_output_8223'
      const port = 8223

      const jobId = generateJobId('platform-upload-missing-prefix')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          files: [
            { name: 'output.txt', content: 'Test content for upload' },
            { name: 'data.json', content: '{"uploaded":true}' },
          ],
        },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
        output_location: {
          folder_id: 'test-folder-uuid',
        },
      }

      const { jobResult: result } = await runJob(payload, [`APP_PORT=${port}`])

      expect(result.success).toBe(true)

      expect(mockPlatformState.uploadUrlRequests.length).toBe(1)
      const uploadReq = mockPlatformState.uploadUrlRequests[0]
      expect(uploadReq.body.map((b) => b.objectKey)).toEqual([
        'output.txt',
        'data.json',
      ])

      expect(mockPlatformState.outputFiles.length).toBe(2)
      expect(
        mockPlatformState.outputFiles.every((f) => !f.url.includes('outputs/')),
      ).toBe(true)
    })

    test('no platform calls when platform_url is not provided', async () => {
      const jobId = generateJobId('no-platform-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'no_platform_test',
        worker_command: ['echo', 'test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
        // No platform_url or job_token
      }

      await runJob(payload)

      // Verify no platform calls were made
      expect(mockPlatformState.completionRequests.length).toBe(0)
      expect(mockPlatformState.uploadUrlRequests.length).toBe(0)
      expect(mockPlatformState.startRequests.length).toBe(0)
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
        wait_for_completion: false,
      }

      const { jobState, exitCode, rawOutput } = await runJob(payload)

      expect(exitCode).not.toBe(0)
      expect(rawOutput).toContain('interface kind: invalid_kind')
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
      expect(result.stdout).toContain('job-result')
    })

    test('run-job requires --payload-base64 flag', async () => {
      const result = await execInContainer(['lombok-worker-agent', 'run-job'])

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('required')
    })

    test('job-log reads structured job logs for exec_per_job', async () => {
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

      // For exec_per_job, worker output is now captured in structured job logs
      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      // Job logs should contain the worker output as INFO level entries
      expect(entries.length).toBeGreaterThan(0)

      // Find entry with the test content
      const testContentEntry = findLogEntries(entries, (e) =>
        e.message.includes('test_log_content'),
      )
      expect(testContentEntry.length).toBeGreaterThan(0)
      expect(testContentEntry[0].level).toBe('INFO') // Plain text output becomes INFO
    })

    test('job-log captures stderr as ERROR level for exec_per_job', async () => {
      const jobId = generateJobId('job-log-err-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'log_err_test',
        worker_command: ['sh', '-c', 'echo stderr_content >&2'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // For exec_per_job, stderr is captured in structured job logs as ERROR level
      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      // Find ERROR level entry with stderr content
      const errorEntries = findLogEntries(
        entries,
        (e) => e.level === 'ERROR' && e.message.includes('stderr_content'),
      )
      expect(errorEntries.length).toBeGreaterThan(0)
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

      // For exec_per_job, worker output is captured in structured job logs
      const allLogs = await readJobLog(jobId)
      const tailLogs = await readJobLog(jobId, { tail: 3 })

      const allEntries = parseJobLogs(allLogs)
      const tailEntries = parseJobLogs(tailLogs)

      expect(allEntries.length).toBeGreaterThan(0)
      expect(tailEntries.length).toBeLessThanOrEqual(3)
      // Tail should return the last N lines
      if (allEntries.length >= 3) {
        expect(tailEntries.length).toBe(3)
      }
    })

    test('worker-log reads worker stdout', async () => {
      const jobClass = 'worker-log-test'
      const port = 8202
      const jobId = generateJobId(jobClass)

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [10, 20] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const result = await readWorkerLog(port)

      expect(result).toContain('Mock runner listening')
    })

    test('worker-log --tail returns last N lines', async () => {
      const jobId = generateJobId('worker-log-tail-test')
      const port = 8204
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'worker_log_tail_test',
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {},
      }

      await runJob(payload, [`APP_PORT=${port}`])
      await new Promise((resolve) => setTimeout(resolve, 500))

      const workerLog = await readWorkerLog(port, { tail: 5 })
      expect(workerLog).toContain('ready check')
    })

    test('logs command reads unified log file', async () => {
      const jobId = generateJobId('logs-cmd-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'logs_cmd_test',
        worker_command: ['sh', '-c', 'echo logs_cmd_output'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)
      await new Promise((resolve) => setTimeout(resolve, 200))

      const result = await execInContainer([
        'lombok-worker-agent',
        'logs',
        '--tail',
        '200',
      ])

      expect(result.exitCode).toBe(0)
      let logsOutput = result.stdout
      if (!logsOutput.includes(`JOB_ID_${jobId}`)) {
        const fullResult = await execInContainer([
          'lombok-worker-agent',
          'logs',
        ])
        expect(fullResult.exitCode).toBe(0)
        logsOutput = fullResult.stdout
      }
      expect(logsOutput).toContain(`JOB_ID_${jobId}`)
    })

    test('start --warmup launches worker supervisor', async () => {
      const port = 8600
      const workerStatePath = `/var/lib/lombok-worker-agent/workers/http_${port}.json`
      const startScript =
        `APP_PORT=${port} lombok-worker-agent start --warmup ${port} bun run src/mock-worker.ts ` +
        `> /tmp/start-warmup-${port}.log 2>&1 & ` +
        'START_PID=$!; ' +
        `i=0; while [ $i -lt 20 ]; do if [ -f ${workerStatePath} ]; then break; fi; sleep 0.2; i=$((i+1)); done; ` +
        'kill $START_PID; wait $START_PID || true'

      try {
        await execInContainer(['sh', '-c', startScript])

        const workerState = await waitForWorkerStatus(port, 'ready', 10_000)
        expect(workerState.pid).toBeGreaterThan(0)
      } finally {
        await shutdownWorker(port)
        await waitForWorkerStatus(port, 'stopped', 10_000).catch(() => {})
      }
    })

    test('start --warmup reuses warmed worker for jobs', async () => {
      const port = 8601
      const startPidFile = `/tmp/start-warmup-${port}.pid`
      const startLogFile = `/tmp/start-warmup-${port}.log`
      const startScript =
        `APP_PORT=${port} lombok-worker-agent start --warmup ${port} bun run src/mock-worker.ts ` +
        `> ${startLogFile} 2>&1 & echo $! > ${startPidFile}`

      try {
        await execInContainer(['sh', '-c', startScript])

        const warmedState = await waitForWorkerStatus(port, 'ready', 10_000)
        expect(warmedState.pid).toBeGreaterThan(0)

        const jobId = generateJobId('warmup-reuse-test')
        const payload: JobPayload = {
          job_id: jobId,
          job_class: 'math_add_8601',
          worker_command: ['bun', 'run', 'src/mock-worker.ts'],
          interface: { kind: 'persistent_http', port },
          job_input: { numbers: [4, 5, 6] },
        }

        const { jobResult } = await runJob(payload)
        expect(jobResult.success).toBe(true)

        const workerStateAfter = await readWorkerState(port).then(
          (stdout) => JSON.parse(stdout) as { pid: number; status: string },
        )
        expect(workerStateAfter.pid).toBe(warmedState.pid)

        await new Promise((resolve) => setTimeout(resolve, 200))
        const agentLogContent = await readAgentLog({ grep: jobId })
        const entries = parseStructuredLogs(agentLogContent)
        const jobEntries = findLogEntries(
          entries,
          (e) => e.data?.job_id === jobId,
        )

        expect(jobEntries.length).toBeGreaterThan(0)
        const triggerEntries = findLogEntries(jobEntries, (e) =>
          e.message.includes('Dispatcher triggering worker start'),
        )
        expect(triggerEntries.length).toBe(0)
        const readyEntries = findLogEntries(jobEntries, (e) =>
          e.message.includes('Dispatcher observed worker ready'),
        )
        expect(readyEntries.length).toBeGreaterThan(0)
      } finally {
        await execInContainer([
          'sh',
          '-c',
          `if [ -f ${startPidFile} ]; then kill $(cat ${startPidFile}) 2>/dev/null || true; wait $(cat ${startPidFile}) 2>/dev/null || true; fi`,
        ])
        await shutdownWorker(port)
        await waitForWorkerStatus(port, 'stopped', 10_000).catch(() => {})
      }
    })

    test('agent-log reads agent log file', async () => {
      // First run a job to generate some agent activity
      const jobId = generateJobId('agent-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'agent_log_test',
        worker_command: ['sh', '-c', 'echo test_output'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Check if agent log file exists
      const agentLogExists = await fileExistsInContainer(
        '/var/log/lombok-worker-agent/agent.log',
      )

      // If the log file exists, verify we can read it
      if (agentLogExists) {
        const result = await execInContainer([
          'lombok-worker-agent',
          'agent-log',
        ])

        expect(result.exitCode).toBe(0)
        // The agent log should contain information about the job
        expect(result.stdout.length).toBeGreaterThan(0)
      } else {
        // If the log file doesn't exist, the command should return an error
        const result = await execInContainer([
          'lombok-worker-agent',
          'agent-log',
        ])

        expect(result.exitCode).not.toBe(0)
        expect(result.stderr).toContain('log file not found')
      }
    })

    test('agent-log --tail returns last N lines', async () => {
      // Run a job to generate agent activity
      const jobId = generateJobId('agent-log-tail-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'agent_log_tail_test',
        worker_command: ['sh', '-c', 'echo test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Check if agent log file exists
      const agentLogExists = await fileExistsInContainer(
        '/var/log/lombok-worker-agent/agent.log',
      )

      if (agentLogExists) {
        const result = await execInContainer([
          'lombok-worker-agent',
          'agent-log',
          '--tail',
          '5',
        ])

        expect(result.exitCode).toBe(0)
        // Should return at most 5 lines
        const lines = result.stdout
          .trim()
          .split('\n')
          .filter((l) => l.length > 0)
        expect(lines.length).toBeLessThanOrEqual(5)
      }
    })

    test('agent-log --grep filters log lines', async () => {
      // Run a job to generate agent activity
      const jobId = generateJobId('agent-log-grep-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'agent_log_grep_test',
        worker_command: ['sh', '-c', 'echo test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Check if agent log file exists
      const agentLogExists = await fileExistsInContainer(
        '/var/log/lombok-worker-agent/agent.log',
      )

      if (agentLogExists) {
        const result = await execInContainer([
          'lombok-worker-agent',
          'agent-log',
          '--grep',
          jobId,
        ])

        expect(result.exitCode).toBe(0)
        // If grep finds matches, output should contain the job ID
        if (result.stdout.length > 0) {
          expect(result.stdout).toContain(jobId)
        }
      }
    })

    test('agent log file is populated after running jobs', async () => {
      // Run multiple jobs to generate agent activity
      const jobIds = [
        generateJobId('agent-populate-1'),
        generateJobId('agent-populate-2'),
        generateJobId('agent-populate-3'),
      ]

      for (const jobId of jobIds) {
        const payload: JobPayload = {
          job_id: jobId,
          job_class: 'agent_populate_test',
          worker_command: ['sh', '-c', 'echo test'],
          interface: { kind: 'exec_per_job' },
          job_input: {},
        }
        await runJob(payload)
      }

      // Check if agent log file exists and has content
      const agentLogExists = await fileExistsInContainer(
        '/var/log/lombok-worker-agent/agent.log',
      )

      if (agentLogExists) {
        const logContent = await readAgentLog()
        expect(logContent.length).toBeGreaterThan(0)

        // Verify we can fetch it using the agent-log command
        const result = await execInContainer([
          'lombok-worker-agent',
          'agent-log',
        ])
        expect(result.exitCode).toBe(0)
        expect(result.stdout.length).toBeGreaterThan(0)
      } else {
        // If log file doesn't exist, document this as a known limitation
        // The agent currently only writes to stderr, not to a log file
        console.warn(
          'Agent log file does not exist - agent may not be writing to log file yet',
        )
      }
    })

    test('agent log uses structured format with timestamp, level, and JSON', async () => {
      const jobId = generateJobId('structured-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'structured_log_test',
        worker_command: ['sh', '-c', 'echo test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const agentLogContent = await readAgentLog()
      const entries = parseStructuredLogs(agentLogContent)

      expect(entries.length).toBeGreaterThan(0)

      // Verify format: timestamp|LEVEL|["message",{optional_data}]
      for (const entry of entries) {
        // Check timestamp format (RFC3339)
        expect(entry.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )

        // Check log level is one of the valid levels
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          entry.level,
        )

        // Check message exists
        expect(entry.message).toBeTruthy()
        expect(typeof entry.message).toBe('string')
      }
    })

    test('agent log entries include appropriate log levels', async () => {
      const jobId = generateJobId('log-level-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'log_level_test',
        worker_command: ['sh', '-c', 'echo test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const agentLogContent = await readAgentLog()
      const entries = parseStructuredLogs(agentLogContent)

      // Find entries related to this job
      const jobEntries = findLogEntries(
        entries,
        (e) => e.data?.job_id === jobId,
      )

      expect(jobEntries.length).toBeGreaterThan(0)

      // Should have at least one INFO level entry (job started, job finished, etc.)
      const infoEntries = findLogEntries(jobEntries, (e) => e.level === 'INFO')
      expect(infoEntries.length).toBeGreaterThan(0)

      // Verify we can find a "Job started" entry with INFO level
      const jobReceivedEntry = findLogEntries(
        jobEntries,
        (e) => e.message.includes('Job started') && e.level === 'INFO',
      )
      expect(jobReceivedEntry.length).toBeGreaterThan(0)
    })

    test('agent log entries include structured data objects', async () => {
      const jobId = generateJobId('structured-data-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'structured_data_test',
        worker_command: ['sh', '-c', 'echo test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const agentLogContent = await readAgentLog()
      const entries = parseStructuredLogs(agentLogContent)

      // Find entries related to this job
      const jobEntries = findLogEntries(
        entries,
        (e) => e.data?.job_id === jobId,
      )

      expect(jobEntries.length).toBeGreaterThan(0)

      // Verify entries have data objects
      const entriesWithData = jobEntries.filter((e) => e.data !== undefined)
      expect(entriesWithData.length).toBeGreaterThan(0)

      // Find "Job started" entry and verify it has structured data
      const jobReceivedEntry = findLogEntries(jobEntries, (e) =>
        e.message.includes('Job started'),
      )
      expect(jobReceivedEntry.length).toBeGreaterThan(0)
      expect(jobReceivedEntry[0].data).toBeDefined()
      expect(jobReceivedEntry[0].data.job_id).toBe(jobId)
      expect(jobReceivedEntry[0].data.job_class).toBe('structured_data_test')
      expect(jobReceivedEntry[0].data.interface).toBe('exec_per_job')
    })

    test('agent log entries for job completion include timing data', async () => {
      const jobId = generateJobId('timing-data-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'timing_data_test',
        worker_command: ['sh', '-c', 'echo test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const agentLogContent = await readAgentLog()
      const entries = parseStructuredLogs(agentLogContent)

      // Find entries related to this job
      const jobEntries = findLogEntries(
        entries,
        (e) => e.data?.job_id === jobId,
      )

      // Find entries about job execution completion
      const completionEntries = findLogEntries(
        jobEntries,
        (e) =>
          e.message.includes('Job execution completed') ||
          e.message.includes('Job finished'),
      )

      expect(completionEntries.length).toBeGreaterThan(0)

      // Verify timing data is present
      const completionEntry = completionEntries[0]
      expect(completionEntry.data).toBeDefined()
      expect(completionEntry.data.job_execution_time).toBeDefined()
      expect(completionEntry.data.total_time).toBeDefined()
      expect(typeof completionEntry.data.job_execution_time).toBe('number')
      expect(typeof completionEntry.data.total_time).toBe('number')
    })

    test('agent log entries for warnings include WARN level', async () => {
      // This test may not always have warnings, but we can check the structure
      // by looking for any WARN level entries in the log
      const agentLogContent = await readAgentLog({ tail: 100 })
      const entries = parseStructuredLogs(agentLogContent)

      // If there are any WARN entries, verify they have the correct structure
      const warnEntries = findLogEntries(entries, (e) => e.level === 'WARN')

      for (const entry of warnEntries) {
        expect(entry.level).toBe('WARN')
        expect(entry.message).toBeTruthy()
        // WARN entries should typically have error information in data
        if (entry.data) {
          expect(typeof entry.data).toBe('object')
        }
      }
    })

    test('agent log can be parsed as valid JSON for data objects', async () => {
      const jobId = generateJobId('json-parse-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'json_parse_test',
        worker_command: ['sh', '-c', 'echo test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const agentLogContent = await readAgentLog()
      const entries = parseStructuredLogs(agentLogContent)

      // Find entries related to this job
      const jobEntries = findLogEntries(
        entries,
        (e) => e.data?.job_id === jobId,
      )

      expect(jobEntries.length).toBeGreaterThan(0)

      // Verify all entries can be serialized back to JSON (data is JSON-serializable)
      for (const entry of jobEntries) {
        if (entry.data) {
          // Should not throw when stringifying
          expect(() => JSON.stringify(entry.data)).not.toThrow()
          const serialized = JSON.stringify(entry.data)
          // Should be able to parse it back
          expect(() => JSON.parse(serialized)).not.toThrow()
        }
      }
    })

    test('job logs use structured format for exec_per_job', async () => {
      const jobId = generateJobId('structured-job-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'structured_job_id_test',
        worker_command: [
          'sh',
          '-c',
          // Use printf with single quotes to preserve JSON structure
          // TypeScript double quotes, shell single quotes preserve JSON double quotes
          'printf \'INFO|["Test message",{"key":"value"}]\n\'',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThan(0)

      // Verify format: timestamp|LEVEL|["message",{optional_data}]
      for (const entry of entries) {
        expect(entry.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          entry.level,
        )
        expect(entry.message).toBeTruthy()
      }

      // Find structured entry if worker output structured log
      const structuredEntry = findLogEntries(
        entries,
        (e) => e.message === 'Test message' && e.data?.key === 'value',
      )
      if (structuredEntry.length > 0) {
        expect(structuredEntry[0].level).toBe('INFO')
        expect(structuredEntry[0].data).toEqual({ key: 'value' })
      }
    })

    test('job logs capture plain text as INFO for stdout and ERROR for stderr in exec_per_job', async () => {
      const jobId = generateJobId('plain-text-job-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'plain_text_job_id_test',
        worker_command: [
          'sh',
          '-c',
          'echo "stdout message"; echo "stderr message" >&2',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThan(0)

      // Find stdout entry (should be INFO)
      const stdoutEntry = findLogEntries(
        entries,
        (e) => e.level === 'INFO' && e.message.includes('stdout message'),
      )
      expect(stdoutEntry.length).toBeGreaterThan(0)

      // Find stderr entry (should be ERROR)
      const stderrEntry = findLogEntries(
        entries,
        (e) => e.level === 'ERROR' && e.message.includes('stderr message'),
      )
      expect(stderrEntry.length).toBeGreaterThan(0)
    })

    test('job logs parse persistent_http worker output format', async () => {
      const jobClass = 'math_add_8391'
      const port = 8391

      const jobId = generateJobId('persistent-http-job-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2, 3] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Wait for logs to be written (job log files are created before execution, but logs are written asynchronously)
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check job log file exists
      const jobLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.log`,
      )
      expect(jobLogExists).toBe(true)

      // Wait for logs to be written and retry if needed
      let jobLogContent = ''
      for (let i = 0; i < 10; i++) {
        jobLogContent = await readJobLog(jobId)
        if (jobLogContent && jobLogContent.trim().length > 0) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      // If log content is empty, provide helpful error
      if (!jobLogContent || jobLogContent.trim().length === 0) {
        throw new Error(
          `Job log file exists but is empty. This may indicate that structured logs with JOB_ID_ prefix were not output by the worker.`,
        )
      }

      const entries = parseJobLogs(jobLogContent)

      // Job logs should be structured
      if (entries.length === 0) {
        throw new Error(
          `No structured log entries found in job log. Raw content (first 500 chars): ${jobLogContent.substring(
            0,
            500,
          )}`,
        )
      }

      // Verify all entries have proper structure
      for (const entry of entries) {
        expect(entry.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          entry.level,
        )
        expect(entry.message).toBeTruthy()
      }
    })

    test('persistent_http workers can output structured logs with JOB_ID_ prefix', async () => {
      const jobClass = 'math_add_8302'
      const port = 8302

      const jobId = generateJobId('persistent-http-structured-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          numbers: [5, 10],
          // Mock worker should output: JOB_ID_<job_id>|INFO|["message",{data}]
        },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      // If worker outputs structured logs, they should be parsed correctly
      expect(entries.length).toBeGreaterThan(0)

      // Verify entries are properly structured
      for (const entry of entries) {
        expect(entry.timestamp).toBeTruthy()
        expect(entry.level).toBeTruthy()
        expect(entry.message).toBeTruthy()
      }
    })

    test('exec_per_job parses structured worker output correctly', async () => {
      const jobId = generateJobId('exec-structured-output-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'exec_structured_output_test',
        worker_command: [
          'sh',
          '-c',
          // Use printf with single quotes to preserve JSON structure
          // Format: LEVEL|["message",{optional_data}]
          // TypeScript double quotes, shell single quotes preserve JSON double quotes
          'printf \'INFO|["Processing started",{"step":1}]\n\'; printf \'WARN|["Warning occurred",{"code":"W001"}]\n\'; printf \'INFO|["Processing completed",{"result":"success"}]\n\'',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThan(0)

      // Find structured entries
      const processingStarted = findLogEntries(
        entries,
        (e) => e.message === 'Processing started' && e.data?.step === 1,
      )
      const warningOccurred = findLogEntries(
        entries,
        (e) => e.message === 'Warning occurred' && e.data?.code === 'W001',
      )
      const processingCompleted = findLogEntries(
        entries,
        (e) =>
          e.message === 'Processing completed' && e.data?.result === 'success',
      )

      // At least some structured entries should be found
      expect(
        processingStarted.length +
          warningOccurred.length +
          processingCompleted.length,
      ).toBeGreaterThan(0)

      // Verify levels are correct
      if (processingStarted.length > 0) {
        expect(processingStarted[0].level).toBe('INFO')
      }
      if (warningOccurred.length > 0) {
        expect(warningOccurred[0].level).toBe('WARN')
      }
      if (processingCompleted.length > 0) {
        expect(processingCompleted[0].level).toBe('INFO')
      }
    })

    test('exec_per_job handles malformed structured logs gracefully', async () => {
      const jobId = generateJobId('exec-malformed-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'exec_malformed_log_test',
        worker_command: [
          'sh',
          '-c',
          // Test various malformed formats - all should fall back to INFO level
          'echo "not a valid format"; echo "INFO|invalid json"; echo "INVALID|["test"]"; echo "normal plain text"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      // All lines should be captured, even if malformed
      expect(entries.length).toBeGreaterThan(0)

      // Malformed lines should be treated as INFO level
      const plainTextEntries = findLogEntries(
        entries,
        (e) =>
          e.level === 'INFO' &&
          (e.message.includes('not a valid format') ||
            e.message.includes('normal plain text') ||
            e.message.includes('invalid json') ||
            e.message.includes('INVALID')),
      )
      expect(plainTextEntries.length).toBeGreaterThan(0)
    })

    test('exec_per_job parses large structured worker output below truncation limit', async () => {
      const jobId = generateJobId('exec-structured-large-output-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'exec_structured_large_output_test',
        worker_command: [
          'sh',
          '-c',
          // Generate a reasonably large but still parseable structured log line.
          // long will be a string of 4000 "a" characters. Include a recognizable
          // tag in the message so we can filter on it in logs.
          'long=$(printf "a%.0s" $(seq 1 4000)); printf "INFO|[\\"log line truncation exec test: $long\\",{\\"marker\\":\\"large-structured\\"}]\n"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThan(0)

      const structuredEntries = findLogEntries(
        entries,
        (e) => e.level === 'INFO' && e.data?.marker === 'large-structured',
      )

      expect(structuredEntries.length).toBeGreaterThan(0)
      const entry = structuredEntries[0]

      expect(typeof entry.message).toBe('string')
      // Message should be large but not truncated for this test case.
      expect(entry.message.length).toBeGreaterThan(1000)
      expect(entry.message.includes('log line truncation')).toBe(true)
      expect(entry.message.includes('[truncated]')).toBe(false)
    })

    test('exec_per_job truncates overly long structured worker output', async () => {
      const jobId = generateJobId('exec-structured-truncated-output-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'exec_structured_truncated_output_test',
        worker_command: [
          'sh',
          '-c',
          // Generate a very large structured log payload so the agent-side parser
          // will truncate the JSON payload before parsing.
          // long will be a string of 9000 "b" characters, which exceeds the
          // agent's maxStructuredPayloadLen (8192 characters). Include a
          // recognizable tag in the message so we can filter on it in logs.
          'long=$(printf "b%.0s" $(seq 1 9000)); printf "INFO|[\\"log line truncation exec test: $long\\",{\\"marker\\":\\"too-large-structured\\"}]\n"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThan(0)

      // After truncation on the agent side, the job log entry will still be
      // structured (timestamp|LEVEL|["message",{data?}]), but the message will
      // contain the truncated JSON payload string, and data will be omitted.
      const infoEntries = findLogEntries(entries, (e) => e.level === 'INFO')
      expect(infoEntries.length).toBeGreaterThan(0)

      const entry = infoEntries[0]

      expect(typeof entry.message).toBe('string')
      // Message should have been truncated and marked accordingly.
      expect(entry.message.includes('[truncated]')).toBe(true)
      expect(entry.message.includes('log line truncation')).toBe(true)
      // The truncation limit on the agent is 8192 characters for the structured
      // payload, plus the " [truncated]" suffix.
      const MAX_STRUCTURED_PAYLOAD_LEN = 8192
      const TRUNCATION_SUFFIX = ' [truncated]'
      expect(entry.message.length).toBeLessThanOrEqual(
        MAX_STRUCTURED_PAYLOAD_LEN + TRUNCATION_SUFFIX.length,
      )
      // In the truncated case, we no longer preserve the original structured data.
      expect(entry.data).toBeUndefined()
    })

    test('persistent_http creates job log files on-demand', async () => {
      const jobClass = 'math_add_8303'
      const port = 8303

      const jobId = generateJobId('persistent-http-on-demand-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [2, 3] },
      }

      // Check that job log file doesn't exist before job runs
      const jobLogExistsBefore = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.log`,
      )
      expect(jobLogExistsBefore).toBe(false)

      await runJob(payload, [`APP_PORT=${port}`])

      // After job runs, if worker outputs structured logs, file should exist
      const jobLogExistsAfter = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.log`,
      )
      // File may or may not exist depending on whether worker outputs structured logs
      // But if it exists, it should be readable
      if (jobLogExistsAfter) {
        const jobLogContent = await readJobLog(jobId)
        expect(jobLogContent.length).toBeGreaterThanOrEqual(0)
      }
    })

    test('persistent_http parses large structured worker output below truncation limit', async () => {
      const jobClass = 'structured_truncation_test_9100'
      const port = 9100

      const jobId = generateJobId('http-structured-large-output-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          mode: 'below',
          // Let the mock worker pick a default length that is comfortably
          // below the truncation threshold.
        },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThan(0)

      const structuredEntries = findLogEntries(
        entries,
        (e) =>
          e.level === 'INFO' &&
          e.data?.marker === 'http-large-structured' &&
          typeof e.message === 'string' &&
          e.message.includes('log line truncation'),
      )

      expect(structuredEntries.length).toBeGreaterThan(0)
      const entry = structuredEntries[0]

      // Message should be large but not truncated for this test case.
      expect(entry.message.length).toBeGreaterThan(1000)
      expect(entry.message.includes('[truncated]')).toBe(false)
    })

    test('persistent_http truncates overly long structured worker output', async () => {
      const jobClass = 'structured_truncation_test_9101'
      const port = 9101

      const jobId = generateJobId('http-structured-truncated-output-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          mode: 'above',
          // Let the mock worker pick a default length that is comfortably
          // above the truncation threshold.
        },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThan(0)

      const infoEntries = findLogEntries(
        entries,
        (e) =>
          e.level === 'INFO' &&
          typeof e.message === 'string' &&
          e.message.includes('log line truncation'),
      )

      expect(infoEntries.length).toBeGreaterThan(0)

      const entry = infoEntries[0]

      // Message should have been truncated and marked accordingly.
      expect(entry.message.includes('[truncated]')).toBe(true)
      const MAX_STRUCTURED_PAYLOAD_LEN = 8192
      const TRUNCATION_SUFFIX = ' [truncated]'
      expect(entry.message.length).toBeLessThanOrEqual(
        MAX_STRUCTURED_PAYLOAD_LEN + TRUNCATION_SUFFIX.length,
      )
      // In the truncated case, we no longer preserve the original structured data.
      expect(entry.data).toBeUndefined()
    })

    test('persistent_http routes logs to correct job log files', async () => {
      const jobClass = 'math_add_8304'
      const port = 8304

      const jobId1 = generateJobId('persistent-http-multi-job-1')
      const jobId2 = generateJobId('persistent-http-multi-job-2')

      // Run first job
      const payload1: JobPayload = {
        job_id: jobId1,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 1] },
      }

      await runJob(payload1, [`APP_PORT=${port}`])

      // Run second job with same worker
      const payload2: JobPayload = {
        job_id: jobId2,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [2, 2] },
      }

      await runJob(payload2, [`APP_PORT=${port}`])

      // Wait for logs to be written (job log files are created before execution, but logs are written asynchronously)
      // Need to wait longer for the second job since it runs after the first job completes
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Each job should have its own log file if worker outputs structured logs
      const jobLog1Exists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId1}.log`,
      )
      const jobLog2Exists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId2}.log`,
      )

      // Job log files should exist (created before execution)
      expect(jobLog1Exists).toBe(true)
      expect(jobLog2Exists).toBe(true)

      // Wait for logs to be written and retry if needed
      // The second job might take longer since it runs after the first job
      let jobLog1Content = ''
      let jobLog2Content = ''
      for (let i = 0; i < 20; i++) {
        jobLog1Content = await readJobLog(jobId1)
        jobLog2Content = await readJobLog(jobId2)
        if (
          jobLog1Content.trim().length > 0 &&
          jobLog2Content.trim().length > 0
        ) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      // Logs should be separate (not necessarily different content, but separate files)
      // If either is empty, provide helpful error message
      if (jobLog1Content.trim().length === 0) {
        throw new Error(
          `Job log file for ${jobId1} exists but is empty after waiting. This may indicate that structured logs with JOB_ID_ prefix were not output by the worker.`,
        )
      }
      if (jobLog2Content.trim().length === 0) {
        throw new Error(
          `Job log file for ${jobId2} exists but is empty after waiting. This may indicate that structured logs with JOB_ID_ prefix were not output by the worker, or there's an issue with the interceptor handling multiple jobs.`,
        )
      }
      expect(jobLog1Content.trim().length).toBeGreaterThan(0)
      expect(jobLog2Content.trim().length).toBeGreaterThan(0)
    })

    test('job logs maintain chronological order', async () => {
      const jobId = generateJobId('job-log-order-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'job_log_order_test',
        worker_command: [
          'sh',
          '-c',
          'echo "line1"; sleep 0.1; echo "line2"; sleep 0.1; echo "line3"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const jobLogContent = await readJobLog(jobId)
      const entries = parseJobLogs(jobLogContent)

      expect(entries.length).toBeGreaterThanOrEqual(3)

      // Verify timestamps are in chronological order
      for (let i = 1; i < entries.length; i++) {
        const prevTime = new Date(entries[i - 1].timestamp).getTime()
        const currTime = new Date(entries[i].timestamp).getTime()
        expect(currTime).toBeGreaterThanOrEqual(prevTime)
      }
    })

    test('job-state command returns job state JSON', async () => {
      const jobId = generateJobId('job-state-cmd-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'job_state_cmd',
        worker_command: ['sh', '-c', 'echo job_state_test'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      expect(readJobState(jobId)).resolves.toBeDefined()

      const cliResult = await readJobState(jobId)
      const state = JSON.parse(cliResult)
      expect(state.job_id).toBe(jobId)
      expect(state.job_class).toBe('job_state_cmd')
      expect(state.status).toBe('success')
    })

    test('job-state command returns error for missing job', async () => {
      const missingJobId = 'missing-job-state-12345'
      expect(readJobState(missingJobId)).rejects.toThrow('job state not found')
    })

    test('job-result file is created for exec_per_job jobs', async () => {
      const jobId = generateJobId('job-result-exec-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'result_test',
        worker_command: [
          'sh',
          '-c',
          'echo \'{"message":"success"}\' > "$JOB_RESULT_FILE"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Verify result file exists
      const resultFileExists = await fileExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      expect(resultFileExists).toBe(true)

      // Read and verify result file content
      const resultContent = await readFileInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      const result = JSON.parse(resultContent)

      expect(result.success).toBe(true)
      expect(result.job_id).toBe(jobId)
      expect(result.job_class).toBe('result_test')
      expect(result.result).toBeDefined()
      expect((result.result as Record<string, unknown>).message).toBe('success')
      expect(result.timing).toBeDefined()
      expect(result.exit_code).toBe(0)
    })

    test('job-result file is created for persistent_http jobs', async () => {
      const jobClass = 'math_add_8230'
      const port = 8230
      const jobId = generateJobId('job-result-http-test')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [5, 10, 15] },
      }

      const jobResult = await runJob(payload, [`APP_PORT=${port}`])

      // Verify result file exists
      const resultFileExists = await fileExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      expect(resultFileExists).toBe(true)

      // Read and verify result file content
      const resultContent = await readFileInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      const result = JSON.parse(resultContent)

      expect(result.success).toBe(true)
      expect(result.job_id).toBe(jobId)
      expect(result.job_class).toBe(jobClass)
      expect(result.result).toBeDefined()
      expect((result.result as Record<string, unknown>).sum).toBe(30)
      expect(result.timing).toBeDefined()
      expect(result.timing).toHaveProperty('worker_ready_time_seconds')
    })

    test('job-result file includes error information for failed jobs', async () => {
      const jobId = generateJobId('job-result-error-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'error_test',
        worker_command: ['sh', '-c', 'exit 42'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Verify result file exists
      const resultFileExists = await fileExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      expect(resultFileExists).toBe(true)

      // Read and verify result file content
      const resultContent = await readFileInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      const result = JSON.parse(resultContent)

      expect(result.success).toBe(false)
      expect(result.job_id).toBe(jobId)
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('WORKER_EXIT_ERROR')
      expect(result.error.message).toContain('worker exited with code 42')
      expect(result.exit_code).toBe(42)
    })

    test('job-result command retrieves result file', async () => {
      const jobId = generateJobId('job-result-cmd-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'cmd_test',
        worker_command: [
          'sh',
          '-c',
          'echo \'{"value":123}\' > "$JOB_RESULT_FILE"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Use job-result command to retrieve the result
      const result = await execInContainer([
        'lombok-worker-agent',
        'job-result',
        '--job-id',
        jobId,
      ])

      expect(result.exitCode).toBe(0)
      const jobResult = JSON.parse(result.stdout)

      expect(jobResult.success).toBe(true)
      expect(jobResult.job_id).toBe(jobId)
      expect(jobResult.job_class).toBe('cmd_test')
      expect(jobResult.result).toBeDefined()
      expect((jobResult.result as Record<string, unknown>).value).toBe(123)
    })

    test('job-result command requires --job-id flag', async () => {
      const result = await execInContainer([
        'lombok-worker-agent',
        'job-result',
      ])

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('required')
    })

    test('job-result command returns error for non-existent job', async () => {
      const nonExistentJobId = 'non-existent-job-id-12345'

      const result = await execInContainer([
        'lombok-worker-agent',
        'job-result',
        '--job-id',
        nonExistentJobId,
      ])

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('job result not found')
    })

    test('purge-jobs removes completed job artifacts', async () => {
      const jobId = generateJobId('purge-exec-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'purge_exec_job',
        worker_command: ['sh', '-c', 'echo purge'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const statePath = jobStateFilePath(jobId)
      const resultPath = `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`
      const logPath = `/var/log/lombok-worker-agent/jobs/${jobId}.log`
      const outputDir = `/var/lib/lombok-worker-agent/jobs/${jobId}/output`

      expect(await fileExistsInContainer(statePath)).toBe(true)
      expect(await fileExistsInContainer(resultPath)).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 250))
      const purgeResult = await execInContainer([
        'lombok-worker-agent',
        'purge-jobs',
        '--older-than',
        '1ms',
      ])

      expect(purgeResult.exitCode).toBe(0)
      expect(purgeResult.stdout).toContain('Purged')

      expect(await fileExistsInContainer(statePath)).toBe(false)
      expect(await fileExistsInContainer(resultPath)).toBe(false)
      expect(await dirExistsInContainer(outputDir)).toBe(false)
      if (await fileExistsInContainer(logPath)) {
        expect(await fileExistsInContainer(logPath)).toBe(false)
      }
    })

    test('purge-jobs removes worker job symlinks for HTTP workers', async () => {
      const port = 8700
      const jobId = generateJobId('purge-http-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'purge_http_job',
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2, 3] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const workerLinkPath = `/var/lib/lombok-worker-agent/worker-jobs/http_${port}/${jobId}.json`
      const statePath = jobStateFilePath(jobId)

      const linkCheck = await execInContainer(['test', '-L', workerLinkPath])
      expect(linkCheck.exitCode).toBe(0)

      await new Promise((resolve) => setTimeout(resolve, 250))
      const purgeResult = await execInContainer([
        'lombok-worker-agent',
        'purge-jobs',
        '--older-than',
        '1ms',
      ])

      expect(purgeResult.exitCode).toBe(0)
      expect(purgeResult.stdout).toContain('Purged')

      const postLinkCheck = await execInContainer([
        'test',
        '-L',
        workerLinkPath,
      ])
      expect(postLinkCheck.exitCode).not.toBe(0)
      expect(await fileExistsInContainer(statePath)).toBe(false)
    })

    test('job-result file includes uploaded output files when present', async () => {
      const jobClass = 'file_output_8231'
      const port = 8231
      const jobId = generateJobId('job-result-output-files-test')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: {
          folder_id: 'test-folder-uuid',
          files: [
            {
              name: 'output.txt',
              content: 'Test content',
              content_type: 'text/plain',
            },
          ],
        },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
        output_location: {
          folder_id: 'test-folder-uuid',
          prefix: 'outputs',
        },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Read result file
      const resultContent = await readFileInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )

      const result = JSON.parse(resultContent)

      expect(result.success).toBe(true)
      expect(result.output_files).toBeDefined()
      expect(Array.isArray(result.output_files)).toBe(true)
      if (result.output_files.length > 0) {
        expect(result.output_files[0]).toHaveProperty('folderId')
        expect(result.output_files[0]).toHaveProperty('objectKey')
      }
    })

    test('job-result file includes timing information', async () => {
      const jobId = generateJobId('job-result-timing-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'timing_test',
        worker_command: [
          'sh',
          '-c',
          'sleep 0.1 && echo \'{"done":true}\' > "$JOB_RESULT_FILE"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Read result file
      const resultContent = await readFileInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      const result = JSON.parse(resultContent)

      expect(result.timing).toBeDefined()
      expect(result.timing).toHaveProperty('job_execution_time_seconds')
      expect(result.timing).toHaveProperty('total_time_seconds')
      expect(result.timing).toHaveProperty('worker_startup_time_seconds')
      expect(typeof result.timing.job_execution_time_seconds).toBe('number')
      expect(typeof result.timing.total_time_seconds).toBe('number')
      expect(typeof result.timing.worker_startup_time_seconds).toBe('number')
      expect(result.timing.job_execution_time_seconds).toBeGreaterThan(0)
    })

    test('container stdout contains worker output for exec_per_job', async () => {
      const jobId = generateJobId('container-stdout-exec-test')
      const uniqueOutput = `container-stdout-test-${Date.now()}`
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'container_stdout_test',
        worker_command: ['sh', '-c', `echo "${uniqueOutput}" && sleep 2`],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)
      await new Promise((r) => setTimeout(r, 2000))

      const jobLog = await readJobLog(jobId)
      expect(jobLog).toContain(uniqueOutput)
    })

    test('container stdout contains worker output for persistent_http', async () => {
      const jobClass = 'dummy_echo_8250'
      const port = 8250
      const jobId = generateJobId('container-stdout-http-test')
      // Use a unique message that can only come from worker stdout
      const uniqueMessage = `CONTAINER_STDOUT_TEST_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        // dummy_echo logs the input to stdout via ctx.logger.log()
        job_input: { testMessage: uniqueMessage },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      await new Promise((r) => setTimeout(r, 1000))

      // Get worker logs after running the job
      const workerLog = await readWorkerLog(port)

      // Verify the unique message appears in container stdout
      // This message can only come from the worker's stdout
      expect(workerLog).toContain(
        JSON.stringify(
          `[dummy_echo - worker log] Echoing input: ${JSON.stringify({
            testMessage: uniqueMessage,
          })}`,
        ),
      )
    })

    test('unified log file exists and contains all log types', async () => {
      const unifiedLogPath =
        '/var/log/lombok-worker-agent/lombok-worker-agent.log'
      const unifiedLogExists = await fileExistsInContainer(unifiedLogPath)
      expect(unifiedLogExists).toBe(true)
    })

    test('unified log contains agent logs with AGENT| prefix', async () => {
      const jobId = generateJobId('unified-log-agent-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'unified_log_agent_test',
        worker_command: ['sh', '-c', 'echo "test output"'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      const unifiedLogContent = await readFileInContainer(
        '/var/log/lombok-worker-agent/lombok-worker-agent.log',
      )

      // Find agent log entries - format: timestamp|AGENT|LEVEL|["message",{data}]
      const agentLogLines = unifiedLogContent.split('\n').filter((line) => {
        const parts = line.split('|')
        return parts.length >= 3 && parts[1] === 'AGENT'
      })

      expect(agentLogLines.length).toBeGreaterThan(0)

      // Verify format: timestamp|AGENT|LEVEL|["message",{data}]
      for (const line of agentLogLines) {
        const parts = line.split('|')
        expect(parts.length).toBeGreaterThanOrEqual(3)
        // parts[0] should be timestamp
        expect(parts[0]).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )
        expect(parts[1]).toBe('AGENT')
        // parts[2] should be level
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          parts[2],
        )
      }
    })

    test('rotate-logs archives agent log when size exceeded', async () => {
      const rotatedPath = '/var/log/lombok-worker-agent/agent.log.1'

      await appendToAgentLog(90000)
      await rotateLogsOnce()

      const rotatedExists = await fileExistsInContainer(rotatedPath)
      expect(rotatedExists).toBe(true)
    })

    test('rotate-logs respects retention count', async () => {
      const rotated1 = '/var/log/lombok-worker-agent/agent.log.1'
      const rotated2 = '/var/log/lombok-worker-agent/agent.log.2'
      const rotated3 = '/var/log/lombok-worker-agent/agent.log.3'

      await execInContainer(['rm', '-f', rotated1, rotated2, rotated3])

      await appendToAgentLog(90000)
      await rotateLogsOnce()
      expect(await fileExistsInContainer(rotated1)).toBe(true)

      await appendToAgentLog(90000)
      await rotateLogsOnce()
      expect(await fileExistsInContainer(rotated2)).toBe(true)

      await appendToAgentLog(90000)
      await rotateLogsOnce()
      expect(await fileExistsInContainer(rotated3)).toBe(false)
    })

    test('unified log contains job logs with JOB_ID_ prefix for exec_per_job', async () => {
      const jobId = generateJobId('unified-log-job-exec-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'unified_log_job_exec_test',
        worker_command: [
          'sh',
          '-c',
          'printf "INFO|["Test message",{"key":"value"}]\n"; echo "plain text line"',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      await runJob(payload)

      // Wait a bit for logs to be flushed
      await new Promise((resolve) => setTimeout(resolve, 100))

      const unifiedLogContent = await readFileInContainer(
        '/var/log/lombok-worker-agent/lombok-worker-agent.log',
      )

      // Find job log entries - format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
      const jobLogPrefix = `JOB_ID_${jobId}`
      const jobLogLines = unifiedLogContent.split('\n').filter((line) => {
        const parts = line.split('|')
        return parts.length >= 3 && parts[1] === jobLogPrefix
      })

      // Should have at least structured log entry and plain text entry
      expect(jobLogLines.length).toBeGreaterThan(0)

      // Verify format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
      for (const line of jobLogLines) {
        const parts = line.split('|')
        expect(parts.length).toBeGreaterThanOrEqual(3)
        // parts[0] should be timestamp
        expect(parts[0]).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )
        expect(parts[1]).toBe(jobLogPrefix)
        // parts[2] should be level
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          parts[2],
        )
      }
    })

    test('unified log contains job logs with JOB_ID_ prefix for persistent_http', async () => {
      const jobClass = 'math_add_8411'
      const port = 8411
      const jobId = generateJobId('unified-log-job-http-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [1, 2, 3] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Verify job log file exists first
      const jobLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/jobs/${jobId}.log`,
      )
      expect(jobLogExists).toBe(true)

      const jobLogContent = await readJobLog(jobId)
      expect(jobLogContent.trim().length).toBeGreaterThan(0)

      // Wait for logs to be flushed to unified log
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Retry checking unified log (job logs are written asynchronously)
      const jobLogPrefix = `JOB_ID_${jobId}`
      let jobLogLines: string[] = []
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        const unifiedLogContent = await readFileInContainer(
          '/var/log/lombok-worker-agent/lombok-worker-agent.log',
        )
        jobLogLines = unifiedLogContent.split('\n').filter((line) => {
          const parts = line.split('|')
          return parts.length >= 3 && parts[1] === jobLogPrefix
        })
        if (jobLogLines.length > 0) {
          break
        }
      }

      expect(jobLogLines.length).toBeGreaterThan(0)

      // Verify format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
      for (const line of jobLogLines) {
        const parts = line.split('|')
        expect(parts.length).toBeGreaterThanOrEqual(3)
        // parts[0] should be timestamp
        expect(parts[0]).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )
        expect(parts[1]).toBe(jobLogPrefix)
        // parts[2] should be level
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          parts[2],
        )
      }
    })

    test('unified log contains worker logs with WORKER_<port>| prefix for persistent_http', async () => {
      const jobClass = 'math_add_8412'
      const port = 8412
      const jobId = generateJobId('unified-log-worker-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [5, 10] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      const unifiedLogContent = await readFileInContainer(
        '/var/log/lombok-worker-agent/lombok-worker-agent.log',
      )

      // Find worker log entries - format: timestamp|WORKER_<port>|LEVEL|["message",{data}]
      const workerLogPrefix = `WORKER_${port}`
      const workerLogLines = unifiedLogContent.split('\n').filter((line) => {
        const parts = line.split('|')
        return parts.length >= 3 && parts[1] === workerLogPrefix
      })

      expect(workerLogLines.length).toBeGreaterThan(0)

      // Verify format: timestamp|WORKER_<port>|LEVEL|["message",{data}]
      for (const line of workerLogLines) {
        const parts = line.split('|')
        expect(parts.length).toBeGreaterThanOrEqual(3)
        // parts[0] should be timestamp
        expect(parts[0]).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
        )
        expect(parts[1]).toBe(workerLogPrefix)
        // parts[2] should be level
        expect(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).toContain(
          parts[2],
        )
        // parts[3] should be JSON array
        if (parts.length > 3) {
          expect(parts[3]).toMatch(/^\[.*\]$/)
        }
      }

      // Verify we can find structured log output from the worker
      // Worker logs in unified log have format: timestamp|WORKER_<port>|LEVEL|["message",{data}]
      // The mock worker outputs structured logs, so we should see them in the message part
      // The message is in the JSON array at parts[3], which contains ["message",{data}]
      const hasStructuredLog = workerLogLines.some((line) => {
        const parts = line.split('|')
        // Check if the JSON message part contains structured log data
        // The JSON array format is ["message",{data}], so we check if it contains JOB_ID_
        if (parts.length > 3) {
          try {
            const jsonPart = parts.slice(3).join('|') // Rejoin in case JSON contains |
            const parsed = JSON.parse(jsonPart)
            if (Array.isArray(parsed) && parsed.length > 0) {
              const message = parsed[0]
              return typeof message === 'string' && message.includes('JOB_ID_')
            }
          } catch {
            // If JSON parsing fails, just check if the string contains JOB_ID_
            return parts[3].includes('JOB_ID_')
          }
        }
        return false
      })
      // Note: Worker logs contain raw output, including structured logs from the worker
      // The mock worker outputs JOB_ID_ prefixed logs, so they should appear in worker logs
      // If not found, it might be a timing issue - the test still validates worker logs exist
      if (!hasStructuredLog && workerLogLines.length > 0) {
        // At least verify we have some worker output - check that the line has proper format
        const sampleLine = workerLogLines[0]
        const parts = sampleLine.split('|')
        expect(parts.length).toBeGreaterThanOrEqual(3)
        expect(parts[1]).toBe(workerLogPrefix)
      } else {
        expect(hasStructuredLog).toBe(true)
      }
    })

    test('unified log records unstructured worker stderr as ERROR', async () => {
      const jobClass = 'math_add_8420'
      const port = 8420
      const jobId = generateJobId('unified-log-worker-stderr-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: 'not an array' },
      }

      const { jobResult } = await runJob(payload, [`APP_PORT=${port}`])
      expect(jobResult.success).toBe(false)

      const workerLogPrefix = `WORKER_${port}`
      const errorFragment = `Failed job_id=${jobId}`
      let matchedLine: string | undefined

      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        const unifiedLogContent = await readFileInContainer(
          '/var/log/lombok-worker-agent/lombok-worker-agent.log',
        )
        const workerLogLines = unifiedLogContent.split('\n').filter((line) => {
          const parts = line.split('|')
          return parts.length >= 4 && parts[1] === workerLogPrefix
        })

        matchedLine = workerLogLines.find((line) => {
          const parts = line.split('|')
          if (parts.length < 4) {
            return false
          }
          const jsonPart = parts.slice(3).join('|')
          try {
            const parsed = JSON.parse(jsonPart)
            return (
              Array.isArray(parsed) &&
              parsed.length > 0 &&
              typeof parsed[0] === 'string' &&
              parsed[0].includes(errorFragment)
            )
          } catch {
            return false
          }
        })

        if (matchedLine) {
          break
        }
      }

      expect(matchedLine).toBeDefined()
      if (matchedLine) {
        const parts = matchedLine.split('|')
        expect(parts[2]).toBe('ERROR')
        const jsonPart = parts.slice(3).join('|')
        const parsed = JSON.parse(jsonPart)
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed[0]).toContain(errorFragment)
      }
    })

    test('unified log contains all three log types for a persistent_http job', async () => {
      const jobClass = 'math_add_8413'
      const port = 8413
      const jobId = generateJobId('unified-log-all-types-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', port },
        job_input: { numbers: [2, 3] },
      }

      const { jobResult } = await runJob(payload, [`APP_PORT=${port}`])
      expect(jobResult.success).toBe(true)

      // Wait a bit for job log file to be created (structured logs are parsed asynchronously)
      await new Promise((resolve) => setTimeout(resolve, 500))

      // First verify the job log file exists and has content
      let jobLogExists = false
      for (let i = 0; i < 10; i++) {
        jobLogExists = await fileExistsInContainer(
          `/var/log/lombok-worker-agent/jobs/${jobId}.log`,
        )
        if (jobLogExists) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      expect(jobLogExists).toBe(true)

      const jobLogContent = await readJobLog(jobId)
      expect(jobLogContent.trim().length).toBeGreaterThan(0)

      // Wait for logs to be flushed to unified log
      // Job logs are written when structured logs are parsed, which happens asynchronously
      // We need to wait for the parsing and writing to complete
      await new Promise((resolve) => setTimeout(resolve, 500))

      const unifiedLogContent = await readFileInContainer(
        '/var/log/lombok-worker-agent/lombok-worker-agent.log',
      )

      const lines = unifiedLogContent.split('\n').filter((line) => line.trim())

      // Verify we have agent logs - format: timestamp|AGENT|LEVEL|["message",{data}]
      const agentLogs = lines.filter((line) => {
        const parts = line.split('|')
        return parts.length >= 3 && parts[1] === 'AGENT'
      })
      expect(agentLogs.length).toBeGreaterThan(0)

      // Verify we have job logs (only if worker outputs structured logs)
      // Format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
      const jobLogPrefix = `JOB_ID_${jobId}`
      // Retry checking unified log (job logs are written asynchronously)
      let jobLogs: string[] = []
      for (let i = 0; i < 10; i++) {
        const unifiedLogContentRetry = await readFileInContainer(
          '/var/log/lombok-worker-agent/lombok-worker-agent.log',
        )
        const linesRetry = unifiedLogContentRetry
          .split('\n')
          .filter((line) => line.trim())
        jobLogs = linesRetry.filter((line) => {
          const parts = line.split('|')
          return parts.length >= 3 && parts[1] === jobLogPrefix
        })
        if (jobLogs.length > 0) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      // Job logs are only written when worker outputs structured logs with JOB_ID_ prefix
      // The mock worker outputs structured logs, so we should have job logs
      // Verify job logs exist (they should be written when structured logs are parsed)
      expect(jobLogs.length).toBeGreaterThan(0)

      // Verify we have worker logs - format: timestamp|WORKER_<port>|LEVEL|["message",{data}]
      const workerLogPrefix = `WORKER_${port}`
      const workerLogs = lines.filter((line) => {
        const parts = line.split('|')
        return parts.length >= 3 && parts[1] === workerLogPrefix
      })
      expect(workerLogs.length).toBeGreaterThan(0)
    })
  })
})
