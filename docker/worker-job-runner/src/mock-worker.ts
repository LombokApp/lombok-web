import crypto from 'node:crypto'
import fs from 'node:fs'

const DEFAULT_PORT_INPUT = Number.parseInt(process.env.APP_PORT ?? '8080', 10)
const SERVER_PORT = Number.isNaN(DEFAULT_PORT_INPUT) ? 8080 : DEFAULT_PORT_INPUT

// =============================================================================
// Job State Management (Async Protocol)
// =============================================================================

interface JobState {
  jobId: string
  jobClass: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: unknown
  error?: { code: string; message: string }
  startedAt: string
  completedAt?: string
}

// Store for tracking job states
const jobStates = new Map<string, JobState>()

// Platform agent job request structure (for persistent_http mode)
interface AgentJobRequest {
  job_id: string
  job_class: string
  input: unknown
  job_log_out?: string
  job_log_err?: string
}

// =============================================================================
// Job Logging Utilities
// =============================================================================

interface JobLogger {
  log: (message: string) => void
  error: (message: string) => void
}

const createJobLogger = (jobLogOut?: string, jobLogErr?: string): JobLogger => {
  const timestamp = () => new Date().toISOString()

  return {
    log: (message: string) => {
      const line = `[${timestamp()}] ${message}\n`
      if (jobLogOut) {
        fs.appendFileSync(jobLogOut, line)
      }
    },
    error: (message: string) => {
      const line = `[${timestamp()}] ERROR: ${message}\n`
      if (jobLogErr) {
        fs.appendFileSync(jobLogErr, line)
      }
    },
  }
}

// =============================================================================
// Job Class Handlers
// =============================================================================

type JobHandler = (
  input: unknown,
  logger: JobLogger,
) => unknown | Promise<unknown>

// Math operations
interface MathAddInput {
  numbers: number[]
}

interface MathMultiplyInput {
  numbers: number[]
}

interface MathFactorialInput {
  n: number
}

interface MathFibonacciInput {
  n: number
}

interface MathPrimeCheckInput {
  n: number
}

// String operations
interface StringHashInput {
  text: string
  algorithm?: 'sha256' | 'sha512' | 'md5'
}

interface StringReverseInput {
  text: string
}

interface StringBase64Input {
  text: string
  operation: 'encode' | 'decode'
}

interface StringCountInput {
  text: string
  substring: string
}

// Array operations
interface ArraySortInput {
  items: number[] | string[]
  order?: 'asc' | 'desc'
}

interface ArrayStatsInput {
  numbers: number[]
}

// Validation helpers
const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isNumberArray = (val: unknown): val is number[] =>
  Array.isArray(val) && val.every((v) => typeof v === 'number')

const isStringArray = (val: unknown): val is string[] =>
  Array.isArray(val) && val.every((v) => typeof v === 'string')

// Math handlers
const handleMathAdd: JobHandler = (input, logger) => {
  if (!isObject(input) || !isNumberArray(input.numbers)) {
    throw new Error('Invalid input: expected { numbers: number[] }')
  }
  const { numbers } = input as unknown as MathAddInput
  logger.log(`Adding ${numbers.length} numbers: [${numbers.join(', ')}]`)
  const sum = numbers.reduce((acc, n) => acc + n, 0)
  logger.log(`Result: ${sum}`)
  return { sum, operands: numbers }
}

const handleMathMultiply: JobHandler = (input, logger) => {
  if (!isObject(input) || !isNumberArray(input.numbers)) {
    throw new Error('Invalid input: expected { numbers: number[] }')
  }
  const { numbers } = input as unknown as MathMultiplyInput
  logger.log(`Multiplying ${numbers.length} numbers: [${numbers.join(', ')}]`)
  const product = numbers.reduce((acc, n) => acc * n, 1)
  logger.log(`Result: ${product}`)
  return { product, operands: numbers }
}

