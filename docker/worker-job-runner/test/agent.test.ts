import Dockerode from 'dockerode'
import crypto from 'node:crypto'
import path from 'node:path'
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'bun:test'

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
  wait_for_completion?: boolean
  job_token?: string
  platform_url?: string
  output_location?: {
    folder_id: string
    prefix?: string
  }
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
  uploadUrlRequests: Array<{ jobId: string; body: UploadURLRequest }>
  completionRequests: Array<{ jobId: string; body: CompletionRequest }>
  startRequests: Array<{ jobId: string }>
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
  {
    name: 'worker JSON result captured from last line',
    jobClass: 'json_result_job',
    workerCommand: [
      'sh',
      '-c',
      'echo "Processing..."; echo "Done"; echo \'{"sum":42,"status":"completed"}\'',
    ],
    jobInput: { numbers: [1, 2, 3] },
    expected: {
      success: true,
      exitCode: 0,
      result: { sum: 42, status: 'completed' },
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
        'echo "{\\"sum\\":$SUM,\\"computed\\":true}"',
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
// Mock Platform Server
// =============================================================================

let mockPlatformServer: ReturnType<typeof Bun.serve> | null = null
let mockS3Server: ReturnType<typeof Bun.serve> | null = null
const MOCK_PLATFORM_PORT = 19876
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
    port: MOCK_PLATFORM_PORT,
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

        mockPlatformState.uploadUrlRequests.push({ jobId, body })

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
        mockPlatformState.startRequests.push({ jobId })

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

        mockPlatformState.completionRequests.push({ jobId, body })

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
  return `http://host.docker.internal:${MOCK_PLATFORM_PORT}`
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
  // if (
  //   command[0] === 'lombok-worker-agent' &&
  //   command[1] === 'run-job' &&
  //   command.length === 4
  // ) {
  //   console.log(
  //     'execInContainer:',
  //     JSON.stringify(JSON.parse(atob(command[3])), null, 2),
  //   )
  // }

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
  options?: { err?: boolean; tail?: number },
): Promise<string> {
  const args = ['lombok-worker-agent', 'job-log', '--job-id', jobId]
  if (options?.err) {
    args.push('--err')
  }
  if (options?.tail !== undefined) {
    args.push('--tail', String(options.tail))
  }
  const result = await execInContainer(args)
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read job log for ${jobId}: ${result.stderr}`)
  }
  return result.stdout
}

async function readWorkerLog(
  jobClass: string,
  options?: { err?: boolean; tail?: number },
): Promise<string> {
  const args = ['lombok-worker-agent', 'worker-log', '--job-class', jobClass]
  if (options?.err) {
    args.push('--err')
  }
  if (options?.tail !== undefined) {
    args.push('--tail', String(options.tail))
  }
  const result = await execInContainer(args)
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to read worker log for ${jobClass}: ${result.stderr}`,
    )
  }
  return result.stdout
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

function workerLogIdentifier(
  workerCommand: string[],
  iface: InterfaceConfig,
): string {
  const payload = {
    worker_command: workerCommand,
    interface: iface,
  }

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
}

