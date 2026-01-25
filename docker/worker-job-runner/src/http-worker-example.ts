#!/usr/bin/env bun

/**
 * Minimal HTTP Worker Example (persistent_http interface)
 *
 * This worker demonstrates the logging patterns required for HTTP workers:
 *
 * 1. Job-specific structured logs:
 *    - Format: JOB_ID_<job_id>|LEVEL|["message",{optional_data}]\n
 *    - Output to stdout (INFO, DEBUG, WARN) or stderr (ERROR, FATAL)
 *    - These logs are captured by the agent and written to per-job log files
 *    - Also appear in unified log with format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
 *
 * 2. Worker-level logs:
 *    - Plain console.log/console.error output
 *    - Captured by agent and written to unified log with format: timestamp|WORKER_<port>|LEVEL|["message",{data}]
 *
 * 3. Result output:
 *    - Return JSON result in the job status response (GET /job/{job_id})
 */

const PORT = Number.parseInt(process.env.APP_PORT ?? '9000', 10)

// Job state storage
const jobs = new Map<
  string,
  {
    status: 'pending' | 'running' | 'success' | 'failed'
    result?: unknown
    error?: { code: string; message: string }
  }
>()

// Helper to output structured job logs
// Format: JOB_ID_<job_id>|LEVEL|["message",{optional_data}]\n
function logJob(
  jobId: string,
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'FATAL',
  message: string,
  data?: unknown,
): void {
  const logArray = data
    ? JSON.stringify([message, data])
    : JSON.stringify([message])
  const logLine = `JOB_ID_${jobId}|${level}|${logArray}\n`

  // ERROR and FATAL go to stderr, others to stdout
  if (level === 'ERROR' || level === 'FATAL') {
    process.stderr.write(logLine)
  } else {
    process.stdout.write(logLine)
  }
}

// HTTP server
const _server = Bun.serve({
  port: PORT,
  fetch: async (request) => {
    const url = new URL(request.url)
    const pathname = url.pathname

    // GET /health/ready - readiness check
    if (request.method === 'GET' && pathname === '/health/ready') {
      return new Response(JSON.stringify({ ready: true }), {
        headers: { 'content-type': 'application/json' },
      })
    }

    // POST /job - submit job (async)
    if (request.method === 'POST' && pathname === '/job') {
      const body = (await request.json()) as {
        job_id: string
        job_class: string
        job_input: unknown
        job_log_out?: string
        job_log_err?: string
        job_output_dir?: string
      }

      const { job_id, job_input } = body

      // Store job state
      jobs.set(job_id, { status: 'pending' })

      // Log worker-level info (appears in unified log as WORKER_<port>)
      console.log(`[worker] Accepted job: ${job_id}`)

      // Execute job asynchronously
      ;(async () => {
        jobs.set(job_id, { status: 'running' })

        // Log job-specific info (appears in job log and unified log as JOB_ID_<job_id>)
        logJob(job_id, 'INFO', 'Job started', { job_class: body.job_class })

        try {
          // Simulate work
          await new Promise((resolve) => setTimeout(resolve, 100))

          // Example: process job_input
          const result = { processed: true, input: job_input }

          logJob(job_id, 'INFO', 'Job completed successfully', { result })
          jobs.set(job_id, { status: 'success', result })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logJob(job_id, 'ERROR', 'Job failed', { error: message })
          jobs.set(job_id, {
            status: 'failed',
            error: { code: 'JOB_EXECUTION_ERROR', message },
          })
        }
      })()

      // Return immediate acknowledgment
      return new Response(JSON.stringify({ accepted: true, job_id }), {
        headers: { 'content-type': 'application/json' },
      })
    }

    // GET /job/{job_id} - get job status
    if (request.method === 'GET' && pathname.startsWith('/job/')) {
      const jobId = pathname.slice(5) // Remove '/job/' prefix
      const job = jobs.get(jobId)

      if (!job) {
        return new Response(
          JSON.stringify({
            error: { code: 'JOB_NOT_FOUND', message: 'Job not found' },
          }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        )
      }

      const response: Record<string, unknown> = {
        job_id: jobId,
        status: job.status,
      }

      if (job.status === 'success' && job.result) {
        response.result = job.result
      }

      if (job.status === 'failed' && job.error) {
        response.error = job.error
      }

      return new Response(JSON.stringify(response), {
        headers: { 'content-type': 'application/json' },
      })
    }

    return new Response('Not found', { status: 404 })
  },
})

console.log(`HTTP worker listening on port ${_server.port}`)