const handleMathFactorial: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    typeof (input as unknown as MathFactorialInput).n !== 'number'
  ) {
    throw new Error('Invalid input: expected { n: number }')
  }
  const { n } = input as unknown as MathFactorialInput
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error('n must be a non-negative integer')
  }
  if (n > 170) {
    throw new Error('n must be <= 170 to avoid overflow')
  }
  logger.log(`Calculating factorial of ${n}`)
  let result = 1
  for (let i = 2; i <= n; i++) {
    result *= i
  }
  logger.log(`${n}! = ${result}`)
  return { factorial: result, n }
}

const handleMathFibonacci: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    typeof (input as unknown as MathFibonacciInput).n !== 'number'
  ) {
    throw new Error('Invalid input: expected { n: number }')
  }
  const { n } = input as unknown as MathFibonacciInput
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error('n must be a non-negative integer')
  }
  if (n > 78) {
    throw new Error('n must be <= 78 to avoid overflow')
  }
  logger.log(`Calculating Fibonacci(${n})`)
  if (n === 0) {
    logger.log(`Fibonacci(0) = 0`)
    return { fibonacci: 0, n }
  }
  if (n === 1) {
    logger.log(`Fibonacci(1) = 1`)
    return { fibonacci: 1, n }
  }
  let prev = 0
  let curr = 1
  for (let i = 2; i <= n; i++) {
    const next = prev + curr
    prev = curr
    curr = next
  }
  logger.log(`Fibonacci(${n}) = ${curr}`)
  return { fibonacci: curr, n }
}

const handleMathPrimeCheck: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    typeof (input as unknown as MathPrimeCheckInput).n !== 'number'
  ) {
    throw new Error('Invalid input: expected { n: number }')
  }
  const { n } = input as unknown as MathPrimeCheckInput
  logger.log(`Checking if ${n} is prime`)
  if (n < 2 || !Number.isInteger(n)) {
    logger.log(`${n} is not prime (must be integer >= 2)`)
    return { isPrime: false, n, reason: 'n must be an integer >= 2' }
  }
  if (n === 2) {
    logger.log(`${n} is prime`)
    return { isPrime: true, n }
  }
  if (n % 2 === 0) {
    logger.log(`${n} is not prime (divisible by 2)`)
    return { isPrime: false, n, factor: 2 }
  }
  const sqrt = Math.sqrt(n)
  for (let i = 3; i <= sqrt; i += 2) {
    if (n % i === 0) {
      logger.log(`${n} is not prime (divisible by ${i})`)
      return { isPrime: false, n, factor: i }
    }
  }
  logger.log(`${n} is prime`)
  return { isPrime: true, n }
}

// String handlers
const handleStringHash: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    typeof (input as unknown as StringHashInput).text !== 'string'
  ) {
    throw new Error('Invalid input: expected { text: string }')
  }
  const { text, algorithm = 'sha256' } = input as unknown as StringHashInput
  const validAlgorithms = ['sha256', 'sha512', 'md5']
  if (!validAlgorithms.includes(algorithm)) {
    throw new Error(
      `Invalid algorithm: must be one of ${validAlgorithms.join(', ')}`,
    )
  }
  logger.log(`Hashing ${text.length} characters with ${algorithm}`)
  const hash = crypto.createHash(algorithm).update(text).digest('hex')
  logger.log(`Hash: ${hash}`)
  return { hash, algorithm, inputLength: text.length }
}

const handleStringReverse: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    typeof (input as unknown as StringReverseInput).text !== 'string'
  ) {
    throw new Error('Invalid input: expected { text: string }')
  }
  const { text } = input as unknown as StringReverseInput
  logger.log(`Reversing string of length ${text.length}`)
  const reversed = text.split('').reverse().join('')
  logger.log(`Result: "${reversed}"`)
  return { reversed, original: text, length: text.length }
}