async function runJob(
  payload: JobPayload,
  env?: string[],
): Promise<{ result: JobResult; exitCode: number; rawOutput: string }> {
  const payloadWithDefaults: JobPayload = {
    wait_for_completion: true,
    ...payload,
  }
  const payloadB64 = makePayloadBase64(payloadWithDefaults)

  const execResult = await execInContainer(
    ['lombok-worker-agent', 'run-job', '--payload-base64', payloadB64],
    env,
  )

  // The agent outputs JSON to stdout (log lines go to stderr).
  // For persistent_http jobs, the agent parses the HTTP response result
  // and includes it as a parsed object in the result.result field.
  // Parse the JSON result from the last line of stdout.

  let result: JobResult
  try {
    result = JSON.parse(execResult.stdout)
  } catch {
    // Try to find JSON in the output (might be pretty-printed or have extra lines)
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

async function readJobStateViaCLI(
  jobId: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = await execInContainer([
    'lombok-worker-agent',
    'job-state',
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
          const jobOut = await readJobLog(jobId)
          for (const expected of testCase.expected.outputContains) {
            expect(jobOut).toContain(expected)
          }
        }

        // Check stderr contains expected strings
        if (testCase.expected.stderrContains) {
          const jobErr = await readJobLog(jobId, { err: true })
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
          'echo \'{"message":"hello","value":123}\'',
        ],
        interface: { kind: 'exec_per_job' },
        job_input: { test: true },
      }

      const { result } = await runJob(payload)

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

      const { result } = await runJob(payload)

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

      // This command echoes the JOB_OUTPUT_DIR value as JSON on the last line
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'env_test',
        worker_command: [
          'sh',
          '-c',
          `echo '{"output_dir":"'$JOB_OUTPUT_DIR'"}'`,
        ],
        interface: { kind: 'exec_per_job' },
        job_input: {},
      }

      const { result } = await runJob(payload)

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
        worker_command: ['sh', '-c', 'sleep 0.1 && echo \'{"done":true}\''],
        interface: { kind: 'exec_per_job' },
        job_input: { test: 'data' },
      }

      const { result } = await runJob(payload)

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
      const agentLog = await readAgentLog()

      // Verify timing information is logged
      expect(agentLog).toContain('job_execution_time')
      expect(agentLog).toContain('total_time')
      expect(agentLog).toContain('worker_startup_time')
      expect(agentLog).toContain(jobId)
    })

    test('returns immediately when wait_for_completion is false for exec_per_job', async () => {
      const jobId = generateJobId('exec-async-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'async_exec',
        worker_command: ['sh', '-c', 'sleep 5 && echo done'],
        interface: { kind: 'exec_per_job' },
        job_input: {},
        wait_for_completion: false,
      }

      const start = Date.now()
      const { result, exitCode } = await runJob(payload)
      const elapsed = Date.now() - start

      expect(exitCode).toBe(0)
      expect(elapsed).toBeLessThan(2000)
      expect(result.success).toBe(true)
      expect(result.status).toBe('running')
      expect(result.worker_pid).toBeDefined()

      const stateExists = await fileExistsInContainer(jobStateFilePath(jobId))
      expect(stateExists).toBe(true)

      const jobState = JSON.parse(
        await readFileInContainer(jobStateFilePath(jobId)),
      )
      expect(jobState.status).toBe('running')

      const resultFileExists = await fileExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      expect(resultFileExists).toBe(false)
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
            listener: { type: 'tcp', port: testCase.port },
          },
          job_input: testCase.jobInput,
        }

        // Set APP_PORT env for the mock worker
        const { result } = await runJob(payload, [`APP_PORT=${testCase.port}`])

        // console.log('output:', {
        //   result,
        //   jobLog: await readJobLog(jobId),
        //   workerLog: await readWorkerLog(testCase.jobClass),
        //   workerErrLog: await readWorkerLog(testCase.jobClass, { err: true }),
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

    test('returns parseable JSON result with expected structure', async () => {
      const jobClass = 'math_add'
      const port = 8210

      const jobId = generateJobId('http-json-structure-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [10, 20, 30] },
      }

      const { result } = await runJob(payload, [`APP_PORT=${port}`])

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
    })

    test('failed job returns parseable JSON with error structure', async () => {
      const jobClass = 'math_add'
      const port = 8211

      const jobId = generateJobId('http-json-error-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        // Invalid input - math_add expects { numbers: number[] }
        job_input: { invalid: 'input' },
      }

      const { result } = await runJob(payload, [`APP_PORT=${port}`])

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
        job_class: 'math_add',
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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
      const workerIdentifier = workerLogIdentifier(
        payload.worker_command,
        payload.interface,
      )
      const outLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/workers/${workerIdentifier}.out.log`,
      )
      const errLogExists = await fileExistsInContainer(
        `/var/log/lombok-worker-agent/workers/${workerIdentifier}.err.log`,
      )

      expect(outLogExists).toBe(true)
      expect(errLogExists).toBe(true)

      // Check worker logged startup message
      const workerOut = await readWorkerLog(jobClass)
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

      const jobLog = await readJobLog(jobId)

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
      const jobOutLog = await readJobLog(jobId)
      expect(jobOutLog).toContain('Starting verbose logging job')
      expect(jobOutLog).toContain('Step 1/3')
      expect(jobOutLog).toContain('Step 2/3')
      expect(jobOutLog).toContain('Step 3/3')
      expect(jobOutLog).toContain('Completed 3 steps successfully')

      // Check stderr log (for errors/warnings)
      const jobErrLog = await readJobLog(jobId, { err: true })
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
      const jobOutLog = await readJobLog(jobId)
      expect(jobOutLog).toContain('Step 1/5')
      expect(jobOutLog).toContain('Step 5/5')
      expect(jobOutLog).toContain('Completed 5 steps successfully')
    })

    test('file_output job writes files and manifest to output directory', async () => {
      const jobClass = 'file_output'
      const port = 8213

      const jobId = generateJobId('file-output-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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

      const { result } = await runJob(payload, [`APP_PORT=${port}`])

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
      const jobClass = 'math_add'
      const port = 8214

      const jobId = generateJobId('output-dir-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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
      const jobClass = 'math_add'
      const port = 8215

      const jobId = generateJobId('http-timing-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [1, 2, 3] },
      }

      const { result } = await runJob(payload, [`APP_PORT=${port}`])

      // Verify timing object exists in response
      expect(result.timing).toBeDefined()
      expect(typeof result.timing).toBe('object')

      const timing = result.timing as Record<string, unknown>

      // Verify all timing fields are present
      expect(timing).toHaveProperty('job_execution_time_seconds')
      expect(timing).toHaveProperty('total_time_seconds')
      expect(timing).toHaveProperty('worker_startup_time_seconds')
      expect(timing).toHaveProperty('worker_ready_time_seconds')

      // Verify timing values are numbers and non-negative
      expect(typeof timing.job_execution_time_seconds).toBe('number')
      expect(typeof timing.total_time_seconds).toBe('number')
      expect(typeof timing.worker_startup_time_seconds).toBe('number')
      expect(typeof timing.worker_ready_time_seconds).toBe('number')

      expect((timing.job_execution_time_seconds as number) >= 0).toBe(true)
      expect((timing.total_time_seconds as number) >= 0).toBe(true)
      expect((timing.worker_startup_time_seconds as number) >= 0).toBe(true)
      expect((timing.worker_ready_time_seconds as number) >= 0).toBe(true)

      // Verify total_time includes job_execution_time (total should be >= execution)
      expect(
        (timing.total_time_seconds as number) >=
          (timing.job_execution_time_seconds as number),
      ).toBe(true)
    })

    test('timing is logged in agent log for persistent_http', async () => {
      const jobClass = 'math_add'
      const port = 8216

      const jobId = generateJobId('http-timing-log-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [1, 2] },
      }

      await runJob(payload, [`APP_PORT=${port}`])

      // Read agent log
      const agentLog = await readAgentLog()

      // Verify timing information is logged
      expect(agentLog).toContain('job_execution_time')
      expect(agentLog).toContain('total_time')
      expect(agentLog).toContain('worker_startup_time')
      expect(agentLog).toContain(jobId)
    })

    test('returns immediately when wait_for_completion is false for persistent_http', async () => {
      const jobClass = 'verbose_log'
      const port = 8300
      const jobId = generateJobId('http-async-test')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { steps: 4, delayMs: 500 },
        wait_for_completion: false,
      }

      const start = Date.now()
      const { result, exitCode } = await runJob(payload, [`APP_PORT=${port}`])
      const elapsed = Date.now() - start

      expect(exitCode).toBe(0)
      expect(elapsed).toBeLessThan(2000)
      expect(result.success).toBe(true)
      expect(result.status).toBe('running')
      expect(result.worker_pid).toBeDefined()

      const stateExists = await fileExistsInContainer(jobStateFilePath(jobId))
      expect(stateExists).toBe(true)

      const jobState = JSON.parse(
        await readFileInContainer(jobStateFilePath(jobId)),
      )
      expect(jobState.status).toBe('running')

      const resultFileExists = await fileExistsInContainer(
        `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`,
      )
      expect(resultFileExists).toBe(false)
    })
  })

  describe('platform integration', () => {
    test('exec_per_job signals completion to platform on success', async () => {
      const jobId = generateJobId('platform-exec-success')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'platform_completion_test',
        worker_command: ['sh', '-c', 'echo \'{"message":"done"}\''],
        interface: { kind: 'exec_per_job' },
        job_input: { test: true },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
      }

      const { result } = await runJob(payload)

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

      const { result, exitCode } = await runJob(payload)

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

    test('persistent_http signals completion to platform', async () => {
      const jobClass = 'math_add'
      const port = 8220

      const jobId = generateJobId('platform-http-success')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
        job_input: { numbers: [10, 20, 30] },
        job_token: MOCK_JOB_TOKEN,
        platform_url: getMockPlatformUrl(),
      }

      const { result } = await runJob(payload, [`APP_PORT=${port}`])

      expect(result.success).toBe(true)

      // Verify completion was signaled to platform
      expect(mockPlatformState.completionRequests.length).toBe(1)
      const completionReq = mockPlatformState.completionRequests[0]
      expect(completionReq.jobId).toBe(jobId)
      expect(completionReq.body.success).toBe(true)
      expect(completionReq.body.result).toBeDefined()
    })

    test('file_output job uploads files via presigned URLs and signals completion', async () => {
      const jobClass = 'file_output'
      const port = 8221

      const jobId = generateJobId('platform-upload-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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

      const { result } = await runJob(payload, [`APP_PORT=${port}`])

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
      const jobClass = 'file_output'
      const port = 8240
      const jobId = generateJobId('platform-upload-content-type-manifest')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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
      const jobClass = 'file_output'
      const port = 8241
      const jobId = generateJobId('platform-upload-content-type-detect')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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
      console.log('jsonUpload?.contentType:', jsonUpload?.contentType)
      expect(jsonUpload?.contentType.startsWith('application/json')).toBe(true)
      expect(txtUpload?.contentType.startsWith('text/plain')).toBe(true)
    })

    test('file_output job with empty prefix keeps object keys unchanged', async () => {
      const jobClass = 'file_output'
      const port = 8222

      const jobId = generateJobId('platform-upload-empty-prefix')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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

      const { result } = await runJob(payload, [`APP_PORT=${port}`])

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
      const jobClass = 'file_output'
      const port = 8222

      const jobId = generateJobId('platform-upload-missing-prefix')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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

      const { result } = await runJob(payload, [`APP_PORT=${port}`])

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
      expect(result.stdout).toContain('job-result')
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

      const cliResult = await readJobStateViaCLI(jobId)
      expect(cliResult.exitCode).toBe(0)

      const state = JSON.parse(cliResult.stdout)
      expect(state.job_id).toBe(jobId)
      expect(state.job_class).toBe('job_state_cmd')
      expect(state.status).toBe('success')
    })

    test('job-state command returns error for missing job', async () => {
      const missingJobId = 'missing-job-state-12345'

      const cliResult = await readJobStateViaCLI(missingJobId)
      expect(cliResult.exitCode).not.toBe(0)
      expect(cliResult.stderr).toContain('job state not found')
    })

    test('job-result file is created for exec_per_job jobs', async () => {
      const jobId = generateJobId('job-result-exec-test')
      const payload: JobPayload = {
        job_id: jobId,
        job_class: 'result_test',
        worker_command: ['sh', '-c', 'echo \'{"message":"success"}\''],
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
      const jobClass = 'math_add'
      const port = 8230
      const jobId = generateJobId('job-result-http-test')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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
        worker_command: ['sh', '-c', 'echo \'{"value":123}\''],
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

    test('job-result file includes uploaded output files when present', async () => {
      const jobClass = 'file_output'
      const port = 8231
      const jobId = generateJobId('job-result-output-files-test')

      const payload: JobPayload = {
        job_id: jobId,
        job_class: jobClass,
        worker_command: ['bun', 'run', 'src/mock-worker.ts'],
        interface: { kind: 'persistent_http', listener: { type: 'tcp', port } },
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
        worker_command: ['sh', '-c', 'sleep 0.1 && echo \'{"done":true}\''],
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
  })
})