const handleStringBase64: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    typeof (input as unknown as StringBase64Input).text !== 'string'
  ) {
    throw new Error(
      'Invalid input: expected { text: string, operation: "encode" | "decode" }',
    )
  }
  const { text, operation } = input as unknown as StringBase64Input
  if (operation !== 'encode' && operation !== 'decode') {
    throw new Error('operation must be "encode" or "decode"')
  }
  logger.log(`Base64 ${operation} on ${text.length} characters`)
  if (operation === 'encode') {
    const encoded = Buffer.from(text).toString('base64')
    logger.log(`Encoded result: ${encoded}`)
    return { result: encoded, operation, inputLength: text.length }
  } else {
    const decoded = Buffer.from(text, 'base64').toString('utf-8')
    logger.log(`Decoded result: ${decoded}`)
    return { result: decoded, operation, inputLength: text.length }
  }
}

const handleStringCount: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    typeof (input as unknown as StringCountInput).text !== 'string' ||
    typeof (input as unknown as StringCountInput).substring !== 'string'
  ) {
    throw new Error(
      'Invalid input: expected { text: string, substring: string }',
    )
  }
  const { text, substring } = input as unknown as StringCountInput
  if (substring.length === 0) {
    throw new Error('substring cannot be empty')
  }
  logger.log(
    `Counting occurrences of "${substring}" in text of length ${text.length}`,
  )
  let count = 0
  let pos = 0
  while ((pos = text.indexOf(substring, pos)) !== -1) {
    count++
    pos += substring.length
  }
  logger.log(`Found ${count} occurrences`)
  return { count, substring, textLength: text.length }
}

// Array handlers
const handleArraySort: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    !Array.isArray((input as unknown as ArraySortInput).items)
  ) {
    throw new Error('Invalid input: expected { items: (number[] | string[]) }')
  }
  const { items, order = 'asc' } = input as unknown as ArraySortInput
  if (order !== 'asc' && order !== 'desc') {
    throw new Error('order must be "asc" or "desc"')
  }
  logger.log(`Sorting ${items.length} items in ${order}ending order`)
  const sorted = [...items].sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return order === 'asc' ? a - b : b - a
    }
    const strA = String(a)
    const strB = String(b)
    return order === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
  })
  logger.log(`Sorted: [${sorted.join(', ')}]`)
  return { sorted, order, itemCount: items.length }
}

const handleArrayStats: JobHandler = (input, logger) => {
  if (
    !isObject(input) ||
    !isNumberArray((input as unknown as ArrayStatsInput).numbers)
  ) {
    throw new Error('Invalid input: expected { numbers: number[] }')
  }
  const { numbers } = input as unknown as ArrayStatsInput
  if (numbers.length === 0) {
    throw new Error('numbers array cannot be empty')
  }
  logger.log(`Calculating statistics for ${numbers.length} numbers`)
  const sum = numbers.reduce((acc, n) => acc + n, 0)
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  const mean = sum / numbers.length
  const sorted = [...numbers].sort((a, b) => a - b)
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  logger.log(
    `sum=${sum}, min=${min}, max=${max}, mean=${mean}, median=${median}`,
  )
  return { sum, min, max, mean, median, count: numbers.length }
}

// Verbose logging job - demonstrates extensive logging including errors
interface VerboseLogInput {
  steps: number
  simulateWarning?: boolean
  simulateError?: boolean
  delayMs?: number // Optional delay between steps to simulate long-running job
}

const handleVerboseLog: JobHandler = async (input, logger) => {
  if (
    !isObject(input) ||
    typeof (input as unknown as VerboseLogInput).steps !== 'number'
  ) {
    throw new Error('Invalid input: expected { steps: number }')
  }
  const {
    steps,
    simulateWarning,
    simulateError,
    delayMs = 0,
  } = input as unknown as VerboseLogInput

  logger.log('=== Starting verbose logging job ===')
  logger.log(
    `Configuration: steps=${steps}, simulateWarning=${simulateWarning}, simulateError=${simulateError}, delayMs=${delayMs}`,
  )

  const results: string[] = []

  for (let i = 1; i <= steps; i++) {
    logger.log(`Step ${i}/${steps}: Processing...`)
    results.push(`step_${i}_complete`)

    if (simulateWarning && i === Math.floor(steps / 2)) {
      logger.error(`Warning at step ${i}: This is a simulated warning message`)
    }

    // Simulate work with optional delay
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  if (simulateError) {
    logger.error('Simulated error condition detected')
    logger.error('This demonstrates error logging to the job error log')
  }

  logger.log(`=== Completed ${steps} steps successfully ===`)
  logger.log(`Results: [${results.join(', ')}]`)

  return {
    stepsCompleted: steps,
    results,
    hadWarning: simulateWarning ?? false,
    hadError: simulateError ?? false,
  }
}

// Job class registry
const jobHandlers: Record<string, JobHandler> = {
  // Math operations
  math_add: handleMathAdd,
  math_multiply: handleMathMultiply,
  math_factorial: handleMathFactorial,
  math_fibonacci: handleMathFibonacci,
  math_prime_check: handleMathPrimeCheck,

  // String operations
  string_hash: handleStringHash,
  string_reverse: handleStringReverse,
  string_base64: handleStringBase64,
  string_count: handleStringCount,

  // Array operations
  array_sort: handleArraySort,
  array_stats: handleArrayStats,

  // Logging demonstration
  verbose_log: handleVerboseLog,
}

// =============================================================================
// Async Job Execution
// =============================================================================

const executeJobAsync = async (
  jobId: string,
  jobClass: string,
  input: unknown,
  logger: JobLogger,
): Promise<void> => {
  const jobState = jobStates.get(jobId)
  if (!jobState) {
    return
  }

  // Update status to running
  jobState.status = 'running'

  const handler = jobHandlers[jobClass]
  if (!handler) {
    jobState.status = 'failed'
    jobState.error = {
      code: 'UNKNOWN_JOB_CLASS',
      message: `Unknown job class: ${jobClass}. Supported: ${Object.keys(
        jobHandlers,
      ).join(', ')}`,
    }
    jobState.completedAt = new Date().toISOString()
    logger.error(`Unknown job class: ${jobClass}`)
    return
  }

  try {
    const result = await handler(input, logger)
    jobState.status = 'completed'
    jobState.result = result
    jobState.completedAt = new Date().toISOString()
    logger.log(`Job completed successfully`)
    // eslint-disable-next-line no-console
    console.log(`[job] Completed job_id=${jobId} job_class=${jobClass}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    jobState.status = 'failed'
    jobState.error = {
      code: 'JOB_EXECUTION_ERROR',
      message,
    }
    jobState.completedAt = new Date().toISOString()
    logger.error(`Job failed: ${message}`)
    // eslint-disable-next-line no-console
    console.error(
      `[job] Failed job_id=${jobId} job_class=${jobClass}: ${message}`,
    )
  }
}

// =============================================================================
// Server
// =============================================================================

const jsonResponse = (body: unknown, init?: ResponseInit): Response => {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
    },
    ...init,
  })
}

const server = Bun.serve({
  port: SERVER_PORT,
  fetch: async (request) => {
    const url = new URL(request.url)
    const pathname = url.pathname

    // GET /job - readiness check
    if (request.method === 'GET' && pathname === '/job') {
      return jsonResponse({
        status: 'ready',
        worker: 'mock-worker',
        protocol: 'async',
        supportedJobClasses: Object.keys(jobHandlers),
      })
    }

    // POST /job - submit job (async protocol: returns immediately)
    if (request.method === 'POST' && pathname === '/job') {
      let body: AgentJobRequest | undefined
      try {
        body = (await request.json()) as AgentJobRequest
      } catch {
        return jsonResponse(
          {
            accepted: false,
            error: { code: 'INVALID_JSON', message: 'Invalid JSON body' },
          },
          { status: 400 },
        )
      }

      if (!body?.job_id) {
        return jsonResponse(
          {
            accepted: false,
            error: { code: 'MISSING_JOB_ID', message: 'job_id is required' },
          },
          { status: 400 },
        )
      }

      const jobId = body.job_id
      const jobClass = body.job_class

      // Check if job already exists
      if (jobStates.has(jobId)) {
        return jsonResponse(
          {
            accepted: false,
            job_id: jobId,
            error: {
              code: 'DUPLICATE_JOB_ID',
              message: 'Job ID already exists',
            },
          },
          { status: 409 },
        )
      }

      // Create job logger for this job
      const logger = createJobLogger(body.job_log_out, body.job_log_err)

      // Create initial job state
      const jobState: JobState = {
        jobId,
        jobClass,
        status: 'pending',
        startedAt: new Date().toISOString(),
      }
      jobStates.set(jobId, jobState)

      // eslint-disable-next-line no-console
      console.log(`[job] Accepted job_id=${jobId} job_class=${jobClass}`)
      logger.log(`Job accepted: job_id=${jobId} job_class=${jobClass}`)

      // Execute job asynchronously (don't await - return immediately)
      executeJobAsync(jobId, jobClass, body.input, logger)

      // Return immediate acknowledgment
      return jsonResponse({
        accepted: true,
        job_id: jobId,
      })
    }

    // GET /job/:id - get job status (for polling)
    if (request.method === 'GET' && pathname.startsWith('/job/')) {
      const jobId = pathname.slice(5) // Remove '/job/' prefix
      if (!jobId) {
        return jsonResponse(
          { error: { code: 'MISSING_JOB_ID', message: 'Job ID required' } },
          { status: 400 },
        )
      }

      const jobState = jobStates.get(jobId)
      if (!jobState) {
        return jsonResponse(
          { error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } },
          { status: 404 },
        )
      }

      // Build response based on job status
      const response: Record<string, unknown> = {
        job_id: jobState.jobId,
        job_class: jobState.jobClass,
        status: jobState.status,
      }

      if (jobState.status === 'completed' && jobState.result !== undefined) {
        response.result = jobState.result
      }

      if (jobState.status === 'failed' && jobState.error) {
        response.error = jobState.error
      }

      return jsonResponse(response)
    }

    if (request.method === 'GET' && pathname === '/health') {
      const states = Array.from(jobStates.values())
      return jsonResponse({
        status: 'ok',
        protocol: 'async',
        supportedJobClasses: Object.keys(jobHandlers),
        jobs: {
          total: states.length,
          pending: states.filter((j) => j.status === 'pending').length,
          running: states.filter((j) => j.status === 'running').length,
          completed: states.filter((j) => j.status === 'completed').length,
          failed: states.filter((j) => j.status === 'failed').length,
        },
        uptimeSeconds: Math.round(process.uptime()),
      })
    }

    if (request.method === 'GET' && pathname === '/job-classes') {
      return jsonResponse({
        jobClasses: Object.keys(jobHandlers),
        descriptions: {
          math_add: 'Add an array of numbers',
          math_multiply: 'Multiply an array of numbers',
          math_factorial: 'Calculate factorial of n',
          math_fibonacci: 'Calculate nth Fibonacci number',
          math_prime_check: 'Check if n is prime',
          string_hash: 'Hash a string (sha256, sha512, md5)',
          string_reverse: 'Reverse a string',
          string_base64: 'Encode or decode base64',
          string_count: 'Count occurrences of substring',
          array_sort: 'Sort an array of numbers or strings',
          array_stats: 'Calculate statistics on an array of numbers',
          verbose_log: 'Demonstrate verbose job logging (stdout and stderr)',
        },
      })
    }

    if (request.method === 'GET' && pathname === '/jobs') {
      return jsonResponse({
        jobs: Array.from(jobStates.values()).sort((a, b) =>
          a.startedAt.localeCompare(b.startedAt),
        ),
      })
    }

    if (request.method === 'DELETE' && pathname === '/jobs') {
      jobStates.clear()
      return jsonResponse({ message: 'All jobs cleared' })
    }

    return jsonResponse({ error: 'Not found' }, { status: 404 })
  },
})

// eslint-disable-next-line no-console
console.log(
  `Mock runner listening on port ${server.port} with ${
    Object.keys(jobHandlers).length
  } job classes (async protocol)`,
)
